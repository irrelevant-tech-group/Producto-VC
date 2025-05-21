// server/routes/documents.ts

import { Router, Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { requireAuth, loadUserFromDb } from "../middleware/auth";
import { isValidUUID, upload } from "./middlewares";
import { processDocument } from "../services/documentProcessor";
import { googleCloudStorage } from "../services/storageService";
import * as path from "path";
import * as fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { fileURLToPath } from "url";
import { dirname as pathDirname } from "path";

// ESM __dirname polyfill
const __filename = fileURLToPath(import.meta.url);
const __dirname = pathDirname(__filename);

const router = Router();

// Get specific document
router.get("/:id", requireAuth, loadUserFromDb, async (req, res) => {
  try {
    const documentId = req.params.id;
    
    // Validar ID format
    if (!documentId || !isValidUUID(documentId)) {
      return res.status(400).json({ message: "Invalid document ID format" });
    }
    
    const document = await storage.getDocument(documentId);
    
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }
    
    // Verificar acceso al startup
    const startup = await storage.getStartup(document.startupId);
    if (!startup) {
      return res.status(404).json({ message: "Associated startup not found" });
    }
    
    const fundId = req.user?.fundId;
    if (fundId && 
        startup.fundId && 
        fundId !== startup.fundId && 
        req.user?.email !== process.env.SUPERADMIN_EMAIL) {
      return res.status(403).json({ message: "No access to this document" });
    }
    
    // Transform the document data to ensure all fields are present
    const response = {
      id: document.id,
      name: document.name || 'Unnamed Document',
      type: document.type || 'other',
      startupId: document.startupId,
      fileUrl: document.fileUrl,
      fileType: document.fileType || 'application/octet-stream',
      uploadedAt: document.uploadedAt?.toISOString() || new Date().toISOString(),
      uploadedBy: document.uploadedBy,
      processed: document.processingStatus === 'completed',
      processingStatus: document.processingStatus || 'pending',
      metadata: document.metadata || {},
      description: document.metadata?.description || '',
    };
    
    res.json(response);
  } catch (error) {
    console.error("Error retrieving document:", error);
    res.status(500).json({ 
      message: "An error occurred while retrieving the document",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

// Upload document
router.post(
  "/upload", 
  requireAuth, 
  loadUserFromDb, 
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { startupId, type, name, description, tags, confidential } = req.body;
      if (!startupId || !type) {
        return res.status(400).json({ message: "startupId and type are required" });
      }

      const startup = await storage.getStartup(startupId);
      if (!startup) {
        return res.status(404).json({ message: `Startup with ID ${startupId} not found` });
      }
      
      // Verificar acceso al startup
      const fundId = req.user?.fundId;
      if (fundId && 
          startup.fundId && 
          fundId !== startup.fundId && 
          req.user?.email !== process.env.SUPERADMIN_EMAIL) {
        return res.status(403).json({ message: "No access to this startup" });
      }

      // Generar nombre único para el archivo
      const fileExt = path.extname(req.file.originalname);
      const fileName = `${Date.now()}-${uuidv4()}${fileExt}`;
      
      // Subir archivo a Google Cloud Storage
      console.log("Subiendo archivo a Google Cloud Storage...");
      let fileUrl = '';
      try {
        fileUrl = await googleCloudStorage.uploadFile(fileName, req.file.buffer);
        console.log(`Archivo subido exitosamente a GCS: ${fileUrl}`);
      } catch (gcsError) {
        console.error("Error al subir a Google Cloud Storage:", gcsError);
        
        // Fallback a almacenamiento local si falla GCS
        console.warn("Usando almacenamiento local como fallback");
        const uploadDir = path.join(__dirname, '..', '..', 'temp_uploads');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        const filePath = path.join(uploadDir, fileName);
        fs.writeFileSync(filePath, req.file.buffer);
        fileUrl = `file://${filePath}`;
        console.log(`Archivo guardado localmente como fallback: ${fileUrl}`);
      }

      // Preparar metadatos extendidos
      const metadata = {
        originalName: req.file.originalname,
        size: req.file.size,
        uploadedAt: new Date().toISOString(),
        description: description || "",
        tags: tags ? (typeof tags === 'string' ? tags.split(',').map(t => t.trim()) : tags) : [],
        confidential: confidential === 'true' || confidential === true,
        storageProvider: fileUrl.startsWith('https://storage.googleapis.com/') ? 'google-cloud-storage' : 'local'
      };

      // Crear el documento en la base de datos
      const document = await storage.createDocument({
        startupId,
        name: name || req.file.originalname,
        type: type as any,
        fileUrl,
        fileType: req.file.mimetype,
        uploadedBy: req.user?.id || req.body.userId,
        metadata
      });

      // Registrar actividad
      await storage.createActivity({
        type: 'document_uploaded',
        documentId: document.id,
        startupId,
        userId: req.user?.id || req.body.userId,
        content: `Documento "${document.name}" subido a ${metadata.storageProvider}`,
        metadata: {
          fileType: req.file.mimetype,
          fileSize: req.file.size,
          storageProvider: metadata.storageProvider
        },
        fundId: startup.fundId
      });

      // Iniciar procesamiento en segundo plano
      processDocument(document.id).catch(error => {
        console.error(`Error processing document ${document.id}:`, error);
      });

      // Devolver respuesta exitosa
      res.status(201).json({
        ...document,
        message: `Documento subido a ${metadata.storageProvider}. El procesamiento iniciará en breve.`
      });
    } catch (error: any) {
      // Limpieza de archivos temporales en caso de error
      if (req.file) {
        try {
          const uploadDir = path.join(__dirname, '..', '..', 'temp_uploads');
          const tempFiles = fs
            .readdirSync(uploadDir)
            .filter(f => f.startsWith(Date.now().toString().substring(0, 8)));
          for (const f of tempFiles) {
            fs.unlinkSync(path.join(uploadDir, f));
          }
        } catch (cleanupError) {
          console.error("Error cleaning up temporary files:", cleanupError);
        }
      }
      next(error);
    }
  }
);

export default router;