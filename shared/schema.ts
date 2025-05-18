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

// Users (sin cambios)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  position: text("position"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Startups - ACTUALIZADO con nuevos campos
export const startups = pgTable("startups", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  vertical: startupVerticalEnum("vertical").notNull(),
  stage: startupStageEnum("stage").notNull(),
  location: text("location").notNull(),
  amountSought: numeric("amount_sought"), // Cambiado de real a numeric para mayor precisión
  currency: currencyEnum("currency").default('USD'),
  primaryContact: jsonb("primary_contact"),
  firstContactDate: date("first_contact_date"), // NUEVO CAMPO
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  status: startupStatusEnum("status").default('active'),
  alignmentScore: real("alignment_score"),
  lastInteraction: timestamp("last_interaction"),
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
});

// Relaciones (sin cambios)
export const usersRelations = relations(users, ({ many }) => ({
  documents: many(documents),
  memos: many(memos),
  activities: many(activities),
}));
export const startupsRelations = relations(startups, ({ many }) => ({
  documents: many(documents),
  chunks: many(chunks),
  memos: many(memos),
  activities: many(activities),
}));
export const documentsRelations = relations(documents, ({ one, many }) => ({
  startup: one(startups, { fields: [documents.startupId], references: [startups.id] }),
  uploadedByUser: one(users, { fields: [documents.uploadedBy], references: [users.id] }),
  chunks: many(chunks),
  activities: many(activities),
}));
export const chunksRelations = relations(chunks, ({ one }) => ({
  document: one(documents, { fields: [chunks.documentId], references: [documents.id] }),
  startup: one(startups, { fields: [chunks.startupId], references: [startups.id] }),
}));
export const memosRelations = relations(memos, ({ one, many }) => ({
  startup: one(startups, { fields: [memos.startupId], references: [startups.id] }),
  updatedByUser: one(users, { fields: [memos.updatedBy], references: [users.id] }),
  activities: many(activities),
}));
export const activitiesRelations = relations(activities, ({ one }) => ({
  user: one(users, { fields: [activities.userId], references: [users.id] }),
  startup: one(startups, { fields: [activities.startupId], references: [startups.id] }),
  document: one(documents, { fields: [activities.documentId], references: [documents.id] }),
  memo: one(memos, { fields: [activities.memoId], references: [memos.id] }),
}));

// Tipos y esquemas
export type InsertChunk = {
  documentId: string;
  startupId: string;
  content: string;
  metadata?: any;
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
  )
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
  similarityThreshold: z.number().min(0).max(1).default(0.7)
});

export const entitySchema = z.object({
  type: z.string(),
  text: z.string(),
  confidence: z.number().min(0).max(1).optional(),
  metadata: z.record(z.string(), z.any()).optional()
});

export type Entity = z.infer<typeof entitySchema>;