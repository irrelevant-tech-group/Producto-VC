// server/routes.ts

import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import * as z from "zod";
import * as path from "path";
import * as fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { fileURLToPath } from "url";
import { dirname as pathDirname } from "path";
import {
  insertStartupSchema,
  insertDocumentSchema,
  insertUserSchema
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

// ESM __dirname polyfill
const __filename = fileURLToPath(import.meta.url);
const __dirname = pathDirname(__filename);

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
  app.post(`${apiRouter}/auth/login`, async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      const user = await storage.getUserByUsername(username);
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      res.json({
        id: user.id,
        username: user.username,
        name: user.name,
        position: user.position
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Dashboard metrics
  app.get(`${apiRouter}/dashboard/metrics`, async (req: Request, res: Response) => {
    try {
      const metrics = await storage.getDashboardMetrics();
      res.json(metrics);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get(`${apiRouter}/dashboard/activities`, async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const activities = await storage.getRecentActivities(limit);
      res.json(activities);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Startup routes
  app.get(`${apiRouter}/startups`, async (req: Request, res: Response) => {
    try {
      const summaries = await storage.getStartupSummaries();
      res.json(summaries);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get(`${apiRouter}/startups/:id`, async (req: Request, res: Response) => {
    try {
      const startup = await storage.getStartup(req.params.id);
      if (!startup) {
        return res.status(404).json({ message: "Startup not found" });
      }
      res.json(startup);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post(`${apiRouter}/startups`, async (req: Request, res: Response) => {
    try {
      const data = validateBody(insertStartupSchema, req.body);
      const startup = await storage.createStartup(data);
      await storage.createActivity({
        type: 'startup_created',
        startupId: startup.id,
        userId: req.body.userId,
        content: `New startup "${startup.name}" added`
      });
      res.status(201).json(startup);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get(`${apiRouter}/startups/:id/due-diligence`, async (req: Request, res: Response) => {
    try {
      const progress = await storage.getDueDiligenceProgress(req.params.id);
      res.json(progress);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get(`${apiRouter}/startups/:id/alignment`, async (req: Request, res: Response) => {
    try {
      const alignmentScore = await analyzeStartupAlignment(req.params.id);
      res.json({ alignmentScore });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Document routes
  app.get(`${apiRouter}/startups/:id/documents`, async (req: Request, res: Response) => {
    try {
      const documents = await storage.getDocumentsByStartup(req.params.id);
      res.json(documents);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post(
    `${apiRouter}/documents/upload`,
    upload.single('file'),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Validar request
        if (!req.file) {
          return res.status(400).json({ message: "No file uploaded" });
        }

        const { startupId, type, name } = req.body;
        if (!startupId || !type) {
          return res.status(400).json({ message: "startupId and type are required" });
        }

        const startup = await storage.getStartup(startupId);
        if (!startup) {
          return res.status(404).json({ message: `Startup with ID ${startupId} not found` });
        }

        // Crear directorio temporal si no existe
        const uploadDir = path.join(__dirname, '..', 'temp_uploads');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        // Generar nombre único con UUID y extensión
        const fileExt = path.extname(req.file.originalname);
        const fileName = `${Date.now()}-${uuidv4()}${fileExt}`;
        const filePath = path.join(uploadDir, fileName);

        // Guardar archivo
        fs.writeFileSync(filePath, req.file.buffer);

        // URL simulada
        const fileUrl = `file://${filePath}`;

        // Crear documento con metadata
        const document = await storage.createDocument({
          startupId,
          name: name || req.file.originalname,
          type: type as any,
          fileUrl,
          fileType: req.file.mimetype,
          uploadedBy: req.body.userId ? parseInt(req.body.userId) : undefined,
          metadata: {
            originalName: req.file.originalname,
            size: req.file.size,
            uploadedAt: new Date().toISOString()
          }
        });

        // Log actividad de subida
        await storage.createActivity({
          type: 'document_uploaded',
          documentId: document.id,
          startupId,
          userId: req.body.userId ? parseInt(req.body.userId) : undefined,
          content: `Documento "${document.name}" subido`,
          metadata: {
            fileType: req.file.mimetype,
            fileSize: req.file.size
          }
        });

        // Iniciar procesamiento en background
        processDocument(document.id).catch(error => {
          console.error(`Error processing document ${document.id}:`, error);
        });

        // Respuesta inmediata
        res.status(201).json({
          ...document,
          message: "Documento subido. El procesamiento iniciará en breve."
        });
      } catch (error: any) {
        // Limpieza en caso de error
        if (req.file) {
          try {
            const uploadDir = path.join(__dirname, '..', 'temp_uploads');
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

  // AI Query route
  app.post(`${apiRouter}/ai/query`, async (req: Request, res: Response) => {
    try {
      const { startupId, question, includeSourceDocuments } = req.body;
      if (!question) {
        return res.status(400).json({ message: "Question is required" });
      }
      const isValidUUID = (id: string) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      const validStartupId = startupId && isValidUUID(startupId) ? startupId : null;
      try {
        await storage.createActivity({
          type: 'ai_query',
          startupId: validStartupId,
          userId: req.body.userId || null,
          content: question
        });
      } catch {
        // ignore
      }
      const response = await processQuery({ startupId: validStartupId, question, includeSourceDocuments });
      res.json(response);
    } catch (error: any) {
      console.error("Error processing AI query:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Memo routes
  app.get(`${apiRouter}/startups/:id/memos`, async (req: Request, res: Response) => {
    try {
      const memos = await storage.getMemosByStartup(req.params.id);
      res.json(memos);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get(`${apiRouter}/memos/:id`, async (req: Request, res: Response) => {
    try {
      const memo = await storage.getMemo(req.params.id);
      if (!memo) {
        return res.status(404).json({ message: "Memo not found" });
      }
      res.json(memo);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post(`${apiRouter}/startups/:id/memos/generate`, async (req: Request, res: Response) => {
    try {
      const startupId = req.params.id;
      const { sections } = req.body;
      const memo = await generateMemo(startupId, sections);
      res.status(201).json(memo);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch(`${apiRouter}/memos/:id`, async (req: Request, res: Response) => {
    try {
      const memoId = req.params.id;
      const { sections, status } = req.body;
      if (sections) {
        const updated = await updateMemoSections(memoId, sections);
        return res.json(updated);
      } else if (status) {
        const updated = await storage.updateMemo(memoId, { status });
        return res.json(updated);
      } else {
        return res.status(400).json({ message: "No updates specified" });
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post(`${apiRouter}/memos/:id/export/:format`, async (req: Request, res: Response) => {
    try {
      const memoId = req.params.id;
      const format = req.params.format as 'pdf' | 'docx' | 'slides';
      if (!['pdf', 'docx', 'slides'].includes(format)) {
        return res.status(400).json({ message: "Invalid format. Must be pdf, docx, or slides" });
      }
      const url = await exportMemo(memoId, format);
      res.json({ url });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
