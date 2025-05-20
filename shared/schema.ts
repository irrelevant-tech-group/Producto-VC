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

// Enums (sin cambios)
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
  'declined',
  'invested',
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
  'final'
]);

// Users - MODIFICADO para añadir campos de Clerk
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(), // Añadimos unique constraint
  position: text("position"),
  clerkId: text("clerk_id").unique(), // Añadimos ID de Clerk
  fundId: text("fund_id").references(() => funds.id), // ID del fondo al que pertenece
  role: text("role").default('analyst'), // rol del usuario
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Nueva tabla para fondos/organizaciones
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

// Startups - ACTUALIZADO con nuevos campos
export const startups = pgTable("startups", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  vertical: startupVerticalEnum("vertical").notNull(),
  stage: startupStageEnum("stage").notNull(),
  location: text("location").notNull(),
  amountSought: numeric("amount_sought"),
  currency: currencyEnum("currency").default('USD'),
  primaryContact: jsonb("primary_contact"),
  firstContactDate: date("first_contact_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  status: startupStatusEnum("status").default('active'),
  alignmentScore: real("alignment_score"),
  lastInteraction: timestamp("last_interaction"),
  fundId: text("fund_id").references(() => funds.id), // Añadimos referencia al fondo
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
  fundId: text("fund_id").references(() => funds.id), // Añadimos referencia al fondo
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
  fundId: text("fund_id").references(() => funds.id), // Añadimos referencia al fondo
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
  fundId: text("fund_id").references(() => funds.id), // Añadimos referencia al fondo
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
  fundId: text("fund_id").references(() => funds.id), // Añadimos referencia al fondo
});

// Relaciones actualizadas
export const usersRelations = relations(users, ({ many, one }) => ({
  documents: many(documents),
  memos: many(memos),
  activities: many(activities),
  fund: one(funds, { fields: [users.fundId], references: [funds.id] }),
}));

export const fundsRelations = relations(funds, ({ many, one }) => ({
  users: many(users),
  startups: many(startups),
  documents: many(documents),
  memos: many(memos),
  activities: many(activities),
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

// Tipos y esquemas
export type InsertChunk = {
  documentId: string;
  startupId: string;
  content: string;
  metadata?: any;
  fundId?: string; // Añadido para Clerk
};

// ESQUEMA ACTUALIZADO - Extendido con nuevos campos obligatorios
export const insertStartupSchema = createInsertSchema(startups, {
  amountSought: z.number().min(0, "Amount sought must be positive"),
  currency: z.enum(['USD', 'MXN', 'COP', 'BRL']),
  primaryContact: z.object({
    name: z.string().min(1, "Contact name is required"),
    email: z.string().email("Valid email is required"),
    position: z.string().min(1, "Position is required")
  }),
  firstContactDate: z.string().refine(
    (date) => !isNaN(Date.parse(date)), 
    "First contact date must be a valid ISO date"
  ),
  fundId: z.string().optional()
});

// Esquema para creación de usuarios
export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email("Valid email is required"),
  role: z.enum(['admin', 'analyst', 'associate', 'partner']).default('analyst'),
  clerkId: z.string().optional(),
  fundId: z.string().optional()
});

// Esquema para creación de fondos
export const insertFundSchema = createInsertSchema(funds, {
  name: z.string().min(1, "Fund name is required"),
  slug: z.string().min(1, "Slug is required"),
  clerkOrgId: z.string().optional(),
  logoUrl: z.string().url().optional(),
  description: z.string().optional()
});

// Esquema para documento actualizado
export const insertDocumentSchema = createInsertSchema(documents, {
  startupId: z.string().uuid("Must be a valid UUID"),
  fundId: z.string().optional()
});

// Resto de esquemas sin cambios...
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