// server/routes/middlewares.ts

import multer from "multer";
import { z } from "zod";

// Configure multer for file uploads
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB max file size
  },
});

// Helper for validating request body
export function validateBody<T extends z.ZodTypeAny>(
  schema: T,
  body: unknown
): z.infer<T> {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new Error(`Validation error: ${result.error.message}`);
  }
  return result.data;
}

/**
 * Validates a UUID format
 */
export function isValidUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

/**
 * Common error handling middleware
 */
export function errorHandler(error: any, req: any, res: any, next: any) {
  console.error("Error in route:", error);
  
  if (error.message.includes("Validation error")) {
    return res.status(400).json({ message: error.message });
  }
  
  res.status(500).json({ 
    message: error.message || "Internal server error",
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });
}