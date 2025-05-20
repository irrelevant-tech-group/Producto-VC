// server/routes/funds.ts

import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { requireAuth, loadUserFromDb, requireAdmin } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';
import { eq, desc } from 'drizzle-orm';
import { db } from '../db';
import { funds, users } from '@shared/schema';

const router = Router();

// Obtener todos los fondos (solo admin)
router.get('/', requireAuth, loadUserFromDb, requireAdmin, async (req: Request, res: Response) => {
  try {
    // Consultar fondos en la base de datos
    const allFunds = await db.select().from(funds).orderBy(desc(funds.createdAt));
    
    // Enriquecer con datos de Clerk si es posible
    const clerkClient = req.app.locals.clerk;
    const enrichedFunds = await Promise.all(allFunds.map(async (fund) => {
      if (fund.clerkOrgId) {
        try {
          const clerkOrg = await clerkClient.organizations.getOrganization({
            organizationId: fund.clerkOrgId
          });
          
          return {
            ...fund,
            clerkData: {
              name: clerkOrg.name,
              slug: clerkOrg.slug,
              imageUrl: clerkOrg.imageUrl
            }
          };
        } catch (err) {
          console.error(`Error getting Clerk org for fund ${fund.id}:`, err);
          return fund;
        }
      }
      return fund;
    }));
    
    res.json(enrichedFunds);
  } catch (error) {
    console.error('Error getting funds:', error);
    res.status(500).json({ message: 'Error getting funds' });
  }
});

// Obtener un fondo específico
router.get('/:id', requireAuth, loadUserFromDb, async (req: Request, res: Response) => {
  try {
    const fund = await storage.getFund(req.params.id);
    
    if (!fund) {
      return res.status(404).json({ message: 'Fund not found' });
    }
    
    // Si el usuario no es admin y no pertenece a este fondo, denegar acceso
    if (req.user?.role !== 'admin' && req.user?.fundId !== fund.id && 
        req.user?.email !== process.env.SUPERADMIN_EMAIL) {
      return res.status(403).json({ message: 'Access denied to this fund' });
    }
    
    // Obtener datos de Clerk si está disponible
    let clerkOrgData = null;
    if (fund.clerkOrgId) {
      try {
        const clerkClient = req.app.locals.clerk;
        const clerkOrg = await clerkClient.organizations.getOrganization({
          organizationId: fund.clerkOrgId
        });
        
        clerkOrgData = {
          name: clerkOrg.name,
          slug: clerkOrg.slug,
          imageUrl: clerkOrg.imageUrl,
          createdAt: clerkOrg.createdAt
        };
      } catch (err) {
        console.warn(`Could not get Clerk org data for fund ${fund.id}:`, err);
      }
    }
    
    res.json({
      ...fund,
      clerkData: clerkOrgData
    });
  } catch (error) {
    console.error('Error getting fund:', error);
    res.status(500).json({ message: 'Error getting fund' });
  }
});

// Crear un nuevo fondo (solo admin)
router.post('/', requireAuth, loadUserFromDb, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, slug, description, logoUrl } = req.body;
    
    if (!name || !slug) {
      return res.status(400).json({ message: 'Name and slug are required' });
    }
    
    // Crear organización en Clerk
    let clerkOrg;
    try {
      const clerkClient = req.app.locals.clerk;
      clerkOrg = await clerk.organizations.createOrganization({
        name,
        slug,
        createdBy: req.user?.clerkId
      });
      
      console.log(`Created Clerk organization: ${clerkOrg.id}`);
    } catch (clerkError) {
      console.error('Error creating Clerk organization:', clerkError);
      return res.status(500).json({ 
        message: 'Failed to create organization in Clerk',
        details: clerkError.message
      });
    }
    
    // Crear fondo en nuestra base de datos
    const fund = await storage.createFund({
      id: uuidv4(),
      name,
      slug,
      clerkOrgId: clerkOrg.id,
      logoUrl: logoUrl || null,
      description: description || null,
      createdBy: req.user?.id
    });
    
    // Añadir el usuario actual a la organización en Clerk
    try {
      const clerkClient = req.app.locals.clerk;
      await clerk.organizationMemberships.createOrganizationMembership({
        organizationId: clerkOrg.id,
        userId: req.user?.clerkId,
        role: 'admin'
      });
    } catch (membershipError) {
      console.warn('Error adding user to Clerk organization:', membershipError);
      // Continuar a pesar del error
    }
    
    // Registrar actividad
    await storage.createActivity({
      type: 'fund_created',
      userId: req.user?.id,
      content: `Created new fund: ${name}`,
      metadata: {
        fundId: fund.id,
        clerkOrgId: clerkOrg.id
      }
    });
    
    res.status(201).json(fund);
  } catch (error) {
    console.error('Error creating fund:', error);
    res.status(500).json({ message: 'Error creating fund' });
  }
});

