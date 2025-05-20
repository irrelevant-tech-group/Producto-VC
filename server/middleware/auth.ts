// server/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { clerkClient } from '@clerk/clerk-sdk-node';
import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';

// Tipos para roles y organización
type UserRole = 'admin' | 'analyst' | 'viewer';

// Middleware para verificar autenticación con Clerk
export const requireAuth = ClerkExpressRequireAuth();

// Middleware para obtener usuario de la base de datos
export async function loadUserFromDb(req: Request, res: Response, next: NextFunction) {
  try {
    // Si no hay usuario autenticado con Clerk, continuar
    if (!req.auth?.userId) {
      return next();
    }
    
    const clerkUserId = req.auth.userId;
    
    // Obtener email del usuario
    try {
      const clerkUser = await clerkClient.users.getUser(clerkUserId);
      
      if (!clerkUser) {
        return res.status(401).json({ 
          error: 'user_not_found', 
          message: 'User not found in Clerk' 
        });
      }
      
      // Obtener email principal
      const primaryEmailObj = clerkUser.emailAddresses.find(
        email => email.id === clerkUser.primaryEmailAddressId
      );
      const primaryEmail = primaryEmailObj?.emailAddress;
      
      if (!primaryEmail) {
        return res.status(401).json({ 
          error: 'invalid_user', 
          message: 'User has no email address' 
        });
      }
      
      // Verificar si el usuario existe en nuestra base de datos
      let user = await storage.getUserByEmail(primaryEmail);
      
      if (!user) {
        // Crear usuario en nuestra base de datos si no existe
        try {
          // Obtener organización principal
          let orgId: string | undefined;
          let orgName: string | undefined;
          let orgImageUrl: string | undefined;
          
          if (clerkUser.organizationMemberships && clerkUser.organizationMemberships.length > 0) {
            const primaryOrg = clerkUser.organizationMemberships[0];
            orgId = primaryOrg.organization.id;
            orgName = primaryOrg.organization.name;
            orgImageUrl = primaryOrg.organization.imageUrl;
          }
          
          // Obtener o crear fund en nuestra base de datos
          let fundId: string | undefined;
          if (orgId) {
            const existingFund = await storage.getFundByClerkOrgId(orgId);
            if (existingFund) {
              fundId = existingFund.id;
            }
          }
          
          // Default to 'analyst' role if none specified
          const role = 'analyst';
          
          // Create user in our database
          user = await storage.createUser({
            username: primaryEmail.split('@')[0],
            email: primaryEmail,
            password: 'clerk-managed', // No usamos password con Clerk
            name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim(),
            position: role,
            clerkId: clerkUser.id,
            fundId: fundId,
            role: role
          });
          
          console.log(`Created new user in local DB for Clerk user: ${clerkUser.id}`);
        } catch (createError) {
          console.error('Error creating user from Clerk data:', createError);
          return res.status(500).json({ 
            error: 'user_creation_failed', 
            message: 'Failed to create user account' 
          });
        }
      } else {
        // Actualizar información si es necesario
        const needsUpdate = 
          user.clerkId !== clerkUser.id || 
          user.name !== `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim();
        
        if (needsUpdate) {
          await storage.updateUser(user.id, {
            name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim(),
            clerkId: clerkUser.id
          });
        }
      }
      
      // Obtener información de la organización
      let orgName = '';
      let orgLogo = '';
      let fundId = user.fundId;
      
      if (clerkUser.organizationMemberships && clerkUser.organizationMemberships.length > 0) {
        const primaryOrg = clerkUser.organizationMemberships[0];
        orgName = primaryOrg.organization.name;
        orgLogo = primaryOrg.organization.imageUrl || '';
        
        // Verificar si necesitamos actualizar el fundId
        if (!user.fundId) {
          // Buscar fund por clerkOrgId
          const fund = await storage.getFundByClerkOrgId(primaryOrg.organization.id);
          if (fund) {
            fundId = fund.id;
            await storage.updateUser(user.id, { fundId: fund.id });
          }
        }
      }
      
      // Adjuntar información del usuario a la request
      req.user = {
        id: user.id,
        clerkId: clerkUser.id,
        email: primaryEmail,
        name: user.name,
        role: user.role as UserRole || 'analyst',
        fundId: fundId || '',
        orgName: orgName || 'Default Fund',
        orgLogo: orgLogo
      };
      
    } catch (err) {
      console.error('Error getting Clerk user:', err);
      return res.status(401).json({ 
        error: 'clerk_error', 
        message: 'Error authenticating with Clerk' 
      });
    }
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ 
      error: 'auth_error', 
      message: 'Authentication error' 
    });
  }
}

// Middleware para verificar rol de administrador
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'unauthorized', 
      message: 'Authentication required' 
    });
  }
  
  if (req.user.role !== 'admin' && req.user.email !== process.env.SUPERADMIN_EMAIL) {
    return res.status(403).json({ 
      error: 'forbidden', 
      message: 'Admin privileges required' 
    });
  }
  
  next();
}

// Middleware para verificar acceso a fund específico
export function requireFundAccess(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'unauthorized', 
      message: 'Authentication required' 
    });
  }
  
  // Obtener fundId de los parámetros de la ruta o query
  const requestedFundId = req.params.fundId || req.query.fundId;
  
  // El superadmin siempre tiene acceso
  if (req.user.email === process.env.SUPERADMIN_EMAIL) {
    return next();
  }
  
  // Verificar que el usuario pertenece al fondo solicitado
  if (requestedFundId && req.user.fundId !== requestedFundId) {
    return res.status(403).json({ 
      error: 'forbidden', 
      message: 'No access to this fund' 
    });
  }
  
  next();
}