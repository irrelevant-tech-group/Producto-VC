// server/routes/users.ts

import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { requireAuth, loadUserFromDb, requireAdmin } from "../middleware/auth";

const router = Router();

// Get current user's fund
router.get("/fund", requireAuth, loadUserFromDb, async (req: Request, res: Response) => {
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

// Get users for a specific fund (admin only)
router.get("/fund/:fundId", requireAuth, loadUserFromDb, requireAdmin, async (req: Request, res: Response) => {
  try {
    const fundId = req.params.fundId;
    const fund = await storage.getFund(fundId);
    
    if (!fund) {
      return res.status(404).json({ message: "Fund not found" });
    }
    
    // Get users for this fund
    const users = await storage.getUsersByFund(fundId);
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;