// Actualizar un fondo (solo admin)
router.patch('/:id', requireAuth, loadUserFromDb, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, description, logoUrl } = req.body;
    const fundId = req.params.id;
    
    // Obtener el fondo actual
    const fund = await storage.getFund(fundId);
    
    if (!fund) {
      return res.status(404).json({ message: 'Fund not found' });
    }
    
    // Actualizar organización en Clerk si tenemos un clerkOrgId
    if (fund.clerkOrgId && name) {
      try {
        const clerkClient = req.app.locals.clerk;
        await clerk.organizations.updateOrganization({
          organizationId: fund.clerkOrgId,
          name
        });
      } catch (clerkError) {
        console.warn('Error updating Clerk organization:', clerkError);
        // Continuar a pesar del error
      }
    }
    
    // Actualizar en nuestra base de datos
    const updatedFund = await storage.updateFund(fundId, {
      name: name || fund.name,
      description: description !== undefined ? description : fund.description,
      logoUrl: logoUrl !== undefined ? logoUrl : fund.logoUrl,
      updatedAt: new Date()
    });
    
    // Registrar actividad
    await storage.createActivity({
      type: 'fund_updated',
      userId: req.user?.id,
      content: `Updated fund: ${fund.name}`,
      metadata: {
        fundId,
        updates: Object.keys(req.body).join(', ')
      }
    });
    
    res.json(updatedFund);
  } catch (error) {
    console.error('Error updating fund:', error);
    res.status(500).json({ message: 'Error updating fund' });
  }
});

// Obtener miembros de un fondo
router.get('/:id/members', requireAuth, loadUserFromDb, async (req: Request, res: Response) => {
  try {
    const fundId = req.params.id;
    
    // Verificar acceso
    if (req.user?.role !== 'admin' && req.user?.fundId !== fundId && 
        req.user?.email !== process.env.SUPERADMIN_EMAIL) {
      return res.status(403).json({ message: 'Access denied to this fund' });
    }
    
    // Obtener fondo
    const fund = await storage.getFund(fundId);
    
    if (!fund) {
      return res.status(404).json({ message: 'Fund not found' });
    }
    
    // Obtener usuarios del fondo en nuestra base de datos
    const fundUsers = await db
      .select()
      .from(users)
      .where(eq(users.fundId, fundId));
    
    // Si tenemos el clerkOrgId, obtener miembros de Clerk
    let clerkMembers = [];
    if (fund.clerkOrgId) {
      try {
        const clerkClient = req.app.locals.clerk;
        const memberships = await clerk.organizationMemberships.getOrganizationMembershipList({
          organizationId: fund.clerkOrgId
        });
        
        clerkMembers = memberships.data.map(m => ({
          userId: m.publicUserData.userId,
          role: m.role,
          name: `${m.publicUserData.firstName || ''} ${m.publicUserData.lastName || ''}`.trim()
        }));
      } catch (clerkError) {
        console.warn('Error getting Clerk organization members:', clerkError);
      }
    }
    
    // Combinar datos
    const members = fundUsers.map(user => {
      const clerkMember = clerkMembers.find(m => m.userId === user.clerkId);
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        position: user.position,
        clerkId: user.clerkId,
        clerkRole: clerkMember?.role,
        lastActive: user.updatedAt
      };
    });
    
    res.json(members);
  } catch (error) {
    console.error('Error getting fund members:', error);
    res.status(500).json({ message: 'Error getting fund members' });
  }
});

