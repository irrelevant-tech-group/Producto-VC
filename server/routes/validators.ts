// server/routes/validators.ts

import { z } from "zod";

// Validation schema for AI query
export const aiQuerySchema = z.object({
  startupId: z.string().optional(),
  question: z.string().min(1, "Question is required"),
  includeSourceDocuments: z.boolean().optional().default(true),
  userId: z.number().optional()
});

// Other validation schemas can be added here
export const updateMemoSchema = z.object({
  sections: z.array(
    z.object({
      title: z.string(),
      content: z.string()
    })
  ).optional(),
  status: z.enum(['draft', 'review', 'final']).optional()
});

export const exportMemoSchema = z.object({
  format: z.enum(['pdf', 'docx', 'slides'])
});

export const generateMemoSchema = z.object({
  sections: z.array(z.string()).optional()
});