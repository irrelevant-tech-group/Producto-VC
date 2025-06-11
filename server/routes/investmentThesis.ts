// server/routes/investmentThesis.ts

import { Router, Request, Response } from "express";
import { requireAuth, loadUserFromDb, requireAdmin } from "../middleware/auth";
import { investmentThesisService } from "../services/investmentThesis/thesisService";
import { InvestmentThesisRepository } from "../storage/repositories/investmentThesisRepository";
import { validateBody } from "./middlewares";
import { createInvestmentThesisBodySchema } from "@shared/schema"; // ✅ Usar el nuevo schema
import { storage } from "../storage";

const router = Router();
const thesisRepository = new InvestmentThesisRepository();

// Obtener tesis activa del fondo
router.get("/active", requireAuth, loadUserFromDb, async (req: Request, res: Response) => {
  try {
    if (!req.user?.fundId) {
      return res.status(400).json({ message: "User has no fund assigned" });
    }

    const thesis = await thesisRepository.getActiveThesis(req.user.fundId);
    
    if (!thesis) {
      return res.status(404).json({ message: "No active investment thesis found for this fund" });
    }
 
    res.json(thesis);
  } catch (error: any) {
    console.error("Error getting active thesis:", error);
    res.status(500).json({ message: error.message });
  }
});

// Obtener historial de tesis del fondo
router.get("/history", requireAuth, loadUserFromDb, async (req: Request, res: Response) => {
  try {
    if (!req.user?.fundId) {
      return res.status(400).json({ message: "User has no fund assigned" });
    }

    const history = await thesisRepository.getThesisHistory(req.user.fundId);
    res.json(history);
  } catch (error: any) {
    console.error("Error getting thesis history:", error);
    res.status(500).json({ message: error.message });
  }
});

