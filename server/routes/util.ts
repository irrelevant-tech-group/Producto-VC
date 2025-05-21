// server/routes/util.ts

import { Request } from "express";

/**
 * Check if user is admin or superadmin
 */
export function isAdmin(req: Request): boolean {
  return req.user?.role === 'admin' || 
         req.user?.email === process.env.SUPERADMIN_EMAIL;
}

/**
 * Check if user has access to a specific startup
 */
export function hasStartupAccess(req: Request, startupFundId?: string): boolean {
  // Superadmin has access to everything
  if (req.user?.email === process.env.SUPERADMIN_EMAIL) {
    return true;
  }
  
  // Admin has access to everything
  if (req.user?.role === 'admin') {
    return true;
  }
  
  // No fundId means no fund-specific restrictions
  if (!startupFundId) {
    return true;
  }
  
  // User has access if they belong to the same fund
  return req.user?.fundId === startupFundId;
}

/**
 * Format an error for API response
 */
export function formatError(error: any, includeDetails = false): any {
  return {
    message: error.message || "An unexpected error occurred",
    details: includeDetails ? error.stack : undefined
  };
}