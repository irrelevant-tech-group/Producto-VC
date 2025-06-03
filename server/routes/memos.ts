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

// ====== NUEVAS RUTAS PARA APROBAR/RECHAZAR MEMOS ======

// Aprobar memo
router.post("/:id/approve", requireAuth, loadUserFromDb, async (req: Request, res: Response) => {
  try {
    const memoId = req.params.id;
    const { comments } = req.body;
    
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
   
   // Verificar permisos
   if (req.user?.role !== 'admin' && req.user?.email !== process.env.SUPERADMIN_EMAIL) {
     return res.status(403).json({ message: "Admin privileges required to approve memos" });
   }
   
   const updatedMemo = await storage.updateMemo(memoId, {
     status: 'approved',
     updatedBy: req.user?.id,
     metadata: {
       ...memo.metadata,
       approvedAt: new Date().toISOString(),
       approvedBy: req.user?.id,
       approvalComments: comments || ""
     }
   });
   
   // Registrar actividad
   await storage.createActivity({
     type: 'memo_approved',
     memoId,
     startupId: memo.startupId,
     userId: req.user?.id,
     content: `Investment memo approved${comments ? ': ' + comments : ''}`,
     metadata: {
       comments,
       previousStatus: memo.status
     },
     fundId: startup.fundId
   });
   
   res.json({
     message: "Memo approved successfully",
     memo: updatedMemo
   });
 } catch (error: any) {
   console.error("Error approving memo:", error);
   res.status(500).json({ message: error.message });
 }
});

// Rechazar memo
router.post("/:id/reject", requireAuth, loadUserFromDb, async (req: Request, res: Response) => {
 try {
   const memoId = req.params.id;
   const { comments } = req.body;
   
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
   
   if (req.user?.role !== 'admin' && req.user?.email !== process.env.SUPERADMIN_EMAIL) {
     return res.status(403).json({ message: "Admin privileges required to reject memos" });
   }
   
   const updatedMemo = await storage.updateMemo(memoId, {
     status: 'rejected',
     updatedBy: req.user?.id,
     metadata: {
       ...memo.metadata,
       rejectedAt: new Date().toISOString(),
       rejectedBy: req.user?.id,
       rejectionComments: comments || ""
     }
   });
   
   await storage.createActivity({
     type: 'memo_rejected',
     memoId,
     startupId: memo.startupId,
     userId: req.user?.id,
     content: `Investment memo rejected${comments ? ': ' + comments : ''}`,
     metadata: {
       comments,
       previousStatus: memo.status
     },
     fundId: startup.fundId
   });
   
   res.json({
     message: "Memo rejected",
     memo: updatedMemo
   });
 } catch (error: any) {
   console.error("Error rejecting memo:", error);
   res.status(500).json({ message: error.message });
 }
});

// Cambiar status de memo (ruta más general)
router.post("/:id/change-status", requireAuth, loadUserFromDb, async (req: Request, res: Response) => {
 try {
   const memoId = req.params.id;
   const { status, comments } = req.body;
   
   // Validar status
   const validStatuses = ['draft', 'review', 'final', 'approved', 'rejected'];
   if (!validStatuses.includes(status)) {
     return res.status(400).json({ 
       message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
     });
   }
   
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
   
   // Solo admin puede aprobar/rechazar
   if ((status === 'approved' || status === 'rejected') && 
       req.user?.role !== 'admin' && 
       req.user?.email !== process.env.SUPERADMIN_EMAIL) {
     return res.status(403).json({ message: "Admin privileges required for approval/rejection" });
   }
   
   // Preparar metadata según el status
   const metadata = { ...memo.metadata };
   const timestamp = new Date().toISOString();
   
   switch (status) {
     case 'approved':
       metadata.approvedAt = timestamp;
       metadata.approvedBy = req.user?.id;
       metadata.approvalComments = comments || "";
       break;
     case 'rejected':
       metadata.rejectedAt = timestamp;
       metadata.rejectedBy = req.user?.id;
       metadata.rejectionComments = comments || "";
       break;
     case 'review':
       metadata.submittedForReviewAt = timestamp;
       metadata.submittedBy = req.user?.id;
       break;
     case 'final':
       metadata.finalizedAt = timestamp;
       metadata.finalizedBy = req.user?.id;
       break;
   }
   
   const updatedMemo = await storage.updateMemo(memoId, {
     status,
     updatedBy: req.user?.id,
     metadata
   });
   
   // Registrar actividad
   await storage.createActivity({
     type: `memo_status_changed`,
     memoId,
     startupId: memo.startupId,
     userId: req.user?.id,
     content: `Memo status changed from ${memo.status} to ${status}${comments ? ': ' + comments : ''}`,
     metadata: {
       previousStatus: memo.status,
       newStatus: status,
       comments
     },
     fundId: startup.fundId
   });
   
   res.json({
     message: `Memo status changed to ${status}`,
     memo: updatedMemo
   });
 } catch (error: any) {
   console.error("Error changing memo status:", error);
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