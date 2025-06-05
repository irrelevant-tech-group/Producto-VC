// server/routes/users.ts

import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { requireAuth, loadUserFromDb, requireAdmin } from "../middleware/auth";
import { clerkClient } from '@clerk/clerk-sdk-node';

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

// Create a new user in an organization
router.post("/", requireAuth, loadUserFromDb, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, email, position, role, fundId } = req.body;

    // Validate required fields
    if (!name || !email || !position || !role || !fundId) {
      return res.status(400).json({ 
        message: "Missing required fields. Please provide name, email, position, role, and fundId" 
      });
    }

    // Validate role
    const validRoles = ['admin', 'analyst', 'associate', 'partner'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ 
        message: "Invalid role. Must be one of: admin, analyst, associate, partner" 
      });
    }

    // Check if fund exists
    const fund = await storage.getFund(fundId);
    if (!fund) {
      return res.status(404).json({ message: "Fund not found" });
    }

    // Check if user already exists with this email
    const existingUser = await storage.getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ message: "User with this email already exists" });
    }
    
    // 1. Crear usuario en Clerk
    let clerkUser;
    try {
      clerkUser = await clerkClient.users.createUser({
        emailAddress: [
          
        ],
        password: 'Password22.-',
        firstName: name,
        publicMetadata: {
          position,
          role,
          fundId
        }
      });
    } catch (clerkError: any) {
      return res.status(500).json({ message: 'Error creating user in Clerk', details: clerkError.errors || clerkError.message });
    }
    // 3. Añadir el usuario a la organización
    await clerkClient.organizations.createOrganizationMembership({
      organizationId: 'org_2xLH04HA77W1PcUSPYetX2Pew5F',
      userId: clerkUser.id,
      role: 'org:'+role, // 'org:admin', 'org:member'
    });
    // 2. Guardar usuario en la base de datos local
    const newUser = await storage.createUser({
      name,
      email,
      position,
      role,
      fundId,
      username: email.split('@')[0], // Generate username from email
      password: '', // Password will be handled by Clerk
      clerkId: clerkUser.id, // Guardar el ID de Clerk
    });

    // 3. Crear registro de actividad
    await storage.createActivity({
      type: 'user_created',
      content: `New user ${name} created in ${fund.name}`,
      userId: req.user?.id,
      fundId,
      metadata: {
        newUserId: newUser.id,
        role
      }
    });

    res.status(201).json(newUser);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;