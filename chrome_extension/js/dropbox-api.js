class DropboxAPI {
    constructor() {
      this.ACCESS_TOKEN_KEY = 'dropbox_access_token'; // Nombre de la clave, no el valor
      this.CLIENT_ID = 'vjstg3sfs8vjnsk'; // Tu App Key de Dropbox
      this.REDIRECT_URI = chrome.identity.getRedirectURL();
      this.API_ENDPOINT = 'https://api.dropboxapi.com/2';
    }
  
    /**
     * Inicia el proceso de autenticación OAuth con Dropbox
     * @returns {Promise<string>} Token de acceso
     */
    async authenticate() {
      try {
        console.log('Starting authentication process');
        console.log('REDIRECT_URI:', this.REDIRECT_URI);
        
        // Crear la URL de autorización
        const authUrl = `https://www.dropbox.com/oauth2/authorize?client_id=${this.CLIENT_ID}&response_type=token&redirect_uri=${encodeURIComponent(this.REDIRECT_URI)}`;
        
        console.log('Auth URL:', authUrl);
        
        // Lanzar la ventana de autenticación
        const redirectUrl = await this._launchAuthFlow(authUrl);
        
        console.log('Received redirect URL:', redirectUrl ? 'URL received' : 'No URL received');
        
        if (!redirectUrl) {
          throw new Error('Authentication failed or was cancelled');
        }
        
        // Extraer el token de acceso del URL de redirección
        const accessToken = this._extractAccessToken(redirectUrl);
        
        console.log('Access token extracted:', accessToken ? 'Yes' : 'No');
        
        if (!accessToken) {
          throw new Error('Failed to extract access token');
        }
        
        // Guardar el token en el almacenamiento local
        await this._saveAccessToken(accessToken);
        console.log('Access token saved to storage');
        
        return accessToken;
      } catch (error) {
        console.error('Authentication error:', error);
        throw error;
      }
    }
  
    /**
     * Verifica si el usuario está autenticado
     * @returns {Promise<boolean>}
     */
    async isAuthenticated() {
      try {
        const token = await this._getAccessToken();
        if (!token) return false;
        
        // Verificar que el token sea válido haciendo una petición simple
        const userInfo = await this.getCurrentAccount();
        return !!userInfo;
      } catch (error) {
        console.error('Token validation error:', error);
        return false;
      }
    }
  
    /**
     * Cierra la sesión eliminando el token
     * @returns {Promise<void>}
     */
    async logout() {
      await chrome.storage.local.remove(this.ACCESS_TOKEN_KEY);
    }
  
    /**
     * Obtiene información de la cuenta actual
     * @returns {Promise<Object>}
     */
    async getCurrentAccount() {
      return this._callApi('/users/get_current_account', {}, 'POST');
    }
  
    /**
     * Lista archivos y carpetas en una ruta específica
     * @param {string} path - Ruta a listar (por defecto raíz)
     * @returns {Promise<Array>} - Lista de archivos y carpetas
     */
    async listFolder(path = '') {
      try {
        const data = {
          path: path || '',
          recursive: false,
          include_media_info: false,
          include_deleted: false,
          include_has_explicit_shared_members: false
        };
        
        const token = await this._getAccessToken();
        
        if (!token) {
          throw new Error('No access token available');
        }
        
        console.log('Listing folder:', path);
        
        const response = await fetch(`${this.API_ENDPOINT}/files/list_folder`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        });
        
        // Manejo mejorado de errores
        if (!response.ok) {
          const errorText = await response.text();
          console.error('API error response:', errorText);
          try {
            // Intentar parsear como JSON
            const errorJson = JSON.parse(errorText);
            throw new Error(`API error: ${errorJson.error_summary || 'Unknown error'}`);
          } catch (e) {
            // Si no es JSON, usar el texto del error
            throw new Error(`API error: ${errorText.substring(0, 100)}`);
          }
        }
        
        const responseData = await response.json();
        console.log('Folder contents:', responseData);
        return responseData;
      } catch (error) {
        console.error('List folder error:', error);
        throw error;
      }
    }
  
    /**
     * Continúa listando archivos si hay más resultados
     * @param {string} cursor - Cursor para continuar listando
     * @returns {Promise<Array>}
     */
    async listFolderContinue(cursor) {
      return this._callApi('/files/list_folder/continue', { cursor }, 'POST');
    }
  
    /**
     * Obtiene metadatos de un archivo o carpeta
     * @param {string} path - Ruta del archivo o carpeta
     * @returns {Promise<Object>}
     */
    async getMetadata(path) {
      const data = {
        path: path,
        include_media_info: false,
        include_deleted: false,
        include_has_explicit_shared_members: false
      };
      
      return this._callApi('/files/get_metadata', data, 'POST');
    }
  
    /**
     * Descarga un archivo
     * @param {string} path - Ruta del archivo
     * @returns {Promise<Blob>}
     */
    async downloadFile(path) {
      try {
        const token = await this._getAccessToken();
        
        if (!token) {
          throw new Error('No access token available');
        }
        
        console.log('Downloading file:', path);
        
        const response = await fetch('https://content.dropboxapi.com/2/files/download', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Dropbox-API-Arg': JSON.stringify({ path })
          }
        });
        
        // Manejo mejorado de errores
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Download error response:', errorText);
          try {
            // Intentar parsear como JSON
            const errorJson = JSON.parse(errorText);
            throw new Error(`Failed to download file: ${errorJson.error_summary || 'Unknown error'}`);
          } catch (e) {
            // Si no es JSON, usar el texto del error
            throw new Error(`Failed to download file: ${errorText.substring(0, 100)}`);
          }
        }
        
        return await response.blob();
      } catch (error) {
        console.error('Download error:', error);
        throw error;
      }
    }
  
    /**
     * Búsqueda de archivos y carpetas
     * @param {string} query - Texto a buscar
     * @param {string} path - Ruta donde buscar (opcional)
     * @returns {Promise<Array>}
     */
    async search(query, path = '') {
      const data = {
        query,
        options: {
          path: path || '',
          max_results: 20,
          file_status: 'active'
        }
      };
      
      return this._callApi('/files/search_v2', data, 'POST');
    }
  
    /**
     * Método interno para hacer llamadas a la API
     * @private
     */
    async _callApi(endpoint, data, method = 'POST') {
      try {
        const token = await this._getAccessToken();
        
        if (!token) {
          throw new Error('No access token available');
        }
        
        console.log(`Calling API: ${endpoint}`, data);
        
        const response = await fetch(`${this.API_ENDPOINT}${endpoint}`, {
          method,
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: method !== 'GET' ? JSON.stringify(data) : undefined
        });
        
        // Manejo mejorado de errores
        if (!response.ok) {
          const errorText = await response.text();
          console.error('API error response:', errorText);
          try {
            // Intentar parsear como JSON
            const errorJson = JSON.parse(errorText);
            throw new Error(`API error: ${errorJson.error_summary || 'Unknown error'}`);
          } catch (e) {
            // Si no es JSON, usar el texto del error
            throw new Error(`API error: ${errorText.substring(0, 100)}`);
          }
        }
        
        const responseData = await response.json();
        console.log('API response:', responseData);
        return responseData;
      } catch (error) {
        console.error('API call error:', error);
        throw error;
      }
    }
  
    /**
     * Método interno para lanzar el flujo de autenticación
     * @private
     */
    _launchAuthFlow(authUrl) {
        return new Promise((resolve, reject) => {
          chrome.identity.launchWebAuthFlow({
            url: authUrl,
            interactive: true
          }, (redirectUrl) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(redirectUrl);
            }
          });
        });
      }
    
      /**
       * Extrae el token de acceso de la URL de redirección
       * @private
       */
      _extractAccessToken(redirectUrl) {
        const fragmentMatch = redirectUrl.match(/#access_token=([^&]+)/);
        return fragmentMatch ? fragmentMatch[1] : null;
      }
    
      /**
       * Guarda el token de acceso en el almacenamiento local
       * @private
       */
      async _saveAccessToken(token) {
        await chrome.storage.local.set({ [this.ACCESS_TOKEN_KEY]: token });
      }
    
      /**
       * Obtiene el token de acceso del almacenamiento local
       * @private
       */
      async _getAccessToken() {
        const result = await chrome.storage.local.get(this.ACCESS_TOKEN_KEY);
        return result[this.ACCESS_TOKEN_KEY];
      }
    }
    
    // Exportar la clase para uso global
    window.DropboxAPI = DropboxAPI;