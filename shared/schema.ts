// shared/schema.ts

import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  timestamp,
  uuid,
  jsonb,
  real,
  pgEnum,
  vector,
  date,
  numeric,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums - ACTUALIZADOS
export const startupVerticalEnum = pgEnum('startup_vertical', [
  'fintech',
  'saas',
  'marketplace',
  'ecommerce',
  'ai',
  'cleantech',
  'other'
]);
export const startupStageEnum = pgEnum('startup_stage', [
  'pre-seed',
  'seed',
  'series-a'
]);
export const startupStatusEnum = pgEnum('startup_status', [
  'active',
  'invested',
  'standby',
  'declined',
  'archived'
]);
export const currencyEnum = pgEnum('currency', [
  'USD',
  'MXN',
  'COP',
  'BRL'
]);
export const documentTypeEnum = pgEnum('document_type', [
  'pitch-deck',
  'financials',
  'legal',
  'tech',
  'market',
  'other'
]);
export const processingStatusEnum = pgEnum('processing_status', [
  'pending',
  'processing',
  'completed',
  'failed'
]);
export const memoStatusEnum = pgEnum('memo_status', [
  'draft',
  'review',
  'final',
  'approved',
  'rejected'
]);

// Users - SIN CAMBIOS
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  position: text("position"),
  clerkId: text("clerk_id").unique(),
  fundId: text("fund_id").references(() => funds.id),
  role: text("role").default('analyst'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Nueva tabla para fondos/organizaciones - SIN CAMBIOS
export const funds = pgTable("funds", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  clerkOrgId: text("clerk_org_id").unique(),
  logoUrl: text("logo_url"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
});

// Startups - MODIFICADO con nuevos campos
export const startups = pgTable("startups", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  vertical: startupVerticalEnum("vertical").notNull(),
  stage: startupStageEnum("stage").notNull(),
  location: text("location").notNull(),
  amountSought: numeric("amount_sought"),
  valuation: numeric("valuation"),
  currency: currencyEnum("currency").default('USD'),
  primaryContact: jsonb("primary_contact"),
  firstContactDate: date("first_contact_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  status: startupStatusEnum("status").default('active'),
  alignmentScore: real("alignment_score"),
  lastInteraction: timestamp("last_interaction"),
  fundId: text("fund_id").references(() => funds.id),
  investmentDate: date("investment_date"),
  investmentAmount: numeric("investment_amount"),
  ownershipPercentage: real("ownership_percentage"),
  decisionReason: text("decision_reason"),
});

// Resto de tablas sin cambios...
export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  startupId: uuid("startup_id")
    .notNull()
    .references(() => startups.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  type: documentTypeEnum("type").notNull(),
  fileUrl: text("file_url").notNull(),
  fileType: text("file_type").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  uploadedBy: integer("uploaded_by").references(() => users.id),
  processed: boolean("processed").default(false),
  processingStatus: processingStatusEnum("processing_status").default('pending'),
  metadata: jsonb("metadata"),
  fundId: text("fund_id").references(() => funds.id),
});

export const chunks = pgTable("chunks", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  startupId: uuid("startup_id")
    .notNull()
    .references(() => startups.id, { onDelete: 'cascade' }),
  content: text("content").notNull(),
  embedding: vector("embedding", { dimensions: 1536 }),
  similarityScore: real("similarity_score"),
  metadata: jsonb("metadata"),
  fundId: text("fund_id").references(() => funds.id),
});

export const memos = pgTable("investment_memos", {
  id: uuid("id").primaryKey().defaultRandom(),
  startupId: uuid("startup_id")
    .notNull()
    .references(() => startups.id, { onDelete: 'cascade' }),
  version: integer("version").default(1),
  status: memoStatusEnum("status").default('draft'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: integer("updated_by").references(() => users.id),
  sections: jsonb("sections"),
  exportUrls: jsonb("export_urls"),
  fundId: text("fund_id").references(() => funds.id),
});

export const activities = pgTable("activities", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: integer("user_id").references(() => users.id),
  startupId: uuid("startup_id").references(() => startups.id),
  documentId: uuid("document_id").references(() => documents.id),
  memoId: uuid("memo_id").references(() => memos.id),
  type: text("type").notNull(),
  content: text("content"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  fundId: text("fund_id").references(() => funds.id),
});

// Tabla para plantillas de Due Diligence
export const dueDiligenceTemplates = pgTable("due_diligence_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  fundId: text("fund_id").notNull().references(() => funds.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  isActive: boolean("is_active").default(true),
  categories: jsonb("categories").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
  updatedBy: integer("updated_by").references(() => users.id),
});

