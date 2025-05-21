// server/storage/repositories/documentRepository.ts

import { eq, desc } from "drizzle-orm";
import { db } from "../../db";
import { documents, Document, InsertDocument } from "@shared/schema";
import { IDocumentRepository } from "../interfaces";

export class DocumentRepository implements IDocumentRepository {
  async getDocument(id: string): Promise<Document | undefined> {
    const [document] = await db.select().from(documents).where(eq(documents.id, id));
    return document;
  }
 
  async getDocumentsByStartup(startupId: string): Promise<Document[]> {
    return await db
      .select()
      .from(documents)
      .where(eq(documents.startupId, startupId))
      .orderBy(desc(documents.uploadedAt));
  }
 
  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const [document] = await db.insert(documents).values(insertDocument).returning();
    return document;
  }
 
  async updateDocument(id: string, data: Partial<Document>): Promise<Document | undefined> {
    const [updated] = await db
      .update(documents)
      .set({
        ...data,
        // Nota: No hay updatedAt en documentos actualmente
      })
      .where(eq(documents.id, id))
      .returning();
    return updated;
  }
}