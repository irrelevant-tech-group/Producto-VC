document.addEventListener('DOMContentLoaded', async () => {
    // Inicializar la API de Dropbox
    const dropboxApi = new DropboxAPI();
    
    // Elementos del DOM
    const loginSection = document.getElementById('login-section');
    const filesSection = document.getElementById('files-section');
    const loginButton = document.getElementById('login-button');
    const logoutButton = document.getElementById('logout-button');
    const fileList = document.getElementById('file-list');
    const backButton = document.getElementById('back-button');
    const currentPathElement = document.getElementById('current-path');
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const selectAllButton = document.getElementById('select-all');
    const viewSelectedButton = document.getElementById('view-selected');
    const statusMessage = document.getElementById('status-message');
    
    // Nuevos elementos del DOM para integración con VC
    const vcLoginSection = document.getElementById('vc-login-section');
    const vcEmail = document.getElementById('vc-email');
    const vcPassword = document.getElementById('vc-password');
    const vcLoginButton = document.getElementById('vc-login-button');
    const vcLogoutButton = document.getElementById('vc-logout-button');
    const startupSelection = document.getElementById('startup-selection');
    const startupSelect = document.getElementById('startup-select');
    const documentType = document.getElementById('document-type');
    const uploadToVcButton = document.getElementById('upload-to-vc');
    
    // Estado de la aplicación
    let currentPath = '';
    let pathHistory = [];
    let selectedFiles = new Set();
    
    // Verificar si el usuario está autenticado
    try {
      const isAuthenticated = await dropboxApi.isAuthenticated();
      if (isAuthenticated) {
        showFilesSection();
        loadFiles(currentPath);
        // Verificar también autenticación en VC
        await checkVCAuth();
      } else {
        showLoginSection();
      }
    } catch (error) {
      showError('Error checking authentication: ' + error.message);
      showLoginSection();
    }
    
    // Event listeners para Dropbox
    loginButton.addEventListener('click', async () => {
      try {
        showStatus('Connecting to Dropbox...', 'normal');
        await dropboxApi.authenticate();
        showFilesSection();
        loadFiles(currentPath);
        showStatus('Connected to Dropbox successfully!', 'success');
        
        // Verificar también autenticación en VC
        await checkVCAuth();
      } catch (error) {
        showError('Authentication failed: ' + error.message);
      }
    });
    
    logoutButton.addEventListener('click', async () => {
      try {
        await dropboxApi.logout();
        showLoginSection();
        showStatus('Disconnected from Dropbox', 'normal');
      } catch (error) {
        showError('Logout failed: ' + error.message);
      }
    });
    
    backButton.addEventListener('click', () => {
      navigateBack();
    });

    // Event listeners para integración con VC
vcLoginButton.addEventListener('click', async () => {
    try {
      showStatus('Connecting to VC platform...', 'normal');
      
      console.log('Iniciando autenticación con VC...');
      console.log('Credenciales:', { email: vcEmail.value, password: '***' });
      
      const response = await chrome.runtime.sendMessage({
        action: 'authenticate_vc',
        email: vcEmail.value,
        password: vcPassword.value
      });
      
      console.log('Respuesta de autenticación VC:', response);
      
      if (!response || !response.success) {
        throw new Error(response?.error || 'Error de autenticación');
      }
      
      console.log('Autenticación exitosa, token:', response.token);
      
      // Actualizar UI
      vcLoginSection.classList.add('hidden');
      startupSelection.classList.remove('hidden');
      vcLogoutButton.classList.remove('hidden');
      
      // Cargar startups
      console.log('Cargando startups después de autenticación...');
      await loadStartups();
      
      showStatus('Connected to VC platform successfully!', 'success');
    } catch (error) {
      console.error('VC Authentication failed:', error);
      showError('VC Authentication failed: ' + error.message);
    }
  });
    
    searchButton.addEventListener('click', () => {
      const query = searchInput.value.trim();
      if (query) {
        searchFiles(query);
      }
    });
    
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const query = searchInput.value.trim();
        if (query) {
          searchFiles(query);
        }
      }
    });
    
    selectAllButton.addEventListener('click', () => {
      const checkboxes = document.querySelectorAll('.file-item input[type="checkbox"]');
      const allSelected = Array.from(checkboxes).every(cb => cb.checked);
      
      checkboxes.forEach(checkbox => {
        checkbox.checked = !allSelected;
        
        const filePath = checkbox.dataset.path;
        if (!allSelected) {
          selectedFiles.add(filePath);
        } else {
          selectedFiles.delete(filePath);
        }
      });
      
      updateViewSelectedButton();
    });
    
    viewSelectedButton.addEventListener('click', async () => {
      if (selectedFiles.size === 0) return;
      
      try {
        showStatus(`Processing ${selectedFiles.size} files...`, 'normal');
        
        // Convertir Set a Array para procesar
        const selectedFilePaths = Array.from(selectedFiles);
        
        // Obtener metadatos de los archivos seleccionados
        const fileMetadataPromises = selectedFilePaths.map(path => dropboxApi.getMetadata(path));
        const filesMetadata = await Promise.all(fileMetadataPromises);
        
        // Preparar la lista de archivos con información relevante
        const filesInfo = filesMetadata.map(metadata => ({
          path: metadata.path_lower,
          name: metadata.name,
          size: metadata.size,
          id: metadata.id,
          lastModified: metadata.server_modified,
          contentHash: metadata.content_hash
        }));
        
        // Mostrar información de los archivos seleccionados
        displaySelectedFilesInfo(filesInfo);
        
        // Verificar si está autenticado en VC
        const storage = await chrome.storage.local.get('vc_token');
        if (storage.vc_token) {
          startupSelection.classList.remove('hidden');
          uploadToVcButton.disabled = !startupSelect.value;
          
          // Cargar startups si no se ha hecho
          if (startupSelect.options.length <= 1) {
            await loadStartups();
          }
        } else {
          // Si no está autenticado en VC, mostrar login
          vcLoginSection.classList.remove('hidden');
        }
        
        // Preguntar si desea descargar los archivos
        const downloadOption = confirm(`¿Quieres descargar los ${filesInfo.length} archivos seleccionados?`);
        
        if (downloadOption) {
          // Descargar los archivos uno por uno
          for (const file of filesInfo) {
            await downloadFile(file.path, file.name);
            showStatus(`Downloaded: ${file.name}`, 'success');
          }
        }
        
      } catch (error) {
        showError('Error processing files: ' + error.message);
      }
    });
    
    // Event listeners para integración con VC
    vcLoginButton.addEventListener('click', async () => {
      try {
        showStatus('Connecting to VC platform...', 'normal');
        await chrome.runtime.sendMessage({
          action: 'authenticate_vc',
          email: vcEmail.value,
          password: vcPassword.value
        });
        
        vcLoginSection.classList.add('hidden');
        startupSelection.classList.remove('hidden');
        vcLogoutButton.classList.remove('hidden');
        await loadStartups();
        showStatus('Connected to VC platform successfully!', 'success');
      } catch (error) {
        showError('VC Authentication failed: ' + error.message);
      }
    });
    
    vcLogoutButton.addEventListener('click', async () => {
      try {
        await chrome.storage.local.remove('vc_token');
        startupSelection.classList.add('hidden');
        vcLogoutButton.classList.add('hidden');
        showStatus('Disconnected from VC platform', 'normal');
      } catch (error) {
        showError('VC Logout failed: ' + error.message);
      }
    });
    
    // Habilitar/deshabilitar botón de subida según selección
    startupSelect.addEventListener('change', () => {
      uploadToVcButton.disabled = !startupSelect.value || selectedFiles.size === 0;
    });
    
    // Event listener para subir a VC
    uploadToVcButton.addEventListener('click', async () => {
      if (selectedFiles.size === 0 || !startupSelect.value) return;
      
      try {
        showStatus(`Uploading ${selectedFiles.size} files to VC platform...`, 'normal');
        
        // Convertir Set a Array para procesar
        const selectedFilePaths = Array.from(selectedFiles);
        
        // Obtener metadatos de los archivos seleccionados
        const fileMetadataPromises = selectedFilePaths.map(path => dropboxApi.getMetadata(path));
        const filesMetadata = await Promise.all(fileMetadataPromises);
        
        const result = await chrome.runtime.sendMessage({
          action: 'upload_to_vc',
          files: filesMetadata,
          startupId: startupSelect.value,
          documentType: documentType.value
        });
        
        if (result.success) {
          showStatus('Files successfully uploaded to VC platform!', 'success');
        } else {
          throw new Error(result.error || 'Upload failed');
        }
      } catch (error) {
        showError('Error uploading files to VC: ' + error.message);
      }
    });
    
    // Funciones auxiliares
    function showLoginSection() {
      loginSection.classList.remove('hidden');
      filesSection.classList.add('hidden');
      vcLoginSection.classList.add('hidden');
      logoutButton.classList.add('hidden');
      vcLogoutButton.classList.add('hidden');
    }
    
    function showFilesSection() {
      loginSection.classList.add('hidden');
      filesSection.classList.remove('hidden');
      logoutButton.classList.remove('hidden');
    }
    
    // Verificar si está autenticado en VC
    async function checkVCAuth() {
      try {
        const storage = await chrome.storage.local.get('vc_token');
        if (storage.vc_token) {
          startupSelection.classList.remove('hidden');
          vcLogoutButton.classList.remove('hidden');
          await loadStartups();
        } else {
          startupSelection.classList.add('hidden');
          vcLogoutButton.classList.add('hidden');
        }
      } catch (error) {
        console.error('Error checking VC authentication:', error);
      }
    }
    
    // Cargar lista de startups
    // Función loadStartups mejorada
