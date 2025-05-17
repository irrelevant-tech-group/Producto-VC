import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import * as z from "zod";
import * as path from "path";
import * as fs from "fs";
import {
  insertStartupSchema,
  insertDocumentSchema,
  insertUserSchema,
} from "@shared/schema";
import { 
  processQuery, 
  analyzeStartupAlignment 
} from "./services/openai";
import { processDocument } from "./services/documentProcessor";
import { 
  generateMemo, 
  updateMemoSections, 
  exportMemo 
} from "./services/memoGenerator";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB max file size
  },
});

// Helper for validating request body
function validateBody<T extends z.ZodTypeAny>(
  schema: T,
  body: unknown
): z.infer<T> {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new Error(`Validation error: ${result.error.message}`);
  }
  return result.data;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // API prefix
  const apiRouter = '/api';
  
  // Authentication routes
  app.post(`${apiRouter}/auth/login`, async (req, res) => {
    try {
      const { username, password } = req.body;
      
      // Basic auth for MVP
      const user = await storage.getUserByUsername(username);
      
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // In a real app, we would use proper authentication with JWT or sessions
      res.json({
        id: user.id,
        username: user.username,
        name: user.name,
        position: user.position
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Dashboard metrics
  app.get(`${apiRouter}/dashboard/metrics`, async (req, res) => {
    try {
      const metrics = await storage.getDashboardMetrics();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.get(`${apiRouter}/dashboard/activities`, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const activities = await storage.getRecentActivities(limit);
      res.json(activities);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Startup routes
  app.get(`${apiRouter}/startups`, async (req, res) => {
    try {
      const summaries = await storage.getStartupSummaries();
      res.json(summaries);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.get(`${apiRouter}/startups/:id`, async (req, res) => {
    try {
      const startup = await storage.getStartup(req.params.id);
      
      if (!startup) {
        return res.status(404).json({ message: "Startup not found" });
      }
      
      res.json(startup);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.post(`${apiRouter}/startups`, async (req, res) => {
    try {
      const data = validateBody(insertStartupSchema, req.body);
      const startup = await storage.createStartup(data);
      
      // Log activity
      await storage.createActivity({
        type: 'startup_created',
        startupId: startup.id,
        userId: req.body.userId,
        content: `New startup "${startup.name}" added`
      });
      
      res.status(201).json(startup);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });
  
  app.get(`${apiRouter}/startups/:id/due-diligence`, async (req, res) => {
    try {
      const progress = await storage.getDueDiligenceProgress(req.params.id);
      res.json(progress);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.get(`${apiRouter}/startups/:id/alignment`, async (req, res) => {
    try {
      const alignmentScore = await analyzeStartupAlignment(req.params.id);
      res.json({ alignmentScore });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Document routes
  app.get(`${apiRouter}/startups/:id/documents`, async (req, res) => {
    try {
      const documents = await storage.getDocumentsByStartup(req.params.id);
      res.json(documents);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.post(`${apiRouter}/documents/upload`, upload.single('file'), async (req, res, next) => {
    try {
      // Validar request
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const { startupId, type, name } = req.body;
      
      if (!startupId || !type) {
        return res.status(400).json({ message: "startupId and type are required" });
      }
      
      // Verificar que el startup existe
      const startup = await storage.getStartup(startupId);
      if (!startup) {
        return res.status(404).json({ message: `Startup with ID ${startupId} not found` });
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
      });
      
      // Registrar la actividad
      await storage.createActivity({
        type: 'document_uploaded',
        documentId: document.id,
        startupId,
        userId: req.body.userId ? parseInt(req.body.userId) : undefined,
        content: `Uploaded document "${document.name}"`
      });
      
      // Iniciar el procesamiento del documento en segundo plano
      processDocument(document.id).catch(error => {
        console.error(`Error processing document ${document.id}:`, error);
      });
      
      // Retornar respuesta exitosa
      res.status(201).json(document);
      
    } catch (error) {
      // Limpiar archivos temporales en caso de error
      if (req.file) {
        try {
          const uploadDir = path.join(__dirname, '..', 'temp_uploads');
          const files = fs.readdirSync(uploadDir).filter(file => 
            file.startsWith(Date.now().toString().substring(0, 8))
          );
          
          for (const file of files) {
            fs.unlinkSync(path.join(uploadDir, file));
          }
        } catch (cleanupError) {
          console.error("Error cleaning up temporary files:", cleanupError);
        }
      }
      
      next(error);
    }
  });
  
  // AI Query route
  app.post(`${apiRouter}/ai/query`, async (req, res) => {
    try {
      const { startupId, question, includeSourceDocuments } = req.body;
      
      if (!question) {
        return res.status(400).json({ message: "Question is required" });
      }
      
      // Validar que startupId es un UUID válido si está presente
      const isValidUUID = (id: string) => {
        return id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      };
      
      // Log the query activity before processing (sólo si el ID es válido o undefined)
      const validStartupId = startupId && isValidUUID(startupId) ? startupId : null;
      
      try {
        await storage.createActivity({
          type: 'ai_query',
          startupId: validStartupId,
          userId: req.body.userId || null,
          content: question,
        });
      } catch (activityError) {
        console.error("Error logging activity:", activityError);
        // Continuamos aunque falle el registro de actividad
      }
      
      const response = await processQuery({
        startupId: validStartupId,
        question,
        includeSourceDocuments
      });
      
      res.json(response);
    } catch (error) {
      console.error("Error processing AI query:", error);
      res.status(500).json({ message: error.message });
    }
  });
  
  // Memo routes
  app.get(`${apiRouter}/startups/:id/memos`, async (req, res) => {
    try {
      const memos = await storage.getMemosByStartup(req.params.id);
      res.json(memos);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.get(`${apiRouter}/memos/:id`, async (req, res) => {
    try {
      const memo = await storage.getMemo(req.params.id);
      
      if (!memo) {
        return res.status(404).json({ message: "Memo not found" });
      }
      
      res.json(memo);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.post(`${apiRouter}/startups/:id/memos/generate`, async (req, res) => {
    try {
      const startupId = req.params.id;
      const { sections } = req.body;
      
      const memo = await generateMemo(startupId, sections);
      res.status(201).json(memo);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.patch(`${apiRouter}/memos/:id`, async (req, res) => {
    try {
      const memoId = req.params.id;
      const { sections, status } = req.body;
      
      if (sections) {
        // Update specific sections
        const updatedMemo = await updateMemoSections(memoId, sections);
        return res.json(updatedMemo);
      } else if (status) {
        // Update memo status
        const updatedMemo = await storage.updateMemo(memoId, { status });
        return res.json(updatedMemo);
      } else {
        return res.status(400).json({ message: "No updates specified" });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.post(`${apiRouter}/memos/:id/export/:format`, async (req, res) => {
    try {
      const memoId = req.params.id;
      const format = req.params.format as 'pdf' | 'docx' | 'slides';
      
      if (!['pdf', 'docx', 'slides'].includes(format)) {
        return res.status(400).json({ message: "Invalid format. Must be pdf, docx, or slides" });
      }
      
      const url = await exportMemo(memoId, format);
      res.json({ url });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}