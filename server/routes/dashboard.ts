// server/routes/dashboard.ts

import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { requireAuth, loadUserFromDb } from "../middleware/auth";

const router = Router();

// Dashboard metrics
router.get("/metrics", requireAuth, loadUserFromDb, async (req: Request, res: Response) => {
  try {
    // Filtrar métricas por fondo si el usuario no es superadmin
    const fundId = req.user?.email === process.env.SUPERADMIN_EMAIL ? undefined : req.user?.fundId;
    const metrics = await storage.getDashboardMetrics(fundId);
    res.json(metrics);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/activities", requireAuth, loadUserFromDb, async (req: Request, res: Response) => {
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

export default router;