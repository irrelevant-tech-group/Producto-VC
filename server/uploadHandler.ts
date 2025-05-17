import type { Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import fs from "fs";
import { processDocument } from "./services/documentProcessor";

// Configuración de multer para manejo de archivos
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // Límite de 25MB
  },
  fileFilter: (req, file, callback) => {
    // Validar tipos de archivo permitidos
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      callback(null, true);
    } else {
      callback(new Error(`Tipo de archivo no soportado: ${file.mimetype}. Tipos permitidos: PDF, DOCX, XLSX, PPTX, TXT, CSV`));
    }
  }
});

// Middleware para procesar la carga de documentos
export async function uploadDocumentHandler(req: Request, res: Response, next: NextFunction) {
  try {
    // Validar parámetros requeridos
    if (!req.file) {
      return res.status(400).json({ message: "No se ha subido ningún archivo" });
    }
    
    const { startupId, type, name, description } = req.body;
    
    if (!startupId || !type) {
      return res.status(400).json({ message: "startupId y type son campos requeridos" });
    }
    
    // Verificar que el startup existe
    const startup = await storage.getStartup(startupId);
    if (!startup) {
      return res.status(404).json({ message: `Startup con ID ${startupId} no encontrado` });
    }
    
    // Crear directorio temporal para almacenar archivos si no existe
    const uploadDir = path.join(__dirname, '..', 'temp_uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // Generar nombre de archivo único
    const fileName = `${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9\.]/g, '_')}`;
    const filePath = path.join(uploadDir, fileName);
    
    // Guardar el archivo temporalmente
    fs.writeFileSync(filePath, req.file.buffer);
    
    // En un entorno de producción, aquí subiríamos el archivo a S3 o similar
    // Para el MVP, simularemos una URL de almacenamiento
    const fileUrl = `file://${filePath}`;
    
    // Crear el documento en la base de datos
    const document = await storage.createDocument({
      startupId,
      name: name || req.file.originalname,
      type: type as any,
      fileUrl,
      fileType: req.file.mimetype,
      uploadedBy: req.body.userId ? parseInt(req.body.userId) : undefined,
      metadata: description ? { description } : undefined
    });
    
    // Registrar la actividad
    await storage.createActivity({
      type: 'document_uploaded',
      documentId: document.id,
      startupId,
      userId: req.body.userId ? parseInt(req.body.userId) : undefined,
      content: `Se ha subido el documento "${document.name}"`
    });
    
    // Iniciar el procesamiento del documento en segundo plano
    processDocument(document.id).catch(error => {
      console.error(`Error procesando documento ${document.id}:`, error);
    });
    
    // Retornar respuesta exitosa
    res.status(201).json({
      id: document.id,
      name: document.name,
      type: document.type,
      startupId: document.startupId,
      uploadedAt: document.uploadedAt,
      processingStatus: document.processingStatus,
      message: "Documento subido correctamente y en proceso de análisis"
    });
    
  } catch (error) {
    // Eliminar archivo temporal en caso de error
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error("Error eliminando archivo temporal:", unlinkError);
      }
    }
    
    next(error);
  }
}