async function loadStartups() {
    try {
      console.log('Iniciando carga de startups...');
      startupSelect.innerHTML = '<option value="">Cargando startups...</option>';
      
      // Verificar token antes de hacer la solicitud
      const storage = await chrome.storage.local.get('vc_token');
      console.log('Token para cargar startups:', storage.vc_token);
      
      if (!storage.vc_token) {
        throw new Error('No hay token de autenticación');
      }
      
      console.log('Enviando solicitud para obtener startups...');
      const startups = await chrome.runtime.sendMessage({ action: 'get_startups' });
      console.log('Respuesta de startups recibida:', startups);
      
      startupSelect.innerHTML = '<option value="">Seleccionar startup...</option>';
      
      // Manejar diferentes formatos de respuesta
      if (Array.isArray(startups)) {
        // La respuesta es directamente un array de startups
        startups.forEach(startup => {
          const option = document.createElement('option');
          option.value = startup.id;
          option.textContent = startup.name;
          startupSelect.appendChild(option);
        });
        console.log(`Se cargaron ${startups.length} startups (formato array)`);
      } else if (startups && typeof startups === 'object') {
        // La respuesta es un objeto que puede contener un array de startups
        const startupArray = startups.data || startups.results || startups.items || 
                             startups.startups || Object.values(startups);
        
        if (Array.isArray(startupArray)) {
          console.log(`Se encontraron ${startupArray.length} startups en el objeto respuesta`);
          startupArray.forEach(startup => {
            const option = document.createElement('option');
            // Manejar diferentes estructuras de objeto startup
            const id = startup.id || startup._id || startup.startupId;
            const name = startup.name || startup.title || startup.startupName;
            
            if (id && name) {
              option.value = id;
              option.textContent = name;
              startupSelect.appendChild(option);
            } else {
              console.warn('Startup con formato incorrecto:', startup);
            }
          });
        } else {
          console.error('No se pudo extraer un array de startups del objeto respuesta:', startups);
          throw new Error('Formato de respuesta no reconocido');
        }
      } else if (startups && startups.success === false) {
        // La respuesta indica un error
        console.error('Error en la respuesta:', startups.error || 'Error desconocido');
        throw new Error(startups.error || 'Error obteniendo startups');
      } else {
        console.error('Formato de respuesta no reconocido:', startups);
        throw new Error('Formato de respuesta no reconocido');
      }
      
      // Actualizar UI según el resultado
      if (startupSelect.options.length <= 1) {
        // Solo está la opción "Seleccionar startup", no se cargaron startups
        startupSelect.innerHTML = '<option value="">No se encontraron startups</option>';
        console.warn('No se encontraron startups para mostrar');
      } else {
        console.log(`Startups cargadas exitosamente: ${startupSelect.options.length - 1}`);
      }
    } catch (error) {
      console.error('Error cargando startups:', error);
      startupSelect.innerHTML = '<option value="">Error cargando startups</option>';
      showError('Error loading startups: ' + error.message);
    }
  }
    
    function showStatus(message, type = 'normal') {
      statusMessage.textContent = message;
      statusMessage.className = 'status';
      
      if (type === 'error') {
        statusMessage.classList.add('error');
      } else if (type === 'success') {
        statusMessage.classList.add('success');
      } else {
        statusMessage.classList.add('normal');
      }
      
      statusMessage.classList.remove('hidden');
      
      // Ocultar el mensaje después de 3 segundos
      setTimeout(() => {
        statusMessage.classList.add('hidden');
      }, 3000);
    }
    
    function showError(message) {
      showStatus(message, 'error');
    }
    
    async function loadFiles(path) {
      try {
        fileList.innerHTML = `
          <div class="loading-indicator">
            <div class="loading-spinner"></div>
            <div>Loading files...</div>
          </div>
        `;
        currentPathElement.textContent = path || '/';
        
        const result = await dropboxApi.listFolder(path);
        
        // Ordenar: carpetas primero, luego archivos
        const entries = result.entries.sort((a, b) => {
          if (a['.tag'] === 'folder' && b['.tag'] !== 'folder') return -1;
          if (a['.tag'] !== 'folder' && b['.tag'] === 'folder') return 1;
          return a.name.localeCompare(b.name);
        });
        
        if (entries.length === 0) {
          fileList.innerHTML = `
            <div class="empty-state">
              <div class="icon">📁</div>
              <div>This folder is empty</div>
            </div>
          `;
          return;
        }
        
        // Limpiar la lista de archivos
        fileList.innerHTML = '';
        
        // Crear elementos de la lista
        entries.forEach(entry => {
          const isFolder = entry['.tag'] === 'folder';
          const fileItem = document.createElement('div');
          fileItem.className = 'file-item';
          
          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.className = 'checkbox';
          checkbox.dataset.path = entry.path_lower;
          
          // Solo permitir seleccionar archivos, no carpetas
          if (!isFolder) {
            checkbox.addEventListener('change', () => {
              if (checkbox.checked) {
                selectedFiles.add(entry.path_lower);
              } else {
                selectedFiles.delete(entry.path_lower);
              }
              updateViewSelectedButton();
            });
          } else {
            checkbox.disabled = true;
          }
          
          const icon = document.createElement('span');
          icon.className = `icon ${isFolder ? 'folder-icon' : 'file-icon'}`;
          
          // Usar emoji basado en tipo de archivo
          if (isFolder) {
            icon.textContent = '📁';
          } else {
            const ext = entry.name.split('.').pop().toLowerCase();
            if (['jpg', 'jpeg', 'png', 'gif', 'svg'].includes(ext)) {
              icon.textContent = '🖼️';
            } else if (['doc', 'docx'].includes(ext)) {
              icon.textContent = '📝';
            } else if (['xls', 'xlsx'].includes(ext)) {
              icon.textContent = '📊';
            } else if (['ppt', 'pptx'].includes(ext)) {
              icon.textContent = '📊';
            } else if (['pdf'].includes(ext)) {
              icon.textContent = '📄';
            } else if (['zip', 'rar', '7z'].includes(ext)) {
              icon.textContent = '📦';
            } else {
              icon.textContent = '📄';
            }
          }
          
          const nameSpan = document.createElement('span');
          nameSpan.className = 'name';
          nameSpan.textContent = entry.name;
          
          fileItem.appendChild(checkbox);
          fileItem.appendChild(icon);
          fileItem.appendChild(nameSpan);
          
          // Si es una carpeta, permitir navegación
          if (isFolder) {
            fileItem.addEventListener('click', (e) => {
              // Evitar clic si se hizo en el checkbox
              if (e.target !== checkbox) {
                navigateTo(entry.path_lower);
              }
            });
          }
          
          fileList.appendChild(fileItem);
        });
        
      } catch (error) {
        showError('Error loading files: ' + error.message);
        fileList.innerHTML = `
          <div class="empty-state">
            <div class="icon">❌</div>
            <div>Failed to load files</div>
          </div>
        `;
      }
    }
    
    function navigateTo(path) {
      pathHistory.push(currentPath);
      currentPath = path;
      loadFiles(currentPath);
      selectedFiles.clear();
      updateViewSelectedButton();
    }
    
    function navigateBack() {
      if (pathHistory.length > 0) {
        currentPath = pathHistory.pop();
        loadFiles(currentPath);
        selectedFiles.clear();
        updateViewSelectedButton();
      }
    }
    
    async function searchFiles(query) {
      try {
        fileList.innerHTML = `
          <div class="loading-indicator">
            <div class="loading-spinner"></div>
            <div>Searching...</div>
          </div>
        `;
        showStatus(`Searching for "${query}"...`, 'normal');
        
        const result = await dropboxApi.search(query, currentPath);
        
        if (!result.matches || result.matches.length === 0) {
          fileList.innerHTML = `
            <div class="empty-state">
              <div class="icon">🔍</div>
              <div>No results found for "${query}"</div>
            </div>
          `;
          return;
        }
        
        // Limpiar la lista
        fileList.innerHTML = '';
        
        // Mostrar resultados
        result.matches.forEach(match => {
          const metadata = match.metadata.metadata;
          const isFolder = metadata['.tag'] === 'folder';
          
          const fileItem = document.createElement('div');
          fileItem.className = 'file-item';
          
          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.className = 'checkbox';
          checkbox.dataset.path = metadata.path_lower;
          
          if (!isFolder) {
            checkbox.addEventListener('change', () => {
              if (checkbox.checked) {
                selectedFiles.add(metadata.path_lower);
              } else {
                selectedFiles.delete(metadata.path_lower);
              }
              updateViewSelectedButton();
            });
          } else {
            checkbox.disabled = true;
          }
          
          const icon = document.createElement('span');
          icon.className = `icon ${isFolder ? 'folder-icon' : 'file-icon'}`;
          
          // Usar emoji basado en tipo de archivo
          if (isFolder) {
            icon.textContent = '📁';
          } else {
            const ext = metadata.name.split('.').pop().toLowerCase();
            if (['jpg', 'jpeg', 'png', 'gif', 'svg'].includes(ext)) {
              icon.textContent = '🖼️';
            } else if (['doc', 'docx'].includes(ext)) {
              icon.textContent = '📝';
            } else if (['xls', 'xlsx'].includes(ext)) {
              icon.textContent = '📊';
            } else if (['ppt', 'pptx'].includes(ext)) {
              icon.textContent = '📊';
            } else if (['pdf'].includes(ext)) {
              icon.textContent = '📄';
            } else if (['zip', 'rar', '7z'].includes(ext)) {
              icon.textContent = '📦';
            } else {
              icon.textContent = '📄';
            }
          }
          
          const nameSpan = document.createElement('span');
          nameSpan.className = 'name';
          nameSpan.textContent = metadata.name;
          
          fileItem.appendChild(checkbox);
          fileItem.appendChild(icon);
          fileItem.appendChild(nameSpan);
          
          if (isFolder) {
            fileItem.addEventListener('click', (e) => {
              if (e.target !== checkbox) {
                navigateTo(metadata.path_lower);
              }
            });
          }
          
          fileList.appendChild(fileItem);
        });
        
        showStatus(`Found ${result.matches.length} results`, 'success');
        
      } catch (error) {
        showError('Search failed: ' + error.message);
        fileList.innerHTML = `
          <div class="empty-state">
            <div class="icon">❌</div>
            <div>Search failed</div>
          </div>
        `;
      }
    }
    
    function updateViewSelectedButton() {
      viewSelectedButton.disabled = selectedFiles.size === 0;
      viewSelectedButton.textContent = `View Selected (${selectedFiles.size})`;
      
      // También actualizar botón de subida a VC
      if (uploadToVcButton) {
        uploadToVcButton.disabled = selectedFiles.size === 0 || !startupSelect.value;
      }
    }
    
    /**
     * Muestra información detallada de los archivos seleccionados
     */
    function displaySelectedFilesInfo(filesInfo) {
      // Crear un diálogo modal para mostrar la información
      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.innerHTML = `
        <div class="modal-content">
          <span class="close-button">&times;</span>
          <h2>Selected Files (${filesInfo.length})</h2>
          <div class="files-container">
            ${filesInfo.map(file => `
              <div class="file-detail">
                <div class="file-name"><strong>${file.name}</strong></div>
                <div class="file-info">Size: ${formatFileSize(file.size)}</div>
                <div class="file-info">Last modified: ${new Date(file.lastModified).toLocaleString()}</div>
                <div class="file-path">Path: ${file.path}</div>
              </div>
            `).join('')}
          </div>
          <div class="modal-footer">
            <button id="close-modal-button" class="btn secondary">Close</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(modal);
      
      // Manejar el cierre del modal
      const closeButton = document.querySelector('.close-button');
      const closeModalButton = document.getElementById('close-modal-button');
      
      const closeModal = () => {
        document.body.removeChild(modal);
      };
      
      closeButton.addEventListener('click', closeModal);
      closeModalButton.addEventListener('click', closeModal);
    }
    
    /**
     * Formatea el tamaño del archivo en unidades legibles
     */
    function formatFileSize(bytes) {
      if (bytes === 0) return '0 Bytes';
      
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    /**
     * Descarga un archivo de Dropbox
     */
    async function downloadFile(path, filename) {
      showStatus(`Downloading: ${filename}...`, 'normal');
      
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          { action: 'download_file', path, filename },
          response => {
            if (response && response.success) {
              console.log('Download response:', response);
              resolve(response);
            } else {
              console.error('Download failed:', response ? response.error : 'No response');
              reject(new Error(response && response.error ? response.error : 'Download failed'));
            }
          }
        );
      });
    }
  });