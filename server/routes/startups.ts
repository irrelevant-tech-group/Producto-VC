// server/routes/startups.ts

import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { requireAuth, loadUserFromDb } from "../middleware/auth";
import { validateBody, isValidUUID } from "./middlewares";
import { insertStartupSchema } from "@shared/schema";
import { enhancedStartupAlignment } from "../services/openai";
import { generateMemo } from "../services/memoGenerator";

const router = Router();

// Get all startups
router.get("/", requireAuth, loadUserFromDb, async (req: Request, res: Response) => {
  try {
    // Filtrar por fondo si no es superadmin
    const fundId = req.user?.email === process.env.SUPERADMIN_EMAIL ? undefined : req.user?.fundId;
    const summaries = await storage.getStartupSummaries(fundId);
    res.json(summaries);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Get specific startup
router.get("/:id", requireAuth, loadUserFromDb, async (req: Request, res: Response) => {
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

// Create startup
router.post("/", requireAuth, loadUserFromDb, async (req: Request, res: Response) => {
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

// Get due diligence progress
router.get("/:id/due-diligence", requireAuth, loadUserFromDb, async (req: Request, res: Response) => {
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

// Get alignment score
router.get("/:id/alignment", requireAuth, loadUserFromDb, async (req: Request, res: Response) => {
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

// Get documents for startup
router.get("/:id/documents", requireAuth, loadUserFromDb, async (req: Request, res: Response) => {
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

// Regenerate alignment score
router.post("/:id/regenerate-alignment", requireAuth, loadUserFromDb, async (req: Request, res: Response) => {
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
    
    const alignmentResult = await enhancedStartupAlignment(startupId);
    
    // Registrar actividad
    await storage.createActivity({
      type: 'alignment_regenerated',
      startupId,
      userId: req.user?.id,
      content: `Alignment score regenerado manualmente para ${startup.name}`,
      metadata: {
        previousScore: startup.alignmentScore,
        newScore: alignmentResult.alignmentScore || alignmentResult.score,
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

// ====== MEMOS ROUTES ======

// Get memos for startup
router.get("/:id/memos", requireAuth, loadUserFromDb, async (req: Request, res: Response) => {
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

// Generate memo for a startup
router.post("/:id/memos/generate", requireAuth, loadUserFromDb, async (req: Request, res: Response) => {
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

// ====== ADDITIONAL UTILITY ROUTES ======

// Update startup
router.patch("/:id", requireAuth, loadUserFromDb, async (req: Request, res: Response) => {
  try {
    const startupId = req.params.id;
    
    // Verificar que el startup existe
    const startup = await storage.getStartup(startupId);
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
    
    // Filtrar campos actualizables
    const allowedFields = [
      'name', 'vertical', 'stage', 'location', 'status',
      'amountSought', 'currency', 'primaryContact', 'description'
    ];
    
    const updates: any = {};
    for (const field of allowedFields) {
      if (field in req.body) {
        updates[field] = req.body[field];
      }
    }
    
    // Convertir firstContactDate si está presente
    if ('firstContactDate' in req.body) {
      updates.firstContactDate = req.body.firstContactDate ? new Date(req.body.firstContactDate) : null;
    }
    
    // Realizar la actualización
    const updatedStartup = await storage.updateStartup(startupId, updates);
    
    // Registrar actividad
    await storage.createActivity({
      type: 'startup_updated',
      startupId,
      userId: req.user?.id,
      content: `Startup "${startup.name}" updated`,
      metadata: {
        updatedFields: Object.keys(updates)
      },
      fundId: startup.fundId
    });
    
    res.json(updatedStartup);
  } catch (error: any) {
    console.error(`Error updating startup ${req.params.id}:`, error);
    res.status(500).json({ 
      message: "Error updating startup details", 
      error: error.message 
    });
  }
});

// Delete/Archive startup
router.delete("/:id", requireAuth, loadUserFromDb, async (req: Request, res: Response) => {
  try {
    const startupId = req.params.id;
    
    // Verificar que el startup existe
    const startup = await storage.getStartup(startupId);
    if (!startup) {
      return res.status(404).json({ message: "Startup not found" });
    }
    
    // Verificar acceso al startup (solo admin puede eliminar)
    if (req.user?.role !== 'admin' && req.user?.email !== process.env.SUPERADMIN_EMAIL) {
      return res.status(403).json({ message: "Admin privileges required to delete startups" });
    }
    
    // En lugar de eliminar, marcamos como archivado
    const updatedStartup = await storage.updateStartup(startupId, {
      status: 'archived',
      archivedAt: new Date(),
      archivedBy: req.user?.id
    });
    
    // Registrar actividad
    await storage.createActivity({
      type: 'startup_archived',
      startupId,
      userId: req.user?.id,
      content: `Startup "${startup.name}" archived`,
      fundId: startup.fundId
    });
    
    res.json({
      message: `Startup "${startup.name}" has been archived`,
      startup: updatedStartup
    });
  } catch (error: any) {
    console.error(`Error archiving startup ${req.params.id}:`, error);
    res.status(500).json({ 
      message: "Error archiving startup", 
      error: error.message 
    });
  }
});

export default router;