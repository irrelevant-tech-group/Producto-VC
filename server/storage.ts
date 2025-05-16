import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "./db";
import {
  users, User, InsertUser,
  startups, Startup, InsertStartup,
  documents, Document, InsertDocument,
  chunks, Chunk, InsertChunk,
  memos, Memo, InsertMemo,
  activities, Activity, InsertActivity
} from "@shared/schema";
import { 
  DashboardMetrics, 
  StartupSummary, 
  ActivityItem,
  DueDiligenceProgress
} from "@shared/types";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Startup operations
  getStartup(id: string): Promise<Startup | undefined>;
  getStartups(): Promise<Startup[]>;
  createStartup(startup: InsertStartup): Promise<Startup>;
  updateStartup(id: string, data: Partial<Startup>): Promise<Startup | undefined>;
  getStartupSummaries(): Promise<StartupSummary[]>;
  
  // Document operations
  getDocument(id: string): Promise<Document | undefined>;
  getDocumentsByStartup(startupId: string): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: string, data: Partial<Document>): Promise<Document | undefined>;
  
  // Chunk operations
  createChunk(chunk: InsertChunk): Promise<Chunk>;
  searchChunks(query: string, startupId?: string, limit?: number): Promise<Chunk[]>;
  
  // Memo operations
  getMemo(id: string): Promise<Memo | undefined>;
  getMemosByStartup(startupId: string): Promise<Memo[]>;
  createMemo(memo: InsertMemo): Promise<Memo>;
  updateMemo(id: string, data: Partial<Memo>): Promise<Memo | undefined>;
  
  // Activity operations
  getRecentActivities(limit?: number): Promise<ActivityItem[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  
  // Dashboard operations
  getDashboardMetrics(): Promise<DashboardMetrics>;
  getDueDiligenceProgress(startupId: string): Promise<DueDiligenceProgress>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Startup operations
  async getStartup(id: string): Promise<Startup | undefined> {
    const [startup] = await db.select().from(startups).where(eq(startups.id, id));
    return startup;
  }

  async getStartups(): Promise<Startup[]> {
    return await db.select().from(startups).orderBy(desc(startups.createdAt));
  }

  async createStartup(insertStartup: InsertStartup): Promise<Startup> {
    const [startup] = await db.insert(startups).values(insertStartup).returning();
    return startup;
  }

  async updateStartup(id: string, data: Partial<Startup>): Promise<Startup | undefined> {
    const [updated] = await db
      .update(startups)
      .set(data)
      .where(eq(startups.id, id))
      .returning();
    return updated;
  }

  async getStartupSummaries(): Promise<StartupSummary[]> {
    const results = await db.select().from(startups);
    
    return results.map(startup => ({
      id: startup.id,
      name: startup.name,
      vertical: startup.vertical,
      stage: startup.stage,
      location: startup.location,
      amountSought: startup.amountSought,
      currency: startup.currency,
      status: startup.status || 'pending', // Convert null to 'pending' to match type
      alignmentScore: startup.alignmentScore,
      documentsCount: 0, // Would be populated by a join or multiple queries in a real app
      completionPercentage: 0, // Would be calculated based on due diligence data
      lastUpdated: startup.createdAt?.toISOString() || new Date().toISOString(), // Ensure there's always a date
    }));
  }

  // Document operations
  async getDocument(id: string): Promise<Document | undefined> {
    const [document] = await db.select().from(documents).where(eq(documents.id, id));
    return document;
  }

  async getDocumentsByStartup(startupId: string): Promise<Document[]> {
    return await db
      .select()
      .from(documents)
      .where(eq(documents.startupId, startupId));
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const [document] = await db.insert(documents).values(insertDocument).returning();
    return document;
  }

  async updateDocument(id: string, data: Partial<Document>): Promise<Document | undefined> {
    const [updated] = await db
      .update(documents)
      .set(data)
      .where(eq(documents.id, id))
      .returning();
    return updated;
  }

  // Chunk operations
  async createChunk(insertChunk: InsertChunk): Promise<Chunk> {
    const [chunk] = await db.insert(chunks).values(insertChunk).returning();
    return chunk;
  }

  async searchChunks(query: string, startupId?: string, limit = 5): Promise<Chunk[]> {
    try {
      // Validar que startupId es un UUID válido si está presente
      const isValidUUID = (id: string) => {
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      };
      
      // Si no hay consulta, devolver array vacío
      if (!query || query.trim() === '') {
        return [];
      }
      
      // Realizar búsqueda básica en el contenido
      let results;
      
      if (startupId && isValidUUID(startupId)) {
        // Búsqueda filtrada por startup
        results = await db.execute(
          sql`SELECT * FROM chunks 
              WHERE content ILIKE ${'%' + query + '%'} 
              AND document_id IN (
                SELECT id FROM documents WHERE startup_id = ${startupId}
              )
              LIMIT ${limit}`
        );
      } else {
        // Búsqueda en todos los documentos
        results = await db.execute(
          sql`SELECT * FROM chunks 
              WHERE content ILIKE ${'%' + query + '%'} 
              LIMIT ${limit}`
        );
      }
      
      return results.rows as Chunk[];
    } catch (error) {
      console.error("Error searching chunks:", error);
      return [];
    }
  }

  // Memo operations
  async getMemo(id: string): Promise<Memo | undefined> {
    const [memo] = await db.select().from(memos).where(eq(memos.id, id));
    return memo;
  }

  async getMemosByStartup(startupId: string): Promise<Memo[]> {
    return await db
      .select()
      .from(memos)
      .where(eq(memos.startupId, startupId))
      .orderBy(desc(memos.createdAt));
  }

  async createMemo(insertMemo: InsertMemo): Promise<Memo> {
    const [memo] = await db.insert(memos).values(insertMemo).returning();
    return memo;
  }

  async updateMemo(id: string, data: Partial<Memo>): Promise<Memo | undefined> {
    const [updated] = await db
      .update(memos)
      .set(data)
      .where(eq(memos.id, id))
      .returning();
    return updated;
  }

  // Activity operations
  async getRecentActivities(limit = 10): Promise<ActivityItem[]> {
    const results = await db
      .select()
      .from(activities)
      .orderBy(desc(activities.createdAt))
      .limit(limit);

    return results.map(activity => ({
      id: activity.id,
      type: activity.type,
      userId: activity.userId || undefined,
      userName: activity.userName || undefined,
      startupId: activity.startupId || undefined,
      startupName: activity.startupName || undefined,
      documentId: activity.documentId || undefined,
      documentName: activity.documentName || undefined,
      memoId: activity.memoId || undefined,
      timestamp: activity.createdAt?.toISOString() || new Date().toISOString(),
      content: activity.content || undefined,
      metadata: activity.metadata as Record<string, any>,
    }));
  }

  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const [activity] = await db.insert(activities).values(insertActivity).returning();
    return activity;
  }

  // Dashboard operations
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    try {
      // Get counts from database safely
      const totalStartupsResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(startups);
      const totalStartups = totalStartupsResult[0]?.count || 0;
      
      const activeDueDiligenceResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(startups)
        .where(eq(startups.status, 'active'));
      const activeDueDiligence = activeDueDiligenceResult[0]?.count || 0;
      
      const pendingMemosResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(memos)
        .where(eq(memos.status, 'draft'));
      const pendingMemos = pendingMemosResult[0]?.count || 0;
      
      const docsProcessedResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(documents)
        .where(eq(documents.processingStatus, 'completed'));
      const docsProcessed = docsProcessedResult[0]?.count || 0;
      
      // In a real app, we would calculate trends by comparing with previous periods
      // For the MVP, we'll use static numbers
      return {
        totalStartups,
        activeDueDiligence,
        pendingMemos, 
        docsProcessed,
        trendStartups: 4,
        trendDD: 2,
        trendMemos: -1,
        trendDocs: 12,
      };
    } catch (error) {
      console.error("Error fetching dashboard metrics:", error);
      // Return default values if there's an error
      return {
        totalStartups: 0,
        activeDueDiligence: 0,
        pendingMemos: 0,
        docsProcessed: 0,
        trendStartups: 0,
        trendDD: 0,
        trendMemos: 0,
        trendDocs: 0,
      };
    }
  }

  async getDueDiligenceProgress(startupId: string): Promise<DueDiligenceProgress> {
    const docs = await this.getDocumentsByStartup(startupId);
    
    // Define the required document categories and counts
    const categories = {
      'pitch-deck': { completion: 0, required: 1, uploaded: 0 },
      'financials': { completion: 0, required: 2, uploaded: 0 },
      'legal': { completion: 0, required: 3, uploaded: 0 },
      'team': { completion: 0, required: 1, uploaded: 0 },
      'market': { completion: 0, required: 2, uploaded: 0 },
      'tech': { completion: 0, required: 2, uploaded: 0 },
      'other': { completion: 0, required: 0, uploaded: 0 }
    };
    
    // Count uploaded documents by category
    docs.forEach(doc => {
      if (categories[doc.type]) {
        categories[doc.type].uploaded += 1;
      }
    });
    
    // Calculate completion percentages
    let totalRequired = 0;
    let totalUploaded = 0;
    
    Object.values(categories).forEach(value => {
      totalRequired += value.required;
      totalUploaded += Math.min(value.uploaded, value.required);
      
      if (value.required > 0) {
        value.completion = Math.min(100, Math.round((value.uploaded / value.required) * 100));
      } else {
        value.completion = 100;
      }
    });
    
    const overallCompletion = totalRequired > 0
      ? Math.round((totalUploaded / totalRequired) * 100)
      : 0;
    
    return {
      startupId,
      overallCompletion,
      categories: categories as any,
    };
  }
}

export const storage = new DatabaseStorage();