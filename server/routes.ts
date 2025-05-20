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
  analyzeStartupAlignment,
  enhancedStartupAlignment
} from "./services/openai";
import { processDocument } from "./services/documentProcessor";
import {
  generateMemo,
  updateMemoSections,
  exportMemo
} from "./services/memoGenerator";
import { googleCloudStorage } from "./services/storageService";
import { requireAuth, loadUserFromDb, requireAdmin, requireFundAccess } from './middleware/auth';
import fundsRouter from './routes/funds';

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

 // Usar el router de fondos
 app.use(`${apiRouter}/funds`, fundsRouter);

 // Ruta pública para verificación de salud
 app.get(`${apiRouter}/health`, (req, res) => {
   res.json({ status: 'ok', version: '1.0.0' });
 });

 // Ruta para obtener datos del usuario actual
 app.get(`${apiRouter}/me`, requireAuth, loadUserFromDb, async (req: Request, res: Response) => {
   try {
     res.json({
       id: req.user?.id,
       name: req.user?.name,
       email: req.user?.email,
       role: req.user?.role,
       fundId: req.user?.fundId,
       orgName: req.user?.orgName,
       orgLogo: req.user?.orgLogo
     });
   } catch (error: any) {
     res.status(500).json({ message: error.message });
   }
 });

 // Ruta para obtener el fondo actual
 app.get(`${apiRouter}/fund`, requireAuth, loadUserFromDb, async (req: Request, res: Response) => {
   try {
     if (!req.user?.fundId) {
       return res.status(404).json({ message: "Fund not assigned" });
     }

     const fund = await storage.getFund(req.user.fundId);
     if (!fund) {
       return res.status(404).json({ message: "Fund not found" });
     }
     res.json(fund);
   } catch (error: any) {
     res.status(500).json({ message: error.message });
   }
 });

 // Reemplazar la ruta de login existente con verificación de Clerk
 app.post(`${apiRouter}/auth/verify`, async (req: Request, res: Response) => {
   try {
     const { token } = req.body;
     const clerk = req.app.locals.clerk;
     
     if (!token) {
       return res.status(400).json({ message: "Token is required" });
     }
     
     try {
       const session = await clerk.sessions.verifySession(token);
       const clerkUser = await clerk.users.getUser(session.userId);
       
       // Verificar en nuestra base de datos
       const primaryEmail = clerkUser.emailAddresses.find(
         email => email.id === clerkUser.primaryEmailAddressId
       )?.emailAddress;
       
       if (!primaryEmail) {
         return res.status(400).json({ message: "User has no primary email" });
       }
       
       let user = await storage.getUserByEmail(primaryEmail);
       
       if (!user) {
         // Primera vez que inicia sesión, vamos a crear el usuario
         user = await storage.createUser({
           username: primaryEmail.split('@')[0],
           email: primaryEmail,
           password: 'clerk-managed',
           name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim(),
           position: 'analyst',
           clerkId: clerkUser.id
         });
         
         // Si es el superadmin, asignar rol de admin
         if (primaryEmail === process.env.SUPERADMIN_EMAIL) {
           await storage.updateUser(user.id, { role: 'admin' });
           user.role = 'admin';
         }
       }
       
       res.json({
         id: user.id,
         name: user.name,
         email: user.email,
         role: user.role,
         clerkId: clerkUser.id
       });
     } catch (err) {
       console.error('Error verifying Clerk token:', err);
       return res.status(401).json({ message: "Invalid token" });
     }
   } catch (error: any) {
     res.status(500).json({ message: error.message });
   }
 });

 // Legacy auth route (deprecated but kept for compatibility)
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
 app.get(`${apiRouter}/dashboard/metrics`, requireAuth, loadUserFromDb, async (req: Request, res: Response) => {
   try {
     // Filtrar métricas por fondo si el usuario no es superadmin
     const fundId = req.user?.email === process.env.SUPERADMIN_EMAIL ? undefined : req.user?.fundId;
     const metrics = await storage.getDashboardMetrics(fundId);
     res.json(metrics);
   } catch (error: any) {
     res.status(500).json({ message: error.message });
   }
 });

 app.get(`${apiRouter}/dashboard/activities`, requireAuth, loadUserFromDb, async (req: Request, res: Response) => {
   try {
     const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
     // Filtrar actividades por fondo si el usuario no es superadmin
     const fundId = req.user?.email === process.env.SUPERADMIN_EMAIL ? undefined : req.user?.fundId;
     const activities = await storage.getRecentActivities(limit, fundId);
     res.json(activities);
   } catch (error: any) {
     res.status(500).json({ message: error.message });
   }
 });

 // Startup routes
 app.get(`${apiRouter}/startups`, requireAuth, loadUserFromDb, async (req: Request, res: Response) => {
   try {
     // Filtrar por fondo si no es superadmin
     const fundId = req.user?.email === process.env.SUPERADMIN_EMAIL ? undefined : req.user?.fundId;
     const summaries = await storage.getStartupSummaries(fundId);
     res.json(summaries);
   } catch (error: any) {
     res.status(500).json({ message: error.message });
   }
 });

 app.get(`${apiRouter}/startups/:id`, requireAuth, loadUserFromDb, async (req: Request, res: Response) => {
  try {
    const startup = await storage.getStartup(req.params.id);
    if (!startup) {
      return res.status(404).json({ message: "Startup not found" });
    }
    
    // Verificar acceso al startup
    const fundId = req.user?.fundId;
    if (fundId && 
        startup.fundId && 
        fundId !== startup.fundId && 
        req.user?.email !== process.env.SUPERADMIN_EMAIL) {
      return res.status(403).json({ message: "No access to this startup" });
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
      alignmentScore: startup.alignmentScore || null,
      fundId: startup.fundId || null
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

 app.post(`${apiRouter}/startups`, requireAuth, loadUserFromDb, async (req: Request, res: Response) => {
   try {
     // Validar con el schema extendido que incluye los nuevos campos
     const data = validateBody(insertStartupSchema, req.body);
     
     // Asignar el fundId del usuario actual si no viene en la request
     if (!data.fundId && req.user?.fundId) {
       data.fundId = req.user.fundId;
     }
     
     // Convertir firstContactDate de string a Date
     if (data.firstContactDate) {
       data.firstContactDate = new Date(data.firstContactDate);
     }
     
     const startup = await storage.createStartup(data);
     
     await storage.createActivity({
       type: 'startup_created',
       startupId: startup.id,
       userId: req.user?.id || req.body.userId,
       content: `New startup "${startup.name}" added`,
       fundId: startup.fundId
     });
     
     res.status(201).json(startup);
   } catch (error: any) {
     res.status(400).json({ message: error.message });
   }
 });

 // Due diligence progress route
 app.get(`${apiRouter}/startups/:id/due-diligence`, requireAuth, loadUserFromDb, async (req: Request, res: Response) => {
   try {
     const startupId = req.params.id;
     
     // Verificar acceso al startup
     const startup = await storage.getStartup(startupId);
     if (!startup) {
       return res.status(404).json({ message: "Startup not found" });
     }
     
     const fundId = req.user?.fundId;
     if (fundId && 
         startup.fundId && 
         fundId !== startup.fundId && 
         req.user?.email !== process.env.SUPERADMIN_EMAIL) {
       return res.status(403).json({ message: "No access to this startup" });
     }
     
     const progress = await storage.getDueDiligenceProgress(startupId);
     res.json(progress);
   } catch (error: any) {
     res.status(500).json({ message: error.message });
   }
 });

 app.get(`${apiRouter}/startups/:id/alignment`, requireAuth, loadUserFromDb, async (req: Request, res: Response) => {
   try {
     const startupId = req.params.id;
     
     // Verificar acceso al startup
     const startup = await storage.getStartup(startupId);
     if (!startup) {
       return res.status(404).json({ message: "Startup not found" });
     }
     
     const fundId = req.user?.fundId;
     if (fundId && 
         startup.fundId && 
         fundId !== startup.fundId && 
         req.user?.email !== process.env.SUPERADMIN_EMAIL) {
       return res.status(403).json({ message: "No access to this startup" });
     }
     
     const alignmentScore = await enhancedStartupAlignment(startupId);
     res.json({ alignmentScore });
   } catch (error: any) {
     res.status(500).json({ message: error.message });
   }
 });

 // Document routes
 app.get(`${apiRouter}/startups/:id/documents`, requireAuth, loadUserFromDb, async (req: Request, res: Response) => {
   try {
     const startupId = req.params.id;
     
     // Verificar acceso al startup
     const startup = await storage.getStartup(startupId);
     if (!startup) {
       return res.status(404).json({ message: "Startup not found" });
     }
     
     const fundId = req.user?.fundId;
     if (fundId && 
         startup.fundId && 
         fundId !== startup.fundId && 
         req.user?.email !== process.env.SUPERADMIN_EMAIL) {
       return res.status(403).json({ message: "No access to this startup" });
     }
     
     const documents = await storage.getDocumentsByStartup(startupId);
     res.json(documents);
   } catch (error: any) {
     res.status(500).json({ message: error.message });
   }
 });

 app.get(`${apiRouter}/documents/:id`, requireAuth, loadUserFromDb, async (req, res) => {
  try {
    const documentId = req.params.id;
    
    // Validar ID format
    const isValidUUID = (id: string) => {
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    };
    
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

 app.post(
   `${apiRouter}/documents/upload`,
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
 app.post(`${apiRouter}/ai/query`, requireAuth, loadUserFromDb, async (req: Request, res: Response) => {
   try {
     // Validar entrada con schema
     const validatedData = validateBody(aiQuerySchema, req.body);
     const { startupId, question, includeSourceDocuments } = validatedData;
     
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
       
       // Verificar acceso al startup
       if (startupId !== "all") {
         const startup = await storage.getStartup(startupId);
         if (!startup) {
           return res.status(404).json({ message: "Startup not found" });
         }
         
         const fundId = req.user?.fundId;
         if (fundId && 
             startup.fundId && 
             fundId !== startup.fundId && 
             req.user?.email !== process.env.SUPERADMIN_EMAIL) {
           return res.status(403).json({ message: "No access to this startup" });
         }
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
         userId: req.user?.id,
         processingTimeMs: processingTime,
         metadata: {
           sourcesCount: response.sources?.length || 0,
           timestamp: new Date().toISOString(),
           includeSourceDocuments
         },
         fundId: req.user?.fundId
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
         userId: req.user?.id,
         content: question.length > 100 ? question.substring(0, 100) + "..." : question,
         metadata: {
           sourcesReturned: response.sources?.length || 0,
           processingTimeMs: processingTime
         },
         fundId: req.user?.fundId
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

 // Historial de consultas
 app.get(`${apiRouter}/ai/queries`, requireAuth, loadUserFromDb, async (req: Request, res: Response) => {
   try {
     const limit = parseInt(req.query.limit as string) || 20;
     let startupId = req.query.startupId as string;
     
     // Si se solicitó un startup específico, verificar acceso
     if (startupId && startupId !== "all") {
       const startup = await storage.getStartup(startupId);
       if (!startup) {
         return res.status(404).json({ message: "Startup not found" });
       }
       
       const fundId = req.user?.fundId;
       if (fundId && 
           startup.fundId && 
           fundId !== startup.fundId && 
           req.user?.email !== process.env.SUPERADMIN_EMAIL) {
         return res.status(403).json({ message: "No access to this startup" });
       }
     }
     
     // Filtrar por fondo si el usuario no es superadmin
     const fundId = req.user?.email === process.env.SUPERADMIN_EMAIL ? undefined : req.user?.fundId;
     
     const queries = await storage.getQueryHistory({
       limit,
       startupId: startupId === "all" ? undefined : startupId,
       userId: req.user?.id,
       fundId
     });
     
     res.json(queries);
   } catch (error: any) {
     console.error("Error fetching query history:", error);
     res.status(500).json({ message: error.message });
   }
 });

 // Memo routes
 app.get(`${apiRouter}/startups/:id/memos`, requireAuth, loadUserFromDb, async (req: Request, res: Response) => {
   try {
     const startupId = req.params.id;
     
     // Verificar acceso al startup
     const startup = await storage.getStartup(startupId);
     if (!startup) {
       return res.status(404).json({ message: "Startup not found" });
     }
     
     const fundId = req.user?.fundId;
     if (fundId && 
         startup.fundId && 
         fundId !== startup.fundId && 
         req.user?.email !== process.env.SUPERADMIN_EMAIL) {
       return res.status(403).json({ message: "No access to this startup" });
     }
     
     const memos = await storage.getMemosByStartup(startupId);
     res.json(memos);
   } catch (error: any) {
     res.status(500).json({ message: error.message });
   }
 });

 app.get(`${apiRouter}/memos/:id`, requireAuth, loadUserFromDb, async (req: Request, res: Response) => {
   try {
     const memoId = req.params.id;
     
     const memo = await storage.getMemo(memoId);
     if (!memo) {
       return res.status(404).json({ message: "Memo not found" });
     }
     
     // Verificar acceso al startup
     const startup = await storage.getStartup(memo.startupId);
     if (!startup) {
       return res.status(404).json({ message: "Associated startup not found" });
     }
     
     const fundId = req.user?.fundId;
     if (fundId && 
         startup.fundId && 
         fundId !== startup.fundId && 
         req.user?.email !== process.env.SUPERADMIN_EMAIL) {
       return res.status(403).json({ message: "No access to this memo" });
     }
     
     res.json(memo);
   } catch (error: any) {
     res.status(500).json({ message: error.message });
   }
 });

 app.post(`${apiRouter}/startups/:id/memos/generate`, requireAuth, loadUserFromDb, async (req: Request, res: Response) => {
   try {
     const startupId = req.params.id;
     
     // Verificar acceso al startup
     const startup = await storage.getStartup(startupId);
     if (!startup) {
       return res.status(404).json({ message: "Startup not found" });
     }
     
     const fundId = req.user?.fundId;
     if (fundId && 
         startup.fundId && 
         fundId !== startup.fundId && 
         req.user?.email !== process.env.SUPERADMIN_EMAIL) {
       return res.status(403).json({ message: "No access to this startup" });
     }
     
     const { sections } = req.body;
     const memo = await generateMemo(startupId, sections);
     
     // Actualizar información del creador
     if (req.user) {
       await storage.updateMemo(memo.id, { 
        updatedBy: req.user.id,
        fundId: startup.fundId
      });
    }
    
    res.status(201).json(memo);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Nuevo endpoint para regenerar alignment score
app.post(`${apiRouter}/startups/:id/regenerate-alignment`, requireAuth, loadUserFromDb, async (req: Request, res: Response) => {
  try {
    const startupId = req.params.id;
    
    // Verificar acceso al startup
    const startup = await storage.getStartup(startupId);
    if (!startup) {
      return res.status(404).json({ message: "Startup not found" });
    }
    
    const fundId = req.user?.fundId;
    if (fundId && 
        startup.fundId && 
        fundId !== startup.fundId && 
        req.user?.email !== process.env.SUPERADMIN_EMAIL) {
      return res.status(403).json({ message: "No access to this startup" });
    }
    
    // Usar analyzeStartupAlignment en lugar de enhancedStartupAlignment si no la exportaste
    const alignmentResult = await enhancedStartupAlignment(startupId);
    
    // Registrar actividad
    await storage.createActivity({
      type: 'alignment_regenerated',
      startupId,
      userId: req.user?.id,
      content: `Alignment score regenerado manualmente para ${startup.name}`,
      metadata: {
        previousScore: startup.alignmentScore,
        newScore: alignmentResult.alignmentScore || alignmentResult.score, // Adaptarse al nombre que uses
        trigger: 'manual',
        triggeredBy: req.user?.name || 'unknown'
      },
      fundId: startup.fundId
    });
    
    res.json(alignmentResult);
  } catch (error: any) {
    console.error("Error regenerando alignment score:", error);
    res.status(500).json({ 
      message: "Error al regenerar alignment score", 
      details: error.message 
    });
  }
});

app.patch(`${apiRouter}/memos/:id`, requireAuth, loadUserFromDb, async (req: Request, res: Response) => {
  try {
    const memoId = req.params.id;
    
    // Verificar que el memo existe
    const memo = await storage.getMemo(memoId);
    if (!memo) {
      return res.status(404).json({ message: "Memo not found" });
    }
    
    // Verificar acceso al startup
    const startup = await storage.getStartup(memo.startupId);
    if (!startup) {
      return res.status(404).json({ message: "Associated startup not found" });
    }
    
    const fundId = req.user?.fundId;
    if (fundId && 
        startup.fundId && 
        fundId !== startup.fundId && 
        req.user?.email !== process.env.SUPERADMIN_EMAIL) {
      return res.status(403).json({ message: "No access to this memo" });
    }
    
    const { sections, status } = req.body;
    
    if (sections) {
      const updated = await updateMemoSections(memoId, sections);
      if (req.user) {
        await storage.updateMemo(memoId, { updatedBy: req.user.id });
      }
      return res.json(updated);
    } else if (status) {
      const updated = await storage.updateMemo(memoId, { 
        status,
        updatedBy: req.user?.id
      });
      return res.json(updated);
    } else {
      return res.status(400).json({ message: "No updates specified" });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

app.post(`${apiRouter}/memos/:id/export/:format`, requireAuth, loadUserFromDb, async (req: Request, res: Response) => {
  try {
    const memoId = req.params.id;
    const format = req.params.format as 'pdf' | 'docx' | 'slides';
    
    if (!['pdf', 'docx', 'slides'].includes(format)) {
      return res.status(400).json({ message: "Invalid format. Must be pdf, docx, or slides" });
    }
    
    // Verificar que el memo existe
    const memo = await storage.getMemo(memoId);
    if (!memo) {
      return res.status(404).json({ message: "Memo not found" });
    }
    
    // Verificar acceso al startup
    const startup = await storage.getStartup(memo.startupId);
    if (!startup) {
      return res.status(404).json({ message: "Associated startup not found" });
    }
    
    const fundId = req.user?.fundId;
    if (fundId && 
        startup.fundId && 
        fundId !== startup.fundId && 
        req.user?.email !== process.env.SUPERADMIN_EMAIL) {
      return res.status(403).json({ message: "No access to this memo" });
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