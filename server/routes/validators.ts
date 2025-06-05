// server/routes/validators.ts

import { z } from "zod";

// Validation schema for AI query
export const aiQuerySchema = z.object({
  startupId: z.string().optional(),
  question: z.string().min(1, "Question is required"),
  includeSourceDocuments: z.boolean().optional().default(true),
  userId: z.number().optional()
});

// Other validation schemas can be added here - ACTUALIZADO
export const updateMemoSchema = z.object({
  sections: z.array(
    z.object({
      title: z.string(),
      content: z.string()
    })
  ).optional(),
  status: z.enum(['draft', 'review', 'final', 'approved', 'rejected']).optional()
});

export const exportMemoSchema = z.object({
  format: z.enum(['pdf', 'docx', 'slides'])
});

export const generateMemoSchema = z.object({
  sections: z.array(z.string()).optional()
});

// NUEVOS SCHEMAS para investment tracking
export const markInvestedSchema = z.object({
  investmentAmount: z.number().positive("Investment amount must be positive").optional(),
  investmentDate: z.string().refine(
    (date) => !isNaN(Date.parse(date)), 
    "Investment date must be a valid ISO date"
  ).optional(),
  ownershipPercentage: z.number().min(0).max(100, "Ownership must be between 0-100%").optional(),
  decisionReason: z.string().min(1, "Decision reason is required").optional()
});

export const markDeclinedSchema = z.object({
  decisionReason: z.string().min(1, "Decision reason is required")
});

export const markStandbySchema = z.object({
  decisionReason: z.string().min(1, "Decision reason is required").optional()
});

export const changeMemoStatusSchema = z.object({
  status: z.enum(['draft', 'review', 'final', 'approved', 'rejected']),
  comments: z.string().optional()
});

export const approveMemoSchema = z.object({
  comments: z.string().optional()
});

export const rejectMemoSchema = z.object({
  comments: z.string().min(1, "Comments required for rejection")
});

// Schema para actualización de startup con nuevos campos
export const updateStartupSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  vertical: z.enum(['fintech', 'saas', 'marketplace', 'ecommerce', 'ai', 'cleantech', 'other']).optional(),
  stage: z.enum(['pre-seed', 'seed', 'series-a']).optional(),
  location: z.string().min(1, "Location is required").optional(),
  status: z.enum(['active', 'invested', 'standby', 'declined', 'archived']).optional(),
  amountSought: z.number().min(0, "Amount sought must be positive").optional(),
  valuation: z.number().min(0, "Valuation must be positive").optional(),
  currency: z.enum(['USD', 'MXN', 'COP', 'BRL']).optional(),
  primaryContact: z.object({
    name: z.string().min(1, "Contact name is required"),
    email: z.string().email("Valid email is required"),
    position: z.string().min(1, "Position is required")
  }).optional(),
  firstContactDate: z.string().refine(
    (date) => !isNaN(Date.parse(date)), 
    "First contact date must be a valid ISO date"
  ).optional(),
  investmentDate: z.string().refine(
    (date) => !isNaN(Date.parse(date)), 
    "Investment date must be a valid ISO date"
  ).optional(),
  investmentAmount: z.number().min(0, "Investment amount must be positive").optional(),
  ownershipPercentage: z.number().min(0).max(100, "Ownership must be between 0-100%").optional(),
  decisionReason: z.string().optional(),
  description: z.string().optional()
});