// Crear nueva tesis (solo admin) - ✅ CORREGIDO CON NUEVO SCHEMA
router.post("/", requireAuth, loadUserFromDb, requireAdmin, async (req: Request, res: Response) => {
  try {
    console.log("📋 Creando nueva tesis de inversión");
    console.log("👤 Usuario:", req.user?.name, "FundId:", req.user?.fundId);
    
    if (!req.user?.fundId) {
      return res.status(400).json({ message: "User has no fund assigned" });
    }

    // ✅ Usar el nuevo schema que NO requiere fundId
    const validatedData = validateBody(createInvestmentThesisBodySchema, req.body);
    console.log("✅ Datos validados correctamente");
    
    // ✅ Construir el objeto completo para la base de datos
    const thesisData = {
      ...validatedData,
      fundId: req.user.fundId,           // Asignar automáticamente
      createdBy: req.user.id,            // Asignar automáticamente
      updatedBy: req.user.id,            // Asignar automáticamente
      isActive: true                     // Nueva tesis siempre activa por defecto
    };

    console.log("💾 Creando tesis con datos completos:", {
      name: thesisData.name,
      fundId: thesisData.fundId,
      createdBy: thesisData.createdBy
    });

    const thesis = await thesisRepository.createThesis(thesisData);
    console.log("✅ Tesis creada exitosamente:", thesis.id);

    // Registrar actividad
    await storage.createActivity({
      type: 'thesis_created',
      userId: req.user.id,
      content: `Nueva tesis de inversión creada: ${thesis.name}`,
      metadata: {
        thesisId: thesis.id,
        version: thesis.version
      },
      fundId: req.user.fundId
    });

    res.status(201).json(thesis);
  } catch (error: any) {
    console.error("❌ Error creating thesis:", error);
    
    // Mejorar el manejo de errores de validación
    if (error.message.includes("Validation error")) {
      return res.status(400).json({ 
        message: "Invalid data provided", 
        details: error.message,
        hint: "Check that all required fields are provided with correct data types"
      });
    }
    
    res.status(500).json({ 
      message: "Error creating investment thesis",
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Actualizar tesis existente (solo admin)
router.patch("/:id", requireAuth, loadUserFromDb, requireAdmin, async (req: Request, res: Response) => {
  try {
    const thesisId = req.params.id;
    
    // Verificar que la tesis pertenece al fondo del usuario
    const existingThesis = await thesisRepository.getThesisById(thesisId);
    if (!existingThesis) {
      return res.status(404).json({ message: "Investment thesis not found" });
    }
    
    if (existingThesis.fundId !== req.user?.fundId) {
      return res.status(403).json({ message: "No access to this investment thesis" });
    }

    // ✅ Para actualizaciones, validar solo si hay datos en el body
    let validatedData = req.body;
    if (Object.keys(req.body).length > 0) {
      // Validar solo los campos que vienen en el body
      const partialSchema = createInvestmentThesisBodySchema.partial();
      validatedData = validateBody(partialSchema, req.body);
    }

    const updateData = {
      ...validatedData,
      updatedBy: req.user.id,
      version: existingThesis.version + 1, // Incrementar versión
      updatedAt: new Date()
    };

    const updatedThesis = await thesisRepository.updateThesis(thesisId, updateData);

    // Registrar actividad
    await storage.createActivity({
      type: 'thesis_updated',
      userId: req.user.id,
      content: `Tesis de inversión actualizada: ${updatedThesis?.name}`,
      metadata: {
        thesisId: thesisId,
        previousVersion: existingThesis.version,
        newVersion: updateData.version
      },
      fundId: req.user.fundId
    });

    res.json(updatedThesis);
  } catch (error: any) {
    console.error("Error updating thesis:", error);
    res.status(500).json({ message: error.message });
  }
});

// Activar una tesis específica (solo admin)
router.post("/:id/activate", requireAuth, loadUserFromDb, requireAdmin, async (req: Request, res: Response) => {
  try {
    const thesisId = req.params.id;
    
    if (!req.user?.fundId) {
      return res.status(400).json({ message: "User has no fund assigned" });
    }

    // Verificar que la tesis pertenece al fondo
    const thesis = await thesisRepository.getThesisById(thesisId);
    if (!thesis || thesis.fundId !== req.user.fundId) {
      return res.status(404).json({ message: "Investment thesis not found or no access" });
    }

    const activatedThesis = await thesisRepository.activateThesis(thesisId, req.user.fundId);

    // Registrar actividad
    await storage.createActivity({
      type: 'thesis_activated',
      userId: req.user.id,
      content: `Tesis de inversión activada: ${activatedThesis?.name}`,
      metadata: {
        thesisId: thesisId,
        version: activatedThesis?.version
      },
      fundId: req.user.fundId
    });

    res.json(activatedThesis);
  } catch (error: any) {
    console.error("Error activating thesis:", error);
    res.status(500).json({ message: error.message });
  }
});

// Eliminar tesis
router.delete("/:id", requireAuth, loadUserFromDb, requireAdmin, async (req: Request, res: Response) => {
  try {
    const thesisId = req.params.id;
    
    // Verificar que la tesis pertenece al fondo del usuario
    const existingThesis = await thesisRepository.getThesisById(thesisId);
    if (!existingThesis) {
      return res.status(404).json({ message: "Investment thesis not found" });
    }
    
    if (existingThesis.fundId !== req.user?.fundId) {
      return res.status(403).json({ message: "No access to this investment thesis" });
    }

    // No permitir eliminar la tesis activa si es la única
    if (existingThesis.isActive) {
      const allTheses = await thesisRepository.getThesisHistory(req.user.fundId);
      if (allTheses.length === 1) {
        return res.status(400).json({ 
          message: "Cannot delete the only active thesis. Create a new one first." 
        });
      }
    }

    // En lugar de eliminar físicamente, marcar como inactiva
    await thesisRepository.updateThesis(thesisId, { 
      isActive: false,
      updatedBy: req.user.id 
    });

    // Registrar actividad
    await storage.createActivity({
      type: 'thesis_deleted',
      userId: req.user.id,
      content: `Tesis de inversión eliminada: ${existingThesis.name}`,
      metadata: {
        thesisId: thesisId,
        version: existingThesis.version
      },
      fundId: req.user.fundId
    });

    res.json({ message: "Investment thesis deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting thesis:", error);
    res.status(500).json({ message: error.message });
  }
});

// Previsualizar contexto generado por la tesis
router.get("/:id/context-preview", requireAuth, loadUserFromDb, async (req: Request, res: Response) => {
  try {
    const thesisId = req.params.id;
    
    const thesis = await thesisRepository.getThesisById(thesisId);
    if (!thesis) {
      return res.status(404).json({ message: "Investment thesis not found" });
    }
    
    if (thesis.fundId !== req.user?.fundId) {
      return res.status(403).json({ message: "No access to this investment thesis" });
    }

    // Generar preview del contexto
    const context = await investmentThesisService.buildThesisContext(thesis.fundId);
    const alignmentContext = await investmentThesisService.buildAlignmentContext(thesis.fundId);

    res.json({
      generalContext: context,
      alignmentContext: alignmentContext,
      thesisInfo: {
        name: thesis.name,
        version: thesis.version,
        isActive: thesis.isActive,
        lastUpdated: thesis.updatedAt
      }
    });
  } catch (error: any) {
    console.error("Error generating context preview:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;