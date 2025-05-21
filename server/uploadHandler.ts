import type { Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import fs from "fs";
import { processDocument } from "./services/documentProcessor/index";
import { nanoid } from "nanoid"; // Para IDs únicos
import { googleCloudStorage } from "./services/storageService";

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
      'text/csv',
      'application/rtf',  // Añadido soporte para RTF
      'text/markdown',    // Añadido soporte para markdown
      'application/json'  // Añadido soporte para JSON
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      callback(null, true);
    } else {
      callback(new Error(`Tipo de archivo no soportado: ${file.mimetype}. Tipos permitidos: PDF, DOCX, XLSX, PPTX, TXT, CSV, RTF, MD, JSON`));
    }
  }
});

// Middleware para manejar la carga de multer
export const uploadMiddleware = upload.single('file');

// Middleware de validación de datos
export function validateUploadData(req: Request, res: Response, next: NextFunction) {
  if (!req.file) {
    return res.status(400).json({ 
      error: "missing_file", 
      message: "No se ha subido ningún archivo" 
    });
  }
  
  const { startupId, type } = req.body;
  
  if (!startupId) {
    return res.status(400).json({ 
      error: "missing_startup_id", 
      message: "El ID de startup es obligatorio" 
    });
  }
  
  if (!type) {
    return res.status(400).json({ 
      error: "missing_type", 
      message: "El tipo de documento es obligatorio" 
    });
  }
  
  next();
}

// Handler principal para procesar la carga de documentos
export async function uploadDocumentHandler(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  let fileUrl = '';
  
  try {
    // Las validaciones básicas ya se hicieron en validateUploadData
    const { startupId, type, name, description, tags, confidential } = req.body;
    
    // Verificar que el startup existe
    const startup = await storage.getStartup(startupId);
    if (!startup) {
      return res.status(404).json({ 
        error: "startup_not_found",
        message: `Startup con ID ${startupId} no encontrado` 
      });
    }
    
    // Generar nombre de archivo único con nanoid para mayor seguridad
    const uniqueId = nanoid(10);
    const fileName = `${uniqueId}-${req.file!.originalname.replace(/[^a-zA-Z0-9\.]/g, '_')}`;
    
    // Subir archivo a Google Cloud Storage
    fileUrl = await googleCloudStorage.uploadFile(fileName, req.file!.buffer);
    
    // Preparar metadatos extendidos
    const metadata = {
      description: description || "",
      originalName: req.file!.originalname,
      mimeType: req.file!.mimetype,
      size: req.file!.size,
      uploadedAt: new Date().toISOString(),
      tags: tags ? (typeof tags === 'string' ? tags.split(',').map(t => t.trim()) : tags) : [],
      confidential: confidential === 'true' || confidential === true,
      uploadIp: req.ip || 'unknown',
      uploadAgent: req.headers['user-agent'] || 'unknown',
      storageProvider: 'google-cloud-storage'
    };
    
    // Crear el documento en la base de datos
    const document = await storage.createDocument({
      startupId,
      name: name || req.file!.originalname,
      type: type as any,
      fileUrl,
      fileType: req.file!.mimetype,
      uploadedBy: req.body.userId ? parseInt(req.body.userId) : undefined,
      metadata
    });
    
    // Registrar la actividad
    await storage.createActivity({
      type: 'document_uploaded',
      documentId: document.id,
      startupId,
      userId: req.body.userId ? parseInt(req.body.userId) : undefined,
      content: `Se ha subido el documento "${document.name}"`,
      metadata: {
        fileType: document.fileType,
        size: req.file!.size,
        processingTime: (Date.now() - startTime) / 1000,
        storageProvider: 'google-cloud-storage'
      }
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
      size: req.file!.size,
      fileUrl,
      metadata: {
        description: metadata.description,
        tags: metadata.tags,
        confidential: metadata.confidential
      },
      message: "Documento subido correctamente a Google Cloud Storage y en proceso de análisis"
    });
    
  } catch (error: any) {
    // Si hubo un error y se subió el archivo, intentar eliminarlo
    if (fileUrl) {
      try {
        await googleCloudStorage.deleteFile(fileUrl);
      } catch (deleteError) {
        console.error("Error eliminando archivo de Google Cloud Storage:", deleteError);
      }
    }
    
    console.error("Error en uploadDocumentHandler:", error);
    
    // Formatear el error para la respuesta
    if (!res.headersSent) {
      res.status(500).json({
        error: "upload_failed",
        message: error.message || "Error desconocido al subir el documento",
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    } else {
      next(error);
    }
  }
}

// Configuración de rutas para uso en Express
export function setupDocumentRoutes(app: any) {
  // Ruta para subir documentos
  app.post('/api/documents', uploadMiddleware, validateUploadData, uploadDocumentHandler);
  
  // Ruta para obtener un documento
  app.get('/api/documents/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const document = await storage.getDocument(req.params.id);
      if (!document) {
        return res.status(404).json({ error: "document_not_found", message: "Documento no encontrado" });
      }
      res.json(document);
    } catch (error) {
      next(error);
    }
  });
  
  // Ruta para obtener documentos de un startup
  app.get('/api/startups/:startupId/documents', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const documents = await storage.getDocumentsByStartup(req.params.startupId);
      res.json(documents);
    } catch (error) {
      next(error);
    }
  });
}