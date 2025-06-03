import { eq, and, desc, sql, count } from "drizzle-orm";
import { db } from "./db";
import {
  users, User, InsertUser,
  startups, Startup, InsertStartup,
  documents, Document, InsertDocument,
  chunks, Chunk, InsertChunk,
  memos, Memo, InsertMemo,
  activities, Activity, InsertActivity,
  funds, Fund, InsertFund,
  aiQueries, AiQuery, InsertAiQuery
} from "@shared/schema";
import { 
  DashboardMetrics, 
  StartupSummary, 
  ActivityItem,
  DueDiligenceProgress,
  InvestmentStats
} from "@shared/types";
import { v4 as uuidv4 } from 'uuid';
import { generateEmbedding } from "./services/openai/index";

// Tipo para historial de consultas
interface QueryHistoryOptions {
  limit?: number;
  startupId?: string;
  userId?: number;
  fromDate?: Date;
  toDate?: Date;
  fundId?: string;
}

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByClerkId(clerkId: string): Promise<User | undefined>;
  updateUser(id: number, data: Partial<User>): Promise<User | undefined>;
  getUsersByFund(fundId: string): Promise<User[]>;
  
  // Fund operations
  getFund(id: string): Promise<Fund | undefined>;
  getFundByClerkOrgId(clerkOrgId: string): Promise<Fund | undefined>;
  createFund(fund: InsertFund): Promise<Fund>;
  updateFund(id: string, data: Partial<Fund>): Promise<Fund | undefined>;
  getStartupsByFund(fundId: string): Promise<Startup[]>;
  getFunds(): Promise<Fund[]>;
  
  // Startup operations
  getStartup(id: string): Promise<Startup | undefined>;
  getStartups(): Promise<Startup[]>;
  createStartup(startup: InsertStartup): Promise<Startup>;
  updateStartup(id: string, data: Partial<Startup>): Promise<Startup | undefined>;
  getStartupSummaries(fundId?: string): Promise<StartupSummary[]>;
  getInvestmentStats(fundId?: string): Promise<InvestmentStats>;
  
  // Document operations
  getDocument(id: string): Promise<Document | undefined>;
  getDocumentsByStartup(startupId: string): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: string, data: Partial<Document>): Promise<Document | undefined>;
  
  // Chunk operations
  createChunk(chunk: InsertChunk): Promise<Chunk>;
  searchChunks(query: string, startupId?: string, limit?: number, fundId?: string): Promise<Chunk[]>;
  
  // Búsqueda vectorial
  searchChunksByEmbedding(embedding: number[], startupId?: string, limit?: number, fundId?: string): Promise<Chunk[]>;
  createChunkWithEmbedding(chunk: InsertChunk, text: string): Promise<Chunk>;
  
  // Memo operations
  getMemo(id: string): Promise<Memo | undefined>;
  getMemosByStartup(startupId: string): Promise<Memo[]>;
  createMemo(memo: InsertMemo): Promise<Memo>;
  updateMemo(id: string, data: Partial<Memo>): Promise<Memo | undefined>;
  
  // Activity operations
  getRecentActivities(limit?: number, fundId?: string): Promise<ActivityItem[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  
  // Dashboard operations
  getDashboardMetrics(fundId?: string): Promise<DashboardMetrics>;
  getDueDiligenceProgress(startupId: string): Promise<DueDiligenceProgress>;
  
  // AI operaciones
  saveQuery(query: InsertAiQuery): Promise<AiQuery>;
  getQueryHistory(options: QueryHistoryOptions): Promise<AiQuery[]>;
  getPopularQuestions(limit?: number, fundId?: string): Promise<Array<{question: string; count: number}>>;
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
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }
  
  async getUserByClerkId(clerkId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.clerkId, clerkId));
    return user;
  }
  
  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  async getUsersByFund(fundId: string): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.fundId, fundId))
      .orderBy(users.name);
  }
  
  // Fund operations
  async getFund(id: string): Promise<Fund | undefined> {
    const [fund] = await db.select().from(funds).where(eq(funds.id, id));
    return fund;
  }
  
  async getFundByClerkOrgId(clerkOrgId: string): Promise<Fund | undefined> {
    const [fund] = await db.select().from(funds).where(eq(funds.clerkOrgId, clerkOrgId));
    return fund;
  }
  
  async createFund(insertFund: InsertFund): Promise<Fund> {
    const [fund] = await db.insert(funds).values(insertFund).returning();
    return fund;
  }
  
  async updateFund(id: string, data: Partial<Fund>): Promise<Fund | undefined> {
    const [updated] = await db
      .update(funds)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(funds.id, id))
      .returning();
    return updated;
  }
  
  async getFunds(): Promise<Fund[]> {
    return await db.select().from(funds).orderBy(desc(funds.createdAt));
  }
  
  async getStartupsByFund(fundId: string): Promise<Startup[]> {
    return await db
      .select()
      .from(startups)
      .where(eq(startups.fundId, fundId))
      .orderBy(desc(startups.createdAt));
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
    const insertData = {
      ...insertStartup,
      amountSought: insertStartup.amountSought ? insertStartup.amountSought.toString() : null,
      valuation: insertStartup.valuation ? insertStartup.valuation.toString() : null,
      investmentAmount: insertStartup.investmentAmount ? insertStartup.investmentAmount.toString() : null,
      primaryContact: insertStartup.primaryContact ? insertStartup.primaryContact : null,
      firstContactDate: insertStartup.firstContactDate ? new Date(insertStartup.firstContactDate) : null,
      investmentDate: insertStartup.investmentDate ? new Date(insertStartup.investmentDate) : null
    };
 
    const [startup] = await db.insert(startups).values(insertData).returning();
    return startup;
  }
 
  async updateStartup(id: string, data: Partial<Startup>): Promise<Startup | undefined> {
    const updateData = { ...data };
    
    if (updateData.amountSought !== undefined) {
      updateData.amountSought = updateData.amountSought ? updateData.amountSought.toString() : null;
    }
    if (updateData.valuation !== undefined) {
      updateData.valuation = updateData.valuation ? updateData.valuation.toString() : null;
    }
    if (updateData.investmentAmount !== undefined) {
      updateData.investmentAmount = updateData.investmentAmount ? updateData.investmentAmount.toString() : null;
    }
    
    if (updateData.firstContactDate && typeof updateData.firstContactDate === 'string') {
      updateData.firstContactDate = new Date(updateData.firstContactDate);
    }
    if (updateData.investmentDate && typeof updateData.investmentDate === 'string') {
      updateData.investmentDate = new Date(updateData.investmentDate);
    }
    
    const [updated] = await db
      .update(startups)
      .set({
        ...updateData,
        updatedAt: new Date()
      })
      .where(eq(startups.id, id))
      .returning();
    return updated;
  }
 
  async getStartupSummaries(fundId?: string): Promise<StartupSummary[]> {
    try {
      let query = db
        .select({
          startup: startups,
          docCount: sql<number>`CAST(COUNT(${documents.id}) AS INTEGER)`
        })
        .from(startups)
        .leftJoin(documents, eq(startups.id, documents.startupId));
      
      if (fundId) {
        query = query.where(eq(startups.fundId, fundId));
      }
      
      const startupsWithDocs = await query
        .groupBy(startups.id)
        .orderBy(desc(startups.createdAt));

      const summaries: StartupSummary[] = [];
      
      for (const { startup, docCount } of startupsWithDocs) {
        let completionPercentage = 0;
        
        try {
          const progress = await this.getDueDiligenceProgress(startup.id);
          completionPercentage = progress.overallCompletion || 0;
        } catch (error) {
          console.error(`Error getting due diligence progress for startup ${startup.id}:`, error);
        }

        summaries.push({
          id: startup.id,
          name: startup.name,
          vertical: startup.vertical,
          stage: startup.stage,
          location: startup.location,
          amountSought: startup.amountSought ? Number(startup.amountSought) : null,
          valuation: startup.valuation ? Number(startup.valuation) : null,
          currency: startup.currency || 'USD',
          status: startup.status || 'active',
          alignmentScore: startup.alignmentScore,
          documentsCount: docCount || 0,
          completionPercentage,
          lastUpdated: startup.updatedAt?.toISOString() || startup.createdAt?.toISOString() || new Date().toISOString(),
          fundId: startup.fundId || null,
          investmentDate: startup.investmentDate?.toISOString() || null,
          investmentAmount: startup.investmentAmount ? Number(startup.investmentAmount) : null,
          ownershipPercentage: startup.ownershipPercentage || null,
          decisionReason: startup.decisionReason || null,
        });
      }

      return summaries;
    } catch (error) {
      console.error("Error in getStartupSummaries:", error);
      
      let query = db.select().from(startups);
      
      if (fundId) {
        query = query.where(eq(startups.fundId, fundId));
      }
      
      const results = await query.orderBy(desc(startups.createdAt));
      
      return results.map(startup => ({
        id: startup.id,
        name: startup.name,
        vertical: startup.vertical,
        stage: startup.stage,
        location: startup.location,
        amountSought: startup.amountSought ? Number(startup.amountSought) : null,
        valuation: startup.valuation ? Number(startup.valuation) : null,
        currency: startup.currency || 'USD',
        status: startup.status || 'active',
        alignmentScore: startup.alignmentScore,
        documentsCount: 0,
        completionPercentage: 0,
        lastUpdated: startup.updatedAt?.toISOString() || startup.createdAt?.toISOString() || new Date().toISOString(),
        fundId: startup.fundId || null,
        investmentDate: startup.investmentDate?.toISOString() || null,
        investmentAmount: startup.investmentAmount ? Number(startup.investmentAmount) : null,
        ownershipPercentage: startup.ownershipPercentage || null,
        decisionReason: startup.decisionReason || null,
      }));
    }
  }

  async getInvestmentStats(fundId?: string): Promise<InvestmentStats> {
    try {
      let baseQuery = db.select().from(startups);
      
      if (fundId) {
        baseQuery = baseQuery.where(eq(startups.fundId, fundId));
      }
      
      const allStartups = await baseQuery;
      
      const investedStartups = allStartups.filter(s => s.status === 'invested' && s.investmentAmount);
      
      const totalInvestments = investedStartups.length;
      const totalAmountInvested = investedStartups.reduce((sum, s) => 
        sum + (s.investmentAmount ? Number(s.investmentAmount) : 0), 0);
      const averageInvestment = totalInvestments > 0 ? totalAmountInvested / totalInvestments : 0;
      const portfolioCompanies = investedStartups.length;
      
      const byStage: Record<string, { count: number; totalAmount: number }> = {};
      investedStartups.forEach(startup => {
        if (!byStage[startup.stage]) {
          byStage[startup.stage] = { count: 0, totalAmount: 0 };
        }
        byStage[startup.stage].count++;
        byStage[startup.stage].totalAmount += startup.investmentAmount ? Number(startup.investmentAmount) : 0;
      });
      
      const byVertical: Record<string, { count: number; totalAmount: number }> = {};
      investedStartups.forEach(startup => {
        if (!byVertical[startup.vertical]) {
          byVertical[startup.vertical] = { count: 0, totalAmount: 0 };
        }
        byVertical[startup.vertical].count++;
        byVertical[startup.vertical].totalAmount += startup.investmentAmount ? Number(startup.investmentAmount) : 0;
      });
      
      const byStatus = {
        active: allStartups.filter(s => s.status === 'active').length,
        invested: allStartups.filter(s => s.status === 'invested').length,
        standby: allStartups.filter(s => s.status === 'standby').length,
        declined: allStartups.filter(s => s.status === 'declined').length,
        archived: allStartups.filter(s => s.status === 'archived').length,
      };
     
      return {
        totalInvestments,
        totalAmountInvested,
        averageInvestment,
        portfolioCompanies,
        byStage,
        byVertical,
        byStatus,
        currency: 'USD'
      };
    } catch (error) {
      console.error("Error getting investment stats:", error);
      return {
        totalInvestments: 0,
        totalAmountInvested: 0,
        averageInvestment: 0,
        portfolioCompanies: 0,
        byStage: {},
        byVertical: {},
        byStatus: {
          active: 0,
          invested: 0,
          standby: 0,
          declined: 0,
          archived: 0
        },
        currency: 'USD'
      };
    }
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
      })
      .where(eq(documents.id, id))
      .returning();
    return updated;
  }
 
  // Chunk operations
  async createChunk(insertChunk: InsertChunk): Promise<Chunk> {
    const [chunk] = await db.insert(chunks).values(insertChunk).returning();
    return chunk;
  }
  
  async createChunkWithEmbedding(insertChunk: InsertChunk, embedding?: number[]): Promise<Chunk> {
    try {
      if (embedding && Array.isArray(embedding)) {
        const [chunk] = await db.insert(chunks)
          .values({ ...insertChunk, embedding })
          .returning();
        return chunk;
      }
      
      let vectorEmbedding: number[] | null = null;
      let attempts = 0;
      const maxAttempts = 3;
      
      const content = insertChunk.content;
      if (!content || typeof content !== 'string') {
        console.error("Error: el contenido del chunk no es un string válido");
        return this.createChunk(insertChunk);
      }
      
      while (attempts < maxAttempts) {
        try {
          vectorEmbedding = await generateEmbedding(content);
          break;
        } catch (err) {
          attempts++;
          console.error(`Error generando embedding (intento ${attempts}/${maxAttempts}):`, err);
          
          if (attempts >= maxAttempts) {
            throw err;
          }
          
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempts)));
        }
      }
      
      if (vectorEmbedding) {
        const [chunk] = await db.insert(chunks)
          .values({ ...insertChunk, embedding: vectorEmbedding })
          .returning();
        return chunk;
      } else {
        return this.createChunk(insertChunk);
      }
    } catch (error) {
      console.error("Error al crear chunk con embedding:", error);
      return this.createChunk(insertChunk);
    }
  }
  
  async searchChunksByEmbedding(embedding: number[], startupId?: string, limit = 5, fundId?: string): Promise<Chunk[]> {
    try {
      const isValidUUID = (id: string) => {
        return id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      };
      
      if (startupId && !isValidUUID(startupId)) {
        throw new Error("Invalid startupId format");
      }
      
      const embeddingStr = `[${embedding.join(',')}]`;
      
      let whereClause = "embedding IS NOT NULL";
      
      if (startupId) {
        whereClause += ` AND startup_id = '${startupId}'`;
      }
      
      if (fundId) {
        whereClause += ` AND fund_id = '${fundId}'`;
      }
      
      const query = `
        SELECT *, 
               1 - (embedding <=> '${embeddingStr}'::vector) as similarity
        FROM chunks 
        WHERE ${whereClause}
        ORDER BY embedding <=> '${embeddingStr}'::vector
        LIMIT ${limit}
      `;
      
      const result = await db.execute(sql.raw(query));
      
      return result.rows as Chunk[];
    } catch (error) {
      console.error("Error en búsqueda vectorial:", error);
      
      if (startupId) {
        return this.searchChunks("", startupId, limit, fundId);
      }
      return [];
    }
  }
 
  async searchChunks(query: string, startupId?: string, limit = 5, fundId?: string): Promise<Chunk[]> {
    try {
      if (query && query.trim() !== '') {
        try {
          const queryEmbedding = await generateEmbedding(query);
          return await this.searchChunksByEmbedding(queryEmbedding, startupId, limit, fundId);
        } catch (embeddingError) {
          console.error("Error en búsqueda vectorial, fallback a búsqueda de texto:", embeddingError);
        }
      }
      
      const isValidUUID = (id: string) => {
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      };
      
      if (!query || query.trim() === '') {
        let sqlQuery = `SELECT * FROM chunks WHERE 1=1`;
        
        if (startupId && isValidUUID(startupId)) {
          sqlQuery += ` AND startup_id = '${startupId}'`;
        }
        
        if (fundId) {
          sqlQuery += ` AND fund_id = '${fundId}'`;
        }
        
        sqlQuery += ` LIMIT ${limit}`;
        
        const results = await db.execute(sql.raw(sqlQuery));
        return results.rows as Chunk[];
      }
            
      const keywords = query
        .toLowerCase()
        .split(/\s+/)
        .filter(word => word.length >= 3)
        .map(word => word.replace(/[^\w]/g, ''));
      
      if (keywords.length === 0) {
        let sqlQuery = `SELECT * FROM chunks WHERE 1=1`;
        
        if (startupId && isValidUUID(startupId)) {
          sqlQuery += ` AND startup_id = '${startupId}'`;
        }
        
        if (fundId) {
          sqlQuery += ` AND fund_id = '${fundId}'`;
        }
        
        sqlQuery += ` LIMIT ${limit}`;
        
        const results = await db.execute(sql.raw(sqlQuery));
        return results.rows as Chunk[];
      }
      
      const keywordConditions = keywords.map(keyword => {
        return `content ILIKE '%${keyword}%'`;
      }).join(' OR ');
      
      let sqlQuery = `
        SELECT * FROM chunks 
        WHERE (${keywordConditions})
      `;
      
      if (startupId && isValidUUID(startupId)) {
        sqlQuery += ` AND startup_id = '${startupId}'`;
      }
      
      if (fundId) {
        sqlQuery += ` AND fund_id = '${fundId}'`;
      }
      
      sqlQuery += ` LIMIT ${limit}`;
      
      let results = await db.execute(sql.raw(sqlQuery));
      
      if (results.rows.length === 0 && (startupId && isValidUUID(startupId))) {
        sqlQuery = `SELECT * FROM chunks WHERE startup_id = '${startupId}'`;
        
        if (fundId) {
          sqlQuery += ` AND fund_id = '${fundId}'`;
        }
        
        sqlQuery += ` LIMIT ${limit}`;
        
        results = await db.execute(sql.raw(sqlQuery));
      }
      
      return results.rows as Chunk[];
    } catch (error) {
      console.error("Error searching chunks:", error);
      if (startupId) {
        try {
          let sqlQuery = `SELECT * FROM chunks WHERE startup_id = '${startupId}'`;
          
          if (fundId) {
            sqlQuery += ` AND fund_id = '${fundId}'`;
          }
          
          sqlQuery += ` LIMIT ${limit}`;
          
          const results = await db.execute(sql.raw(sqlQuery));
          return results.rows as Chunk[];
        } catch (err) {
          console.error("Error in fallback chunk search:", err);
          return [];
        }
      }
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
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(memos.id, id))
      .returning();
    return updated;
  }
       
  // Activity operations
  async getRecentActivities(limit = 10, fundId?: string): Promise<ActivityItem[]> {
    let query = db.select().from(activities);
    
    if (fundId) {
      query = query.where(eq(activities.fundId, fundId));
    }
    
    const results = await query
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
      fundId: activity.fundId || undefined,
    }));
  }
       
  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const [activity] = await db.insert(activities).values(insertActivity).returning();
    return activity;
  }
       
  // Dashboard operations
  async getDashboardMetrics(fundId?: string): Promise<DashboardMetrics> {
    try {
      let startupQuery = db.select({ count: sql<number>`count(*)::int` }).from(startups);
      let activeDDQuery = db.select({ count: sql<number>`count(*)::int` }).from(startups).where(eq(startups.status, 'active'));
      let pendingMemosQuery = db.select({ count: sql<number>`count(*)::int` }).from(memos).where(eq(memos.status, 'draft'));
      let docsProcessedQuery = db.select({ count: sql<number>`count(*)::int` }).from(documents).where(eq(documents.processingStatus, 'completed'));
      
      if (fundId) {
        startupQuery = startupQuery.where(eq(startups.fundId, fundId));
        activeDDQuery = activeDDQuery.where(eq(startups.fundId, fundId));
        pendingMemosQuery = pendingMemosQuery.where(eq(memos.fundId, fundId));
        docsProcessedQuery = docsProcessedQuery.where(eq(documents.fundId, fundId));
      }
      
      const totalStartupsResult = await startupQuery;
      const totalStartups = totalStartupsResult[0]?.count || 0;
      
      const activeDueDiligenceResult = await activeDDQuery;
      const activeDueDiligence = activeDueDiligenceResult[0]?.count || 0;
      
      const pendingMemosResult = await pendingMemosQuery;
      const pendingMemos = pendingMemosResult[0]?.count || 0;
      
      const docsProcessedResult = await docsProcessedQuery;
      const docsProcessed = docsProcessedResult[0]?.count || 0;
      
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
    try {
      const docs = await this.getDocumentsByStartup(startupId);
      
      const dueDiligenceCategories = {
        'pitch-deck': { 
          required: 1, 
          importance: 'high',
          description: 'Company presentation and vision'
        },
        'financials': { 
          required: 3, 
          importance: 'high',
          description: 'Financial statements, projections, unit economics'
        },
        'legal': { 
          required: 4, 
          importance: 'medium',
          description: 'Corporate structure, IP, contracts, compliance'
        },
        'tech': { 
          required: 2, 
          importance: 'high',
          description: 'Technical documentation, architecture, security'
        },
        'market': { 
          required: 2, 
          importance: 'medium',
          description: 'Market research, competitive analysis'
        },
        'other': { 
          required: 0, 
          importance: 'low',
          description: 'Additional supporting documents'
        }
      };
 
      const categoriesStatus: any = {};
      let totalRequired = 0;
      let totalCompleted = 0;
 
      Object.entries(dueDiligenceCategories).forEach(([categoryKey, config]) => {
        const categoryDocs = docs.filter(doc => doc.type === categoryKey);
        const uploadedCount = categoryDocs.length;
        const processedCount = categoryDocs.filter(doc => doc.processingStatus === 'completed').length;
        
        const completion = config.required > 0 
          ? Math.min(100, Math.round((uploadedCount / config.required) * 100))
          : 100;
 
        categoriesStatus[categoryKey] = {
          required: config.required,
          uploaded: uploadedCount,
          processed: processedCount,
          completion,
          importance: config.importance,
          description: config.description,
          missingDocs: Math.max(0, config.required - uploadedCount)
        };
 
        const weight = config.importance === 'high' ? 3 : config.importance === 'medium' ? 2 : 1;
        totalRequired += config.required * weight;
        totalCompleted += Math.min(uploadedCount, config.required) * weight;
      });
 
      const overallCompletion = totalRequired > 0 
        ? Math.round((totalCompleted / totalRequired) * 100)
        : 0;
 
      const allRequiredItems = Object.values(dueDiligenceCategories).reduce((sum, cat) => sum + cat.required, 0);
      const allCompletedItems = Object.values(categoriesStatus).reduce((sum: number, cat: any) => 
        sum + Math.min(cat.uploaded, cat.required), 0);
 
      return {
        totalItems: allRequiredItems,
        completedItems: allCompletedItems,
        percentage: overallCompletion,
        startupId,
        overallCompletion,
        categories: categoriesStatus,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Error calculating due diligence progress for startup ${startupId}:`, error);
      
      return {
        totalItems: 12,
        completedItems: 0,
        percentage: 0,
        startupId,
        overallCompletion: 0,
        categories: {},
        lastUpdated: new Date().toISOString()
      };
    }
  }
     
  // AI OPERATIONS - CORREGIDAS
  async saveQuery(insertQuery: InsertAiQuery): Promise<AiQuery> {
    try {
      // Usar Drizzle ORM con la tabla aiQueries
      const [savedQuery] = await db.insert(aiQueries).values({
        question: insertQuery.question,
        answer: insertQuery.answer,
        sources: insertQuery.sources,
        startupId: insertQuery.startupId || null,
        userId: insertQuery.userId || null,
        processingTimeMs: insertQuery.processingTimeMs,
        metadata: insertQuery.metadata || null,
        fundId: insertQuery.fundId || null
      }).returning();
      
      return {
        id: savedQuery.id,
        question: savedQuery.question,
        answer: savedQuery.answer,
        sources: savedQuery.sources as any[],
        startupId: savedQuery.startupId,
        userId: savedQuery.userId,
        processingTimeMs: savedQuery.processingTimeMs,
        metadata: savedQuery.metadata as Record<string, any>,
        createdAt: savedQuery.createdAt
      };
    } catch (error) {
      console.error("Error guardando consulta AI:", error);
      
      return {
        id: uuidv4(),
        question: insertQuery.question,
        answer: insertQuery.answer,
        sources: insertQuery.sources,
        startupId: insertQuery.startupId,
        userId: insertQuery.userId,
        processingTimeMs: insertQuery.processingTimeMs,
        metadata: insertQuery.metadata,
        createdAt: new Date()
      };
    }
  }
     
  async getQueryHistory(options: QueryHistoryOptions): Promise<AiQuery[]> {
    try {
      const {
        limit = 20,
        startupId,
        userId,
        fromDate,
        toDate,
        fundId
      } = options;
 
      let query = db.select().from(aiQueries);
      let conditions = [];
 
      if (startupId) {
        conditions.push(eq(aiQueries.startupId, startupId));
      }
 
      if (userId) {
        conditions.push(eq(aiQueries.userId, userId));
      }
 
      if (fromDate) {
        conditions.push(sql`${aiQueries.createdAt} >= ${fromDate}`);
      }
 
      if (toDate) {
        conditions.push(sql`${aiQueries.createdAt} <= ${toDate}`);
      }
      
      if (fundId) {
        conditions.push(eq(aiQueries.fundId, fundId));
      }
 
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
 
      const results = await query
        .orderBy(desc(aiQueries.createdAt))
        .limit(limit);
 
      return results.map((row) => ({
        id: row.id,
        question: row.question,
        answer: row.answer,
        sources: row.sources as any[] || [],
        startupId: row.startupId,
        userId: row.userId,
        processingTimeMs: row.processingTimeMs,
        metadata: row.metadata as Record<string, any>,
        createdAt: row.createdAt
      }));
    } catch (error) {
      console.error("Error obteniendo historial de consultas:", error);
      return [];
    }
  }
     
  async getPopularQuestions(limit = 10, fundId?: string): Promise<Array<{question: string; count: number}>> {
    try {
      let whereClauses = ['created_at >= NOW() - INTERVAL \'30 days\''];
      let params = [limit];
      let paramIndex = 2;
      
      if (fundId) {
        whereClauses.push(`fund_id = $${paramIndex}`);
        params.push(fundId);
        paramIndex++;
      }
      
      const whereClause = `WHERE ${whereClauses.join(' AND ')}`;
      
      const popularSql = `
        SELECT 
          question, 
          COUNT(*) as count
        FROM ai_queries
        ${whereClause}
        GROUP BY question
        HAVING COUNT(*) > 1
        ORDER BY count DESC, question
        LIMIT $1
      `;
 
      const result = await db.execute(sql.raw(popularSql, params));
 
      return result.rows.map((row: any) => ({
        question: row.question,
        count: parseInt(row.count)
      }));
    } catch (error) {
      console.error("Error obteniendo preguntas populares:", error);
      return [];
    }
  }
 }
     
 export const storage = new DatabaseStorage();