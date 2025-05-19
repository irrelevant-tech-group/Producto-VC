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
import { googleCloudStorage } from "./services/storageService";

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

// Validation schema for AI query
const aiQuerySchema = z.object({
 startupId: z.string().optional(),
 question: z.string().min(1, "Question is required"),
 includeSourceDocuments: z.boolean().optional().default(true),
 userId: z.number().optional()
});

export async function registerRoutes(app: Express): Promise<Server> {
 // API prefix
 const apiRouter = '/api';

 // Authentication routes (sin cambios)
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

 // Dashboard metrics (sin cambios)
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

 // Startup routes - ACTUALIZADOS
 app.get(`${apiRouter}/startups`, async (req: Request, res: Response) => {
   try {
     const summaries = await storage.getStartupSummaries();
     res.json(summaries);
   } catch (error: any) {
     res.status(500).json({ message: error.message });
   }
 });

 // ACTUALIZADO - Incluye nuevos campos en la respuesta
 app.get(`${apiRouter}/startups/:id`, async (req: Request, res: Response) => {
  try {
    const startup = await storage.getStartup(req.params.id);
    if (!startup) {
      return res.status(404).json({ message: "Startup not found" });
    }
    
    // Para debug
    console.log("Raw startup from DB:", JSON.stringify(startup, null, 2));
    
    // Crear un objeto básico con los campos obligatorios
    const response = {
      id: startup.id,
      name: startup.name,
      vertical: startup.vertical || "",
      stage: startup.stage || "",
      location: startup.location || "",
      status: startup.status || "active",
      
      // Añadir campos opcionales de forma segura
      amountSought: startup.amountSought ? Number(startup.amountSought) : null,
      currency: startup.currency || "USD",
      primaryContact: startup.primaryContact || {},
      firstContactDate: startup.firstContactDate || null,
      description: startup.description || "",
      alignmentScore: startup.alignmentScore || null
    };
    
    res.json(response);
  } catch (error: any) {
    console.error(`Error fetching startup ${req.params.id}:`, error);
    res.status(500).json({ 
      message: "Error fetching startup details", 
      error: error.message 
    });
  }
});

 // ACTUALIZADO - Validar y leer nuevos campos del body
 app.post(`${apiRouter}/startups`, async (req: Request, res: Response) => {
   try {
     // Validar con el schema extendido que incluye los nuevos campos
     const data = validateBody(insertStartupSchema, req.body);
     
     // Convertir firstContactDate de string a Date
     if (data.firstContactDate) {
       data.firstContactDate = new Date(data.firstContactDate);
     }
     
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

 // NUEVO - Ruta para due diligence progress
 app.get(`${apiRouter}/startups/:id/due-diligence`, async (req: Request, res: Response) => {
   try {
     const progress = await storage.getDueDiligenceProgress(req.params.id);
     res.json(progress);
   } catch (error: any) {
     res.status(500).json({ message: error.message });
   }
 });

 // Resto de rutas sin cambios...
 app.get(`${apiRouter}/startups/:id/alignment`, async (req: Request, res: Response) => {
   try {
     const alignmentScore = await analyzeStartupAlignment(req.params.id);
     res.json({ alignmentScore });
   } catch (error: any) {
     res.status(500).json({ message: error.message });
   }
 });

 // Document routes (sin cambios significativos)
 app.get(`${apiRouter}/startups/:id/documents`, async (req: Request, res: Response) => {
   try {
     const documents = await storage.getDocumentsByStartup(req.params.id);
     res.json(documents);
   } catch (error: any) {
     res.status(500).json({ message: error.message });
   }
 });

 // ACTUALIZADO - Implementación de Google Cloud Storage
 app.post(
   `${apiRouter}/documents/upload`,
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
         const uploadDir = path.join(__dirname, '..', 'temp_uploads');
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
         uploadedBy: req.body.userId ? parseInt(req.body.userId) : undefined,
         metadata
       });

       // Registrar actividad
       await storage.createActivity({
         type: 'document_uploaded',
         documentId: document.id,
         startupId,
         userId: req.body.userId ? parseInt(req.body.userId) : undefined,
         content: `Documento "${document.name}" subido a ${metadata.storageProvider}`,
         metadata: {
           fileType: req.file.mimetype,
           fileSize: req.file.size,
           storageProvider: metadata.storageProvider
         }
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

 // AI Query route - MEJORADO con validación y persistencia
 app.post(`${apiRouter}/ai/query`, async (req: Request, res: Response) => {
   try {
     // Validar entrada con schema
     const validatedData = validateBody(aiQuerySchema, req.body);
     const { startupId, question, includeSourceDocuments, userId } = validatedData;
     
     // Validar UUID si se proporciona startupId
     const isValidUUID = (id: string) =>
       /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
     
     let validStartupId: string | undefined = undefined;
     if (startupId && startupId !== "all") {
       if (!isValidUUID(startupId)) {
         return res.status(400).json({ 
           message: "Invalid startupId format. Must be a valid UUID or 'all'." 
         });
       }
       validStartupId = startupId;
     }
     
     // Procesar consulta con OpenAI
     const startTime = Date.now();
     const response = await processQuery({ 
       startupId: validStartupId, 
       question, 
       includeSourceDocuments 
     });
     const processingTime = Date.now() - startTime;
     
     // Persistir consulta en base de datos
     try {
       await storage.saveQuery({
         question,
         answer: response.answer,
         sources: response.sources,
         startupId: validStartupId,
         userId,
         processingTimeMs: processingTime,
         metadata: {
           sourcesCount: response.sources?.length || 0,
           timestamp: new Date().toISOString(),
           includeSourceDocuments
         }
       });
     } catch (saveError) {
       console.error("Error guardando consulta:", saveError);
       // No fallar la respuesta por error de persistencia
     }
     
     // Registrar actividad
     try {
       await storage.createActivity({
         type: 'ai_query',
         startupId: validStartupId,
         userId: userId || null,
         content: question.length > 100 ? question.substring(0, 100) + "..." : question,
         metadata: {
           sourcesReturned: response.sources?.length || 0,
           processingTimeMs: processingTime
         }
       });
     } catch (activityError) {
       console.error("Error registrando actividad:", activityError);
       // No fallar la respuesta por error de actividad
     }
     
     // Devolver respuesta con estructura mejorada
     res.json({
       ...response,
       metadata: {
         processingTimeMs: processingTime,
         timestamp: new Date().toISOString(),
         sourcesCount: response.sources?.length || 0
       }
     });
     
   } catch (error: any) {
     console.error("Error processing AI query:", error);
     
     // Respuestas de error específicas
     if (error.message.includes("Validation error")) {
       return res.status(400).json({ 
         message: "Invalid request data", 
         details: error.message 
       });
     }
     
     if (error.message.includes("No se pudo generar embedding")) {
       return res.status(503).json({ 
         message: "AI service temporarily unavailable. Please try again." 
       });
     }
     
     res.status(500).json({ 
       message: "An error occurred while processing your query. Please try again.",
       error: process.env.NODE_ENV === 'development' ? error.message : undefined
     });
   }
 });

 // NUEVA ruta para obtener historial de consultas
 app.get(`${apiRouter}/ai/queries`, async (req: Request, res: Response) => {
   try {
     const limit = parseInt(req.query.limit as string) || 20;
     const startupId = req.query.startupId as string;
     const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
     
     const queries = await storage.getQueryHistory({
       limit,
       startupId: startupId === "all" ? undefined : startupId,
       userId
     });
     
     res.json(queries);
   } catch (error: any) {
     console.error("Error fetching query history:", error);
     res.status(500).json({ message: error.message });
   }
 });

 // Memo routes (sin cambios)
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