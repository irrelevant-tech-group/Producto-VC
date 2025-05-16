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
    return db.select().from(startups).orderBy(desc(startups.createdAt));
  }
  
  async createStartup(insertStartup: InsertStartup): Promise<Startup> {
    const [startup] = await db.insert(startups).values(insertStartup).returning();
    return startup;
  }
  
  async updateStartup(id: string, data: Partial<Startup>): Promise<Startup | undefined> {
    const [updated] = await db
      .update(startups)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(startups.id, id))
      .returning();
    return updated;
  }
  
  async getStartupSummaries(): Promise<StartupSummary[]> {
    const results = await db.query.startups.findMany({
      with: {
        documents: true,
      },
      orderBy: desc(startups.updatedAt),
    });
    
    return results.map(startup => {
      const docsCount = startup.documents.length;
      // Calculate completion percentage (simplified version)
      // In a real app, this would consider the types of documents required
      const expectedDocs = 10; // Arbitrary number for the MVP
      const completionPercentage = Math.min(Math.round((docsCount / expectedDocs) * 100), 100);
      
      return {
        id: startup.id,
        name: startup.name,
        vertical: startup.vertical,
        stage: startup.stage,
        location: startup.location,
        amountSought: startup.amountSought || 0,
        currency: startup.currency || 'USD',
        status: startup.status,
        alignmentScore: startup.alignmentScore,
        documentsCount: docsCount,
        completionPercentage,
        lastUpdated: startup.updatedAt?.toISOString() || startup.createdAt.toISOString(),
      };
    });
  }
  
  // Document operations
  async getDocument(id: string): Promise<Document | undefined> {
    const [document] = await db.select().from(documents).where(eq(documents.id, id));
    return document;
  }
  
  async getDocumentsByStartup(startupId: string): Promise<Document[]> {
    return db
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
    // Simplified text search using LIKE for MVP
    // In a real app, we would use pgvector's similarity search
    const searchTerms = query.toLowerCase().split(' ').filter(t => t.length > 2);
    
    if (searchTerms.length === 0) {
      // If no valid search terms, return recent chunks
      const baseQuery = db
        .select()
        .from(chunks)
        .orderBy(desc(chunks.id));
      
      const finalQuery = startupId 
        ? baseQuery.where(eq(chunks.startupId, startupId))
        : baseQuery;
      
      return finalQuery.limit(limit);
    }
    
    // Create simple search using ILIKE (case-insensitive)
    let baseQuery = db
      .select()
      .from(chunks)
      .where(
        sql`${chunks.content} ILIKE ${'%' + searchTerms[0] + '%'}`
      )
      .orderBy(desc(chunks.id));
    
    if (startupId) {
      baseQuery = baseQuery.where(eq(chunks.startupId, startupId));
    }
    
    return baseQuery.limit(limit);
  }
  
  // Memo operations
  async getMemo(id: string): Promise<Memo | undefined> {
    const [memo] = await db.select().from(memos).where(eq(memos.id, id));
    return memo;
  }
  
  async getMemosByStartup(startupId: string): Promise<Memo[]> {
    return db
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
      .set({ ...data, updatedAt: new Date() })
      .where(eq(memos.id, id))
      .returning();
    return updated;
  }
  
  // Activity operations
  async getRecentActivities(limit = 10): Promise<ActivityItem[]> {
    const rawActivities = await db.query.activities.findMany({
      with: {
        user: true,
        startup: true,
        document: true,
        memo: true,
      },
      orderBy: desc(activities.createdAt),
      limit,
    });
    
    return rawActivities.map(activity => ({
      id: activity.id,
      type: activity.type,
      userId: activity.userId || undefined,
      userName: activity.user?.name,
      startupId: activity.startupId || undefined,
      startupName: activity.startup?.name,
      documentId: activity.documentId || undefined,
      documentName: activity.document?.name,
      memoId: activity.memoId || undefined,
      timestamp: activity.createdAt.toISOString(),
      content: activity.content,
      metadata: activity.metadata as Record<string, any>,
    }));
  }
  
  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const [activity] = await db.insert(activities).values(insertActivity).returning();
    return activity;
  }
  
  // Dashboard operations
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    // Get counts from database
    const [[{ totalStartups }]] = await db
      .select({ totalStartups: sql`count(*)` })
      .from(startups);
    
    const [[{ activeDueDiligence }]] = await db
      .select({ activeDueDiligence: sql`count(*)` })
      .from(startups)
      .where(eq(startups.status, 'active'));
    
    const [[{ pendingMemos }]] = await db
      .select({ pendingMemos: sql`count(*)` })
      .from(memos)
      .where(eq(memos.status, 'draft'));
    
    const [[{ docsProcessed }]] = await db
      .select({ docsProcessed: sql`count(*)` })
      .from(documents)
      .where(eq(documents.processed, true));
    
    // In a real app, we would calculate trends by comparing with previous periods
    // For the MVP, we'll use static numbers
    return {
      totalStartups: Number(totalStartups),
      activeDueDiligence: Number(activeDueDiligence),
      pendingMemos: Number(pendingMemos),
      docsProcessed: Number(docsProcessed),
      trendStartups: 4,
      trendDD: 2,
      trendMemos: -1,
      trendDocs: 12,
    };
  }
  
  async getDueDiligenceProgress(startupId: string): Promise<DueDiligenceProgress> {
    const docs = await this.getDocumentsByStartup(startupId);
    
    // Group by document type to calculate completion by category
    const categories: Record<string, { uploaded: number, required: number }> = {
      'pitch-deck': { uploaded: 0, required: 1 },
      'financials': { uploaded: 0, required: 3 },
      'legal': { uploaded: 0, required: 2 },
      'tech': { uploaded: 0, required: 2 },
      'market': { uploaded: 0, required: 1 },
      'other': { uploaded: 0, required: 1 },
    };
    
    docs.forEach(doc => {
      if (categories[doc.type]) {
        categories[doc.type].uploaded += 1;
      }
    });
    
    // Calculate overall completion
    let totalUploaded = 0;
    let totalRequired = 0;
    
    const categoriesWithCompletion = Object.entries(categories).reduce((acc, [key, value]) => {
      totalUploaded += value.uploaded;
      totalRequired += value.required;
      
      return {
        ...acc,
        [key]: {
          ...value,
          completion: Math.min(Math.round((value.uploaded / value.required) * 100), 100),
        },
      };
    }, {});
    
    const overallCompletion = Math.min(Math.round((totalUploaded / totalRequired) * 100), 100);
    
    return {
      startupId,
      overallCompletion,
      categories: categoriesWithCompletion,
    };
  }
}

export const storage = new DatabaseStorage();
