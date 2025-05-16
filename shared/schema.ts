import { pgTable, text, serial, integer, boolean, timestamp, uuid, varchar, jsonb, real, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";
// Importaremos pgvector más adelante cuando tengamos configurada la extensión en la base de datos

// Enums
export const startupVerticalEnum = pgEnum('startup_vertical', [
  'fintech', 'saas', 'marketplace', 'ecommerce', 'ai', 'cleantech', 'other'
]);

export const startupStageEnum = pgEnum('startup_stage', [
  'pre-seed', 'seed', 'series-a'
]);

export const startupStatusEnum = pgEnum('startup_status', [
  'active', 'declined', 'invested', 'archived'
]);

export const currencyEnum = pgEnum('currency', [
  'USD', 'MXN', 'COP', 'BRL'
]);

export const documentTypeEnum = pgEnum('document_type', [
  'pitch-deck', 'financials', 'legal', 'tech', 'market', 'other'
]);

export const processingStatusEnum = pgEnum('processing_status', [
  'pending', 'processing', 'completed', 'failed'
]);

export const memoStatusEnum = pgEnum('memo_status', [
  'draft', 'review', 'final'
]);

// User Schema
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

// Startup Schema
export const startups = pgTable("startups", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  vertical: startupVerticalEnum("vertical").notNull(),
  stage: startupStageEnum("stage").notNull(),
  location: text("location").notNull(),
  amountSought: real("amount_sought"),
  currency: currencyEnum("currency").default('USD'),
  primaryContact: jsonb("primary_contact"), // { name, email, position }
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  status: startupStatusEnum("status").default('active'),
  alignmentScore: real("alignment_score"),
  lastInteraction: timestamp("last_interaction"),
});

// Document Schema
export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  startupId: uuid("startup_id").notNull().references(() => startups.id, { onDelete: 'cascade' }),
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

// Chunk Schema
export const chunks = pgTable("chunks", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id").notNull().references(() => documents.id, { onDelete: 'cascade' }),
  startupId: uuid("startup_id").notNull().references(() => startups.id, { onDelete: 'cascade' }),
  content: text("content").notNull(),
  // For now, store text similarity metrics instead of vector embeddings
  similarityScore: real("similarity_score"),
  metadata: jsonb("metadata"), // { source, page, category, entities, metrics, timestamp }
});

// InvestmentMemo Schema
export const memos = pgTable("investment_memos", {
  id: uuid("id").primaryKey().defaultRandom(),
  startupId: uuid("startup_id").notNull().references(() => startups.id, { onDelete: 'cascade' }),
  version: integer("version").default(1),
  status: memoStatusEnum("status").default('draft'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: integer("updated_by").references(() => users.id),
  sections: jsonb("sections"), // Array of { title, content, sources, lastEdited }
  exportUrls: jsonb("export_urls"), // { pdf, docx, slides }
});

// Activity Schema
export const activities = pgTable("activities", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: integer("user_id").references(() => users.id),
  startupId: uuid("startup_id").references(() => startups.id),
  documentId: uuid("document_id").references(() => documents.id),
  memoId: uuid("memo_id").references(() => memos.id),
  type: text("type").notNull(), // upload, query, memo_generation, etc.
  content: text("content"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relationships
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
  startup: one(startups, {
    fields: [documents.startupId],
    references: [startups.id],
  }),
  uploadedByUser: one(users, {
    fields: [documents.uploadedBy],
    references: [users.id],
  }),
  chunks: many(chunks),
  activities: many(activities),
}));

export const chunksRelations = relations(chunks, ({ one }) => ({
  document: one(documents, {
    fields: [chunks.documentId],
    references: [documents.id],
  }),
  startup: one(startups, {
    fields: [chunks.startupId],
    references: [startups.id],
  }),
}));

export const memosRelations = relations(memos, ({ one, many }) => ({
  startup: one(startups, {
    fields: [memos.startupId],
    references: [startups.id],
  }),
  updatedByUser: one(users, {
    fields: [memos.updatedBy],
    references: [users.id],
  }),
  activities: many(activities),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  user: one(users, {
    fields: [activities.userId],
    references: [users.id],
  }),
  startup: one(startups, {
    fields: [activities.startupId],
    references: [startups.id],
  }),
  document: one(documents, {
    fields: [activities.documentId],
    references: [documents.id],
  }),
  memo: one(memos, {
    fields: [activities.memoId],
    references: [memos.id],
  }),
}));

// Export schema for inserts
export const insertUserSchema = createInsertSchema(users, {
  id: z.number().optional(),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const insertStartupSchema = createInsertSchema(startups, {
  id: z.string().uuid().optional(),
}).omit({ id: true, createdAt: true, updatedAt: true, alignmentScore: true, lastInteraction: true });

export const insertDocumentSchema = createInsertSchema(documents, {
  id: z.string().uuid().optional(),
}).omit({ id: true, uploadedAt: true, processed: true, processingStatus: true });

export const insertChunkSchema = createInsertSchema(chunks, {
  id: z.string().uuid().optional(),
}).omit({ id: true });

export const insertMemoSchema = createInsertSchema(memos, {
  id: z.string().uuid().optional(),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const insertActivitySchema = createInsertSchema(activities, {
  id: z.string().uuid().optional(),
}).omit({ id: true, createdAt: true });

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Startup = typeof startups.$inferSelect;
export type InsertStartup = z.infer<typeof insertStartupSchema>;

export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;

export type Chunk = typeof chunks.$inferSelect;
export type InsertChunk = z.infer<typeof insertChunkSchema>;

export type Memo = typeof memos.$inferSelect;
export type InsertMemo = z.infer<typeof insertMemoSchema>;

export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;