// Investment Thesis Table - SIN CAMBIOS
export const investmentThesis = pgTable("investment_thesis", {
  id: uuid("id").primaryKey().defaultRandom(),
  fundId: text("fund_id").notNull().references(() => funds.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  version: integer("version").default(1),
  isActive: boolean("is_active").default(true),
  
  // Criterios principales
  preferredVerticals: jsonb("preferred_verticals").notNull(),
  preferredStages: jsonb("preferred_stages").notNull(),
  geographicFocus: jsonb("geographic_focus").notNull(),
  
  // Criterios financieros
  ticketSizeMin: numeric("ticket_size_min"),
  ticketSizeMax: numeric("ticket_size_max"),
  targetOwnershipMin: real("target_ownership_min"),
  targetOwnershipMax: real("target_ownership_max"),
  expectedReturns: jsonb("expected_returns"),
  
  // Criterios de evaluación
  evaluationCriteria: jsonb("evaluation_criteria").notNull(),
  
  // Contexto y filosofía
  investmentPhilosophy: text("investment_philosophy").notNull(),
  valueProposition: text("value_proposition").notNull(),
  decisionProcess: text("decision_process"),
  riskAppetite: text("risk_appetite"),
  
  // Criterios específicos
  verticalSpecificCriteria: jsonb("vertical_specific_criteria"),
  redFlags: jsonb("red_flags"),
  mustHaves: jsonb("must_haves"),
  
  // Metadatos
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
  updatedBy: integer("updated_by").references(() => users.id),
});

// Relaciones actualizadas - SIN CAMBIOS
export const usersRelations = relations(users, ({ many, one }) => ({
  documents: many(documents),
  memos: many(memos),
  activities: many(activities),
  fund: one(funds, { fields: [users.fundId], references: [funds.id] }),
  createdTheses: many(investmentThesis, { relationName: 'createdTheses' }),
  updatedTheses: many(investmentThesis, { relationName: 'updatedTheses' }),
}));

export const fundsRelations = relations(funds, ({ many, one }) => ({
  users: many(users),
  startups: many(startups),
  documents: many(documents),
  memos: many(memos),
  activities: many(activities),
  investmentTheses: many(investmentThesis),
  createdByUser: one(users, { fields: [funds.createdBy], references: [users.id] }),
}));

export const startupsRelations = relations(startups, ({ many, one }) => ({
  documents: many(documents),
  chunks: many(chunks),
  memos: many(memos),
  activities: many(activities),
  fund: one(funds, { fields: [startups.fundId], references: [funds.id] }),
}));

export const documentsRelations = relations(documents, ({ one, many }) => ({
  startup: one(startups, { fields: [documents.startupId], references: [startups.id] }),
  uploadedByUser: one(users, { fields: [documents.uploadedBy], references: [users.id] }),
  chunks: many(chunks),
  activities: many(activities),
  fund: one(funds, { fields: [documents.fundId], references: [funds.id] }),
}));

export const chunksRelations = relations(chunks, ({ one }) => ({
  document: one(documents, { fields: [chunks.documentId], references: [documents.id] }),
  startup: one(startups, { fields: [chunks.startupId], references: [startups.id] }),
  fund: one(funds, { fields: [chunks.fundId], references: [funds.id] }),
}));

export const memosRelations = relations(memos, ({ one, many }) => ({
  startup: one(startups, { fields: [memos.startupId], references: [startups.id] }),
  updatedByUser: one(users, { fields: [memos.updatedBy], references: [users.id] }),
  activities: many(activities),
  fund: one(funds, { fields: [memos.fundId], references: [funds.id] }),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  user: one(users, { fields: [activities.userId], references: [users.id] }),
  startup: one(startups, { fields: [activities.startupId], references: [startups.id] }),
  document: one(documents, { fields: [activities.documentId], references: [documents.id] }),
  memo: one(memos, { fields: [activities.memoId], references: [memos.id] }),
  fund: one(funds, { fields: [activities.fundId], references: [funds.id] }),
}));

export const dueDiligenceTemplatesRelations = relations(dueDiligenceTemplates, ({ one }) => ({
  fund: one(funds, { fields: [dueDiligenceTemplates.fundId], references: [funds.id] }),
  createdByUser: one(users, { fields: [dueDiligenceTemplates.createdBy], references: [users.id] }),
  updatedByUser: one(users, { fields: [dueDiligenceTemplates.updatedBy], references: [users.id] }),
}));

// Relaciones para Investment Thesis - SIN CAMBIOS
export const investmentThesisRelations = relations(investmentThesis, ({ one }) => ({
  fund: one(funds, { fields: [investmentThesis.fundId], references: [funds.id] }),
  createdByUser: one(users, { 
    fields: [investmentThesis.createdBy], 
    references: [users.id],
    relationName: 'createdTheses'
  }),
  updatedByUser: one(users, { 
    fields: [investmentThesis.updatedBy], 
    references: [users.id],
    relationName: 'updatedTheses'
  }),
}));

// Tipos para todas las tablas
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Fund = typeof funds.$inferSelect;
export type InsertFund = typeof funds.$inferInsert;
export type Startup = typeof startups.$inferSelect;
export type InsertStartup = typeof startups.$inferInsert;
export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;
export type Chunk = typeof chunks.$inferSelect;
export type InsertChunk = typeof chunks.$inferInsert;
export type Memo = typeof memos.$inferSelect;
export type InsertMemo = typeof memos.$inferInsert;
export type Activity = typeof activities.$inferSelect;
export type InsertActivity = typeof activities.$inferInsert;
export type DueDiligenceTemplate = typeof dueDiligenceTemplates.$inferSelect;
export type InsertDueDiligenceTemplate = typeof dueDiligenceTemplates.$inferInsert;

// Tipos para Investment Thesis
export type InvestmentThesis = typeof investmentThesis.$inferSelect;
export type InsertInvestmentThesis = typeof investmentThesis.$inferInsert;

// Esquemas de validación - ACTUALIZADOS
export const insertStartupSchema = createInsertSchema(startups, {
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
  fundId: z.string().optional(),
  investmentDate: z.string().refine(
    (date) => !isNaN(Date.parse(date)), 
    "Investment date must be a valid ISO date"
  ).optional(),
  investmentAmount: z.number().min(0, "Investment amount must be positive").optional(),
  ownershipPercentage: z.number().min(0).max(100, "Ownership must be between 0-100%").optional(),
  decisionReason: z.string().optional()
});

export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email("Valid email is required"),
  role: z.enum(['admin', 'analyst', 'associate', 'partner']).default('analyst'),
  clerkId: z.string().optional(),
  fundId: z.string().optional()
});

