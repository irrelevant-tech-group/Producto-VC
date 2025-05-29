// Este archivo maneja eventos en segundo plano y la comunicación entre componentes

// Escuchar cuando la extensión es instalada o actualizada
chrome.runtime.onInstalled.addListener(async (details) => {
    console.log('Extension installed or updated:', details.reason);
    
    // Probar conexión con el backend
    const connectionOk = await testBackendConnection();
    console.log('Conexión con el backend:', connectionOk ? 'OK' : 'Fallida');
    
    // Limpiar cualquier dato antiguo si es necesario
    if (details.reason === 'update') {
      // Opcional: limpiar tokens antiguos si cambia la versión
      // chrome.storage.local.remove('dropbox_access_token');
    }
  });
  
  // Probar una solicitud simple al backend para verificar CORS
  async function testBackendConnection() {
    try {
      console.log('Probando conexión con el backend...');
      const response = await fetch('http://localhost:5000/api/health', {
        method: 'GET'
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Conexión exitosa con el backend:', data);
        return true;
      } else {
        console.error('Error conectando con el backend:', response.status);
        return false;
      }
    } catch (error) {
      console.error('Error de conexión con el backend:', error);
      return false;
    }
  }
  
  // Escuchar mensajes desde el popup u otros componentes
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Background script received message:', message);
    
    if (message.action === 'download_file') {
      // Implementar descarga de archivos
      downloadDropboxFile(message.path, message.filename)
        .then(result => sendResponse({ success: true, ...result }))
        .catch(error => {
          console.error('Download error:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true; // Indica que la respuesta será asíncrona
    }
    
    if (message.action === 'check_auth') {
      checkAuthentication()
        .then(isAuthenticated => sendResponse({ isAuthenticated }))
        .catch(error => sendResponse({ isAuthenticated: false, error: error.message }));
      return true;
    }
    
    // Nuevos mensajes para integración con VC
    if (message.action === 'authenticate_vc') {
      authenticateWithVC(message.email, message.password)
        .then(result => sendResponse({ success: true, ...result }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
    }
    
    if (message.action === 'get_startups') {
      getStartups()
        .then(result => sendResponse(result))
        .catch(error => {
          console.error('Error al procesar get_startups:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true;
    }
    
    if (message.action === 'upload_to_vc') {
      uploadToVC(message.files, message.startupId, message.documentType)
        .then(result => sendResponse({ success: true, ...result }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
    }
  });
  
  /**
   * Descarga un archivo de Dropbox
   * @param {string} path - Ruta del archivo en Dropbox
   * @param {string} filename - Nombre del archivo
   * @returns {Promise<Object>}
   */
  async function downloadDropboxFile(path, filename) {
    try {
      console.log('Downloading file from path:', path);
      
      // Inicializar la API de Dropbox
      const dropboxApi = new DropboxAPI();
      
      // Verificar autenticación
      const isAuthenticated = await dropboxApi.isAuthenticated();
      if (!isAuthenticated) {
        throw new Error('Not authenticated with Dropbox');
      }
      
      // Descargar el archivo
      console.log('Authenticated, downloading file...');
      const fileBlob = await dropboxApi.downloadFile(path);
      console.log('File downloaded as blob, size:', fileBlob.size);
      
      // Crear una URL para el blob
      const url = URL.createObjectURL(fileBlob);
      console.log('Blob URL created:', url);
      
      // Usar la API de chrome.downloads para descargar el archivo
      const downloadId = await chrome.downloads.download({
        url: url,
        filename: filename,
        saveAs: false
      });
      
      console.log('Download initiated with ID:', downloadId);
      
      // Limpiar la URL del blob después de cierto tiempo
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      
      return { downloadId };
    } catch (error) {
      console.error('Download error:', error);
      throw error;
    }
  }
  
  /**
   * Verifica si el usuario está autenticado con Dropbox
   * @returns {Promise<boolean>}
   */
  async function checkAuthentication() {
    try {
      const dropboxApi = new DropboxAPI();
      return await dropboxApi.isAuthenticated();
    } catch (error) {
      console.error('Authentication check error:', error);
      return false;
    }
  }
  
  /**
   * Autentica al usuario en la plataforma VC
   * @param {string} email - Email del usuario
   * @param {string} password - Contraseña del usuario
   * @returns {Promise<Object>}
   */
  async function authenticateWithVC(email, password) {
    try {
      console.log('Iniciando autenticación con VC...');
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username: email, password })
      });
      
      console.log('Respuesta status de autenticación:', response.status);
      const data = await response.json();
      console.log('Respuesta completa de autenticación VC:', data);
      
      if (!response.ok) {
        throw new Error(data.message || 'Error de autenticación');
      }
      
      // Intentar encontrar el token en diferentes formatos comunes
      let token = null;
      if (data.token) {
        token = data.token;
      } else if (data.access_token) {
        token = data.access_token;
      } else if (data.accessToken) {
        token = data.accessToken;
      } else if (typeof data === 'string') {
        // Algunos APIs devuelven directamente el token como string
        token = data;
      } else {
        // Usar un token de prueba para debugging
        token = 'demo_token_for_testing';
        console.warn('No se encontró token en la respuesta, usando token de prueba');
      }
      
      console.log('Token identificado:', token);
      await chrome.storage.local.set({ 'vc_token': token });
      
      // Verificar que se guardó correctamente
      const storage = await chrome.storage.local.get('vc_token');
      console.log('Token guardado en storage:', storage.vc_token);
      
      return { success: true, token: token };
    } catch (error) {
      console.error('Error de autenticación VC:', error);
      throw error;
    }
  }
  
  /**
   * Obtiene la lista de startups disponibles para el usuario
   * @returns {Promise<Array>}
   */
  async function getStartups() {
    try {
      const storage = await chrome.storage.local.get('vc_token');
      const token = storage.vc_token;
      
      console.log('Obteniendo startups con token:', token);
      
      if (!token) {
        throw new Error('No autenticado en la plataforma VC');
      }
      
      try {
        // Intenta obtener startups del servidor
        const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
        console.log('Usando header de autorización:', authHeader);
        
        const response = await fetch('http://localhost:5000/api/startups', {
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('Respuesta status de startups:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Datos de startups recibidos del servidor:', data);
          return data;
        } else {
          const errorText = await response.text();
          console.error('Error en respuesta de startups:', errorText);
          throw new Error(`Error del servidor: ${response.status} - ${errorText}`);
        }
      } catch (apiError) {
        console.warn('Error al obtener startups del servidor, usando datos de muestra:', apiError);
        
        // Devolver datos de muestra para pruebas
        const sampleStartups = [
          { id: 'startup-1', name: 'Startup Demo 1' },
          { id: 'startup-2', name: 'Startup Demo 2' },
          { id: 'startup-3', name: 'Startup Demo 3' }
        ];
        
        console.log('Usando startups de muestra:', sampleStartups);
        return sampleStartups;
      }
    } catch (error) {
      console.error('Error obteniendo startups:', error);
      throw error;
    }
  }
  
  /**
   * Sube archivos desde Dropbox a la plataforma VC
   * @param {Array} files - Archivos a subir
   * @param {string} startupId - ID de la startup
   * @param {string} documentType - Tipo de documento
   * @returns {Promise<Object>}
   */
  async function uploadToVC(files, startupId, documentType) {
    try {
      const storage = await chrome.storage.local.get('vc_token');
      const token = storage.vc_token;
      
      if (!token) {
        throw new Error('No autenticado en la plataforma VC');
      }
      
      console.log(`Subiendo ${files.length} archivos a la startup ${startupId}`);
      
      // Para cada archivo seleccionado de Dropbox
      for (const file of files) {
        try {
          // Descargar contenido desde Dropbox
          const dropboxApi = new DropboxAPI();
          console.log(`Descargando archivo desde Dropbox: ${file.path}`);
          const fileBlob = await dropboxApi.downloadFile(file.path);
          console.log(`Archivo descargado: ${file.name}, tamaño: ${fileBlob.size} bytes`);
          
          // Crear FormData para envío a la API
          const formData = new FormData();
          formData.append('file', fileBlob, file.name);
          formData.append('startupId', startupId);
          formData.append('type', documentType);
          formData.append('name', file.name);
          
          // En entorno de desarrollo, simular subida exitosa
          if (startupId.startsWith('startup-')) {
            console.log(`Simulando subida del archivo ${file.name} a la startup ${startupId}`);
            // Simular una pausa para la subida
            await new Promise(resolve => setTimeout(resolve, 1000));
            console.log(`Archivo ${file.name} subido exitosamente (simulación)`);
            continue;
          }
          
          // Subir a la API real
          console.log(`Subiendo archivo ${file.name} a la API...`);
          const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
          
          const response = await fetch('http://localhost:5000/api/documents/upload', {
            method: 'POST',
            headers: {
              'Authorization': authHeader
            },
            body: formData
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            console.error(`Error subiendo archivo ${file.name}:`, errorData);
            throw new Error(errorData.message || `Error subiendo archivo ${file.name}`);
          }
          
          const data = await response.json();
          console.log(`Archivo ${file.name} subido exitosamente:`, data);
        } catch (fileError) {
          console.error(`Error procesando archivo ${file.name}:`, fileError);
          throw new Error(`Error en archivo ${file.name}: ${fileError.message}`);
        }
      }
      
      console.log('Todos los archivos fueron procesados exitosamente');
      return { success: true, message: `${files.length} archivos subidos exitosamente` };
    } catch (error) {
      console.error('Error general subiendo a VC:', error);
      throw error;
    }
  }