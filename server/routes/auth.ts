// server/routes/auth.ts

import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { requireAuth, loadUserFromDb } from "../middleware/auth";

const router = Router();

// Ruta para obtener datos del usuario actual
router.get("/me", requireAuth, loadUserFromDb, async (req: Request, res: Response) => {
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

// Verificación token con Clerk
router.post("/verify", async (req: Request, res: Response) => {
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
router.post("/login", async (req: Request, res: Response) => {
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

export default router;