// Añadir usuario al fondo
router.post('/:id/members', requireAuth, loadUserFromDb, requireAdmin, async (req: Request, res: Response) => {
  try {
    const fundId = req.params.id;
    const { email, role, position } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    
    // Verificar si el fondo existe
    const fund = await storage.getFund(fundId);
    if (!fund) {
      return res.status(404).json({ message: 'Fund not found' });
    }
    
    // Verificar si ya existe usuario con este email
    let user = await storage.getUserByEmail(email);
    
    // Si existe, actualizar su fundId
    if (user) {
      await storage.updateUser(user.id, { 
        fundId,
        role: role || user.role,
        position: position || user.position
      });
      
      // Si tenemos clerkId y el fondo tiene clerkOrgId, añadir a la organización
      if (user.clerkId && fund.clerkOrgId) {
        try {
          const clerkClient = req.app.locals.clerk;
          // Verificar si ya es miembro
          const memberships = await clerk.organizationMemberships.getOrganizationMembershipList({
            organizationId: fund.clerkOrgId
          });
          
          const isMember = memberships.data.some(m => m.publicUserData.userId === user.clerkId);
          
          if (!isMember) {
            await clerk.organizationMemberships.createOrganizationMembership({
              organizationId: fund.clerkOrgId,
              userId: user.clerkId,
              role: role || 'basic_member'
            });
          }
        } catch (clerkError) {
          console.warn('Error adding user to Clerk organization:', clerkError);
          // Continuar a pesar del error
        }
      }
      
      // Registrar actividad
      await storage.createActivity({
        type: 'user_added_to_fund',
        userId: req.user?.id,
        content: `User ${user.name} (${email}) added to fund ${fund.name}`,
        metadata: {
          fundId,
          targetUserId: user.id,
          role: role || user.role
        }
      });
      
      return res.json({
        message: 'User added to fund',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: role || user.role,
          position: position || user.position
        }
      });
    }
    
    // Si no existe, intentar invitar al usuario
    // Esto dependerá de si queremos crear un usuario pendiente o usar la funcionalidad de Clerk para invitaciones
    
    const clerkClient = req.app.locals.clerk;
    
    try {
      // Invitar usuario a Clerk
      const invitation = await clerk.invitations.createInvitation({
        emailAddress: email,
        publicMetadata: {
          role: role || 'analyst',
          fundId: fundId
        },
        redirectUrl: `${process.env.APP_URL || 'http://localhost:3000'}/onboarding`
      });
      
      // Añadir a la organización si el fondo tiene clerkOrgId
      if (fund.clerkOrgId) {
        await clerk.invitations.setOrganizationInvitation(
          invitation.id,
          {
            organizationId: fund.clerkOrgId,
            role: role || 'basic_member'
          });
      }
      
      // Crear usuario pendiente en nuestra base de datos
      const newUser = await storage.createUser({
        username: email.split('@')[0],
        email: email,
        password: 'pending-activation',
        name: email.split('@')[0],
        position: position || 'New Member',
        role: role || 'analyst',
        fundId: fundId,
        status: 'pending'
      });
      
      // Registrar actividad
      await storage.createActivity({
        type: 'user_invited',
        userId: req.user?.id,
        content: `User ${email} invited to fund ${fund.name}`,
        metadata: {
          fundId,
          invitationId: invitation.id,
          role: role || 'analyst'
        }
      });
      
      res.status(201).json({
        message: 'User invited to fund',
        user: {
          id: newUser.id,
          email: newUser.email,
          role: newUser.role,
          position: newUser.position,
          status: 'pending'
        },
        invitation: {
          id: invitation.id,
          status: invitation.status
        }
      });
    } catch (inviteError) {
      console.error('Error inviting user:', inviteError);
      res.status(500).json({ 
        message: 'Error inviting user',
        details: inviteError.message
      });
    }
  } catch (error) {
    console.error('Error adding member to fund:', error);
    res.status(500).json({ message: 'Error adding member to fund' });
  }
});

// Eliminar usuario del fondo
router.delete('/:fundId/members/:userId', requireAuth, loadUserFromDb, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { fundId, userId } = req.params;
    
    // Verificar si el fondo existe
    const fund = await storage.getFund(fundId);
    if (!fund) {
      return res.status(404).json({ message: 'Fund not found' });
    }
    
    // Verificar si el usuario existe
    const user = await storage.getUser(parseInt(userId));
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Verificar que el usuario pertenece a este fondo
    if (user.fundId !== fundId) {
      return res.status(400).json({ message: 'User is not a member of this fund' });
    }
    
    // No permitir eliminar al propio usuario
    if (user.id === req.user?.id) {
      return res.status(400).json({ message: 'Cannot remove yourself from the fund' });
    }
    
    // No permitir eliminar al superadmin
    if (user.email === process.env.SUPERADMIN_EMAIL) {
      return res.status(400).json({ message: 'Cannot remove the super admin' });
    }
    
    // Actualizar usuario para desvincularlo del fondo
    await storage.updateUser(user.id, { fundId: null });
    
    // Si tenemos clerkId y el fondo tiene clerkOrgId, remover de la organización
    if (user.clerkId && fund.clerkOrgId) {
      try {
        const clerkClient = req.app.locals.clerk;
        
        // Buscar membresía
        const memberships = await clerk.organizationMemberships.getOrganizationMembershipList({
          organizationId: fund.clerkOrgId
        });
        
        const membership = memberships.data.find(m => m.publicUserData.userId === user.clerkId);
        
        if (membership) {
          await clerk.organizationMemberships.deleteOrganizationMembership({
            organizationMembershipId: membership.id
          });
        }
      } catch (clerkError) {
        console.warn('Error removing user from Clerk organization:', clerkError);
        // Continuar a pesar del error
      }
    }
    
    // Registrar actividad
    await storage.createActivity({
      type: 'user_removed_from_fund',
      userId: req.user?.id,
      content: `User ${user.name} (${user.email}) removed from fund ${fund.name}`,
      metadata: {
        fundId,
        targetUserId: user.id
      }
    });
    
    res.json({
      message: 'User removed from fund',
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Error removing member from fund:', error);
    res.status(500).json({ message: 'Error removing member from fund' });
  }
});

export default router;