export const insertFundSchema = createInsertSchema(funds, {
  name: z.string().min(1, "Fund name is required"),
  slug: z.string().min(1, "Slug is required"),
  clerkOrgId: z.string().optional(),
  logoUrl: z.string().url().optional(),
  description: z.string().optional()
});

export const insertDocumentSchema = createInsertSchema(documents, {
  startupId: z.string().uuid("Must be a valid UUID"),
  fundId: z.string().optional()
});

// Schema de validación para Investment Thesis - SIN CAMBIOS
export const insertInvestmentThesisSchema = createInsertSchema(investmentThesis, {
  name: z.string().min(1, "Name is required"),
  preferredVerticals: z.array(z.object({
    vertical: z.string(),
    weight: z.number().min(0).max(1),
    criteria: z.string().optional()
  })).min(1, "At least one vertical is required"),
  preferredStages: z.array(z.object({
    stage: z.string(),
    weight: z.number().min(0).max(1),
    ticketRange: z.object({
      min: z.number().optional(),
      max: z.number().optional()
    }).optional()
  })).min(1, "At least one stage is required"),
  geographicFocus: z.array(z.object({
    region: z.string(),
    weight: z.number().min(0).max(1)
  })).min(1, "At least one geographic focus is required"),
  evaluationCriteria: z.object({
    team: z.object({ 
      weight: z.number().min(0).max(1), 
      subcriteria: z.record(z.object({
        weight: z.number().min(0).max(1)
      })).optional()
    }),
    market: z.object({ 
      weight: z.number().min(0).max(1), 
      subcriteria: z.record(z.object({
        weight: z.number().min(0).max(1)
      })).optional()
    }),
    product: z.object({ 
      weight: z.number().min(0).max(1), 
      subcriteria: z.record(z.object({
        weight: z.number().min(0).max(1)
      })).optional()
    }),
    traction: z.object({ 
      weight: z.number().min(0).max(1), 
      subcriteria: z.record(z.object({
        weight: z.number().min(0).max(1)
      })).optional()
    }),
    businessModel: z.object({ 
      weight: z.number().min(0).max(1), 
      subcriteria: z.record(z.object({
        weight: z.number().min(0).max(1)
      })).optional()
    }),
    fundFit: z.object({ 
      weight: z.number().min(0).max(1), 
      subcriteria: z.record(z.object({
        weight: z.number().min(0).max(1)
      })).optional()
    })
  }),
  investmentPhilosophy: z.string().min(50, "Investment philosophy must be detailed"),
  valueProposition: z.string().min(30, "Value proposition is required"),
  ticketSizeMin: z.number().positive().optional(),
  ticketSizeMax: z.number().positive().optional(),
  redFlags: z.array(z.string()).optional(),
  mustHaves: z.array(z.string()).optional(),
}).refine(data => {
  if (data.ticketSizeMin && data.ticketSizeMax) {
    return data.ticketSizeMax >= data.ticketSizeMin;
  }
  return true;
}, {
  message: "Maximum ticket size must be greater than or equal to minimum ticket size",
  path: ["ticketSizeMax"]
});

// Resto de esquemas - SIN CAMBIOS
export const alignmentSchema = z.object({
  score: z.number().min(0).max(1),
  breakdown: z.record(z.string(), z.object({
    score: z.number(),
    justification: z.string()
  })),
  recommendations: z.array(z.string())
});

export const chunkSchema = createInsertSchema(chunks);

export const vectorSearchSchema = z.object({
  query: z.string(),
  startupId: z.string().uuid().optional(),
  documentId: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(100).default(10),
  similarityThreshold: z.number().min(0).max(1).default(0.7),
  fundId: z.string().optional()
});

export const entitySchema = z.object({
  type: z.string(),
  text: z.string(),
  confidence: z.number().min(0).max(1).optional(),
  metadata: z.record(z.string(), z.any()).optional()
});

export type Entity = z.infer<typeof entitySchema>;