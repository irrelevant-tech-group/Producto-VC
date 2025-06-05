import { Router, Request, Response } from "express";
import { requireAuth, loadUserFromDb, requireAdmin } from "../middleware/auth";
import { DueDiligenceRepository } from "../storage/repositories/dueDiligenceRepository";
import { validateBody } from "./middlewares";
import { z } from "zod";

const router = Router();
const dueDiligenceRepository = new DueDiligenceRepository();

const createTemplateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  categories: z.array(z.object({
    key: z.string().min(1),
    name: z.string().min(1),
    required: z.number().min(0),
    importance: z.enum(['high', 'medium', 'low']),
    description: z.string(),
    order: z.number(),
    documentTypes: z.array(z.string()).optional(),
    isDefault: z.boolean().default(false)
  })).min(1, "At least one category is required")
});

router.get("/template/active", requireAuth, loadUserFromDb, async (req: Request, res: Response) => {
  try {
    if (!req.user?.fundId) {
      return res.status(400).json({ message: "User has no fund assigned" });
    }

    const template = await dueDiligenceRepository.getActiveTemplate(req.user.fundId);
    res.json(template);
  } catch (error: any) {
    console.error("Error getting active DD template:", error);
    res.status(500).json({ message: error.message });
  }
});

router.get("/templates", requireAuth, loadUserFromDb, async (req: Request, res: Response) => {
  try {
    if (!req.user?.fundId) {
      return res.status(400).json({ message: "User has no fund assigned" });
    }

    const templates = await dueDiligenceRepository.getTemplatesByFund(req.user.fundId);
    res.json(templates);
  } catch (error: any) {
    console.error("Error getting DD templates:", error);
    res.status(500).json({ message: error.message });
  }
});

router.post("/templates", requireAuth, loadUserFromDb, requireAdmin, async (req: Request, res: Response) => {
  try {
    if (!req.user?.fundId) {
      return res.status(400).json({ message: "User has no fund assigned" });
    }

    const validatedData = validateBody(createTemplateSchema, req.body);

    const templateData = {
      ...validatedData,
      fundId: req.user.fundId,
      createdBy: req.user.id
    };

    const template = await dueDiligenceRepository.createTemplate(templateData);
    res.status(201).json(template);
  } catch (error: any) {
    console.error("Error creating DD template:", error);
    res.status(500).json({ message: error.message });
  }
});

router.post("/templates/:id/activate", requireAuth, loadUserFromDb, requireAdmin, async (req: Request, res: Response) => {
  try {
    const templateId = req.params.id;

    if (!req.user?.fundId) {
      return res.status(400).json({ message: "User has no fund assigned" });
    }

    const activatedTemplate = await dueDiligenceRepository.activateTemplate(templateId, req.user.fundId);
    res.json(activatedTemplate);
  } catch (error: any) {
    console.error("Error activating DD template:", error);
    res.status(500).json({ message: error.message });
  }
});

router.get("/default-categories", requireAuth, loadUserFromDb, async (_req: Request, res: Response) => {
  try {
    const defaultCategories = dueDiligenceRepository.getDefaultCategories();
    res.json(defaultCategories);
  } catch (error: any) {
    console.error("Error getting default categories:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
