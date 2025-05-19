import { Storage } from '@google-cloud/storage';
import path from 'path';

// Inicializar Google Cloud Storage con las credenciales
const storage = new Storage({
  keyFilename: path.join(process.cwd(), 'creds.json')
});

// Nombre del bucket
const bucketName = 'cluvi';
const folderName = 'VC-Files';

// Obtener el bucket
const bucket = storage.bucket(bucketName);

export const googleCloudStorage = {
  /**
   * Sube un archivo a Google Cloud Storage
   * @param fileName - Nombre del archivo (con extensión)
   * @param buffer - Buffer del archivo a subir
   * @returns - URL del archivo subido
   */
  async uploadFile(fileName: string, buffer: Buffer): Promise<string> {
    // Generar un nombre seguro para el archivo
    const safeFileName = `${folderName}/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9\.]/g, '_')}`;
    
    console.log(`Intentando subir archivo a GCS: ${safeFileName}`);
    
    // Crear un objeto de archivo en el bucket
    const file = bucket.file(safeFileName);
    
    try {
      // Verificar si el bucket tiene acceso uniforme habilitado
      const [bucketMetadata] = await bucket.getMetadata();
      const hasUniformAccess = bucketMetadata.iamConfiguration?.uniformBucketLevelAccess?.enabled === true;
      
      console.log(`Bucket ${bucketName} tiene acceso uniforme: ${hasUniformAccess ? 'SÍ' : 'NO'}`);
      
      // Guardar el buffer en GCS con opciones públicas si el bucket lo permite
      const uploadOptions = {
        contentType: this.getContentType(fileName),
        metadata: {
          cacheControl: 'public, max-age=31536000'
        },
        // Si el bucket tiene acceso uniforme, no intentamos establecer predefinedAcl
        predefinedAcl: hasUniformAccess ? undefined : 'publicRead'
      };
      
      await file.save(buffer, uploadOptions);
      
      // Si el bucket no tiene acceso uniforme, intentamos hacer el archivo público
      if (!hasUniformAccess) {
        try {
          await file.makePublic();
        } catch (publicError) {
          console.warn("No se pudo hacer el archivo público, pero la carga fue exitosa:", publicError);
        }
      }
      
      // Construir la URL del archivo
      const fileUrl = `https://storage.googleapis.com/${bucketName}/${safeFileName}`;
      console.log(`Archivo subido exitosamente a GCS: ${fileUrl}`);
      return fileUrl;
    } catch (error) {
      console.error("Error al subir archivo a GCS:", error);
      throw error;
    }
  },
  
  /**
   * Elimina un archivo de Google Cloud Storage
   * @param fileUrl - URL completa del archivo a eliminar
   */
  async deleteFile(fileUrl: string): Promise<void> {
    try {
      // Extraer el nombre del archivo de la URL
      const filename = fileUrl.replace(`https://storage.googleapis.com/${bucketName}/`, '');
      
      if (!filename || filename === fileUrl) {
        throw new Error('URL inválida de Google Cloud Storage');
      }
      
      console.log(`Intentando eliminar archivo de GCS: ${filename}`);
      
      // Eliminar el archivo
      await bucket.file(filename).delete();
      
      console.log(`Archivo eliminado exitosamente de GCS: ${filename}`);
    } catch (error) {
      console.error("Error al eliminar archivo de GCS:", error);
      throw error;
    }
  },
  
  /**
   * Determina el tipo de contenido basado en la extensión del archivo
   */
  getContentType(fileName: string): string {
    const extension = path.extname(fileName).toLowerCase();
    
    const mimeTypes: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.txt': 'text/plain',
      '.csv': 'text/csv',
      '.rtf': 'application/rtf',
      '.md': 'text/markdown',
      '.json': 'application/json'
    };
    
    return mimeTypes[extension] || 'application/octet-stream';
  }
};