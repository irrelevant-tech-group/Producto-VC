// server/routes/memos.ts

import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { requireAuth, loadUserFromDb } from "../middleware/auth";
import { validateBody, isValidUUID } from "./middlewares";
import { updateMemoSchema, exportMemoSchema, generateMemoSchema } from "./validators";
import { generateMemo, updateMemoSections, exportMemo } from "../services/memoGenerator";

const router = Router();

// Get a specific memo
router.get("/:id", requireAuth, loadUserFromDb, async (req: Request, res: Response) => {
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

// Update a memo
router.patch("/:id", requireAuth, loadUserFromDb, async (req: Request, res: Response) => {
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
    
    const { sections, status } = validateBody(updateMemoSchema, req.body);
    
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

// Export a memo
router.post("/:id/export/:format", requireAuth, loadUserFromDb, async (req: Request, res: Response) => {
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

// Routes for startup memos
router.get("/startup/:id", requireAuth, loadUserFromDb, async (req: Request, res: Response) => {
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

// Generate memo for startup
router.post("/startup/:id/generate", requireAuth, loadUserFromDb, async (req: Request, res: Response) => {
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
    
    const { sections } = validateBody(generateMemoSchema, req.body);
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

export default router;