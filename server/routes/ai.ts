// server/routes/ai.ts

import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { requireAuth, loadUserFromDb } from "../middleware/auth";
import { validateBody, isValidUUID } from "./middlewares";
import { aiQuerySchema } from "./validators";
import { processQuery } from "../services/openai";
import { processQueryWithThesis } from "../services/openai/enhancedQueryProcessor";

const router = Router();

// AI Query route
router.post("/query", requireAuth, loadUserFromDb, async (req: Request, res: Response) => {
  try {
    // Validar entrada con schema
    const validatedData = validateBody(aiQuerySchema, req.body);
    const { startupId, question, includeSourceDocuments } = validatedData;
    
    // Validar UUID si se proporciona startupId
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
    const response = await processQueryWithThesis({ 
      startupId: validStartupId, 
      question, 
      includeSourceDocuments 
    }, req.user?.fundId);
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

// Query history
router.get("/queries", requireAuth, loadUserFromDb, async (req: Request, res: Response) => {
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

export default router;