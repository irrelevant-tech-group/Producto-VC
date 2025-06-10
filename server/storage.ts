import { eq, and, desc, sql, count } from "drizzle-orm";
import { db } from "./db";
import {
  users, User, InsertUser,
  startups, Startup, InsertStartup,
  documents, Document, InsertDocument,
  chunks, Chunk, InsertChunk,
  memos, Memo, InsertMemo,
  activities, Activity, InsertActivity,
  funds, Fund, InsertFund
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


// Nuevo tipo para consultas AI
interface AiQuery {
  id: string;
  question: string;
  answer: string;
  sources: any[];
  startupId?: string;
  userId?: number;
  processingTimeMs: number;
  metadata?: Record<string, any>;
  createdAt: Date;
}

interface InsertAiQuery {
  question: string;
  answer: string;
  sources: any[];
  startupId?: string;
  userId?: number;
  processingTimeMs: number;
  metadata?: Record<string, any>;
  fundId?: string;
}

// Nuevo tipo para historial de consultas
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
  
  // Startup operations - ACTUALIZADO
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
  // User operations (sin cambios)
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
  
  // Métodos para usuarios con Clerk (sin cambios)
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
    return await db.select().from(users).where(eq(users.fundId, fundId));
  }
  
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
 
  // Startup operations - ACTUALIZADOS para nuevos campos
  async getStartup(id: string): Promise<Startup | undefined> {
    const [startup] = await db.select().from(startups).where(eq(startups.id, id));
    return startup;
  }
 
  async getStartups(): Promise<Startup[]> {
    return await db.select().from(startups).orderBy(desc(startups.createdAt));
  }
 
  // ACTUALIZADO - Mapear nuevos campos al INSERT
  async createStartup(insertStartup: InsertStartup): Promise<Startup> {
    // Preparar datos para inserción, manejando conversiones necesarias
    const insertData = {
      ...insertStartup,
      // Convertir amountSought a string para numeric column si es necesario
      amountSought: insertStartup.amountSought ? insertStartup.amountSought.toString() : null,
      // Convertir valuation a string para numeric column si es necesario
      valuation: insertStartup.valuation ? insertStartup.valuation.toString() : null,
      // Convertir investmentAmount a string para numeric column si es necesario
      investmentAmount: insertStartup.investmentAmount ? insertStartup.investmentAmount.toString() : null,
      // Asegurar que primaryContact es un objeto JSON válido
      primaryContact: insertStartup.primaryContact ? insertStartup.primaryContact : null,
      // Convertir firstContactDate string a Date object si es necesario
      firstContactDate: insertStartup.firstContactDate ? new Date(insertStartup.firstContactDate) : null,
      // Convertir investmentDate string a Date object si es necesario
      investmentDate: insertStartup.investmentDate ? new Date(insertStartup.investmentDate) : null
    };
 
    const [startup] = await db.insert(startups).values(insertData).returning();
    return startup;
  }
 
  async updateStartup(id: string, data: Partial<Startup>): Promise<Startup | undefined> {
    // Preparar datos para actualización
    const updateData = { ...data };
    
    // Convertir campos numéricos a string si están presentes
    if (updateData.amountSought !== undefined) {
      updateData.amountSought = updateData.amountSought ? updateData.amountSought.toString() : null;
    }
    if (updateData.valuation !== undefined) {
      updateData.valuation = updateData.valuation ? updateData.valuation.toString() : null;
    }
    if (updateData.investmentAmount !== undefined) {
      updateData.investmentAmount = updateData.investmentAmount ? updateData.investmentAmount.toString() : null;
    }
    
    // Convertir fechas si están presentes
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
 
  // ACTUALIZADO - Incluir nuevos campos en summaries
  async getStartupSummaries(fundId?: string): Promise<StartupSummary[]> {
    try {
      // Construir la consulta base
      let query = db
        .select({
          startup: startups,
          docCount: sql<number>`CAST(COUNT(${documents.id}) AS INTEGER)`
        })
        .from(startups)
        .leftJoin(documents, eq(startups.id, documents.startupId));
      
      // Añadir filtro por fundId si existe
      if (fundId) {
        query = query.where(eq(startups.fundId, fundId));
      }
      
      // Completar la consulta con agrupación y ordenamiento
      const startupsWithDocs = await query
        .groupBy(startups.id)
        .orderBy(desc(startups.createdAt));
 
      // Obtener progreso de due diligence para cada startup
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
      
      // Fallback: obtener datos básicos sin conteos adicionales
      let query = db.select().from(startups);
      
      // Añadir filtro por fundId si existe
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

  // NUEVO MÉTODO para estadísticas de inversión
  async getInvestmentStats(fundId?: string): Promise<InvestmentStats> {
    try {
      // Construir consulta base
      let baseQuery = db.select().from(startups);
      
      if (fundId) {
        baseQuery = baseQuery.where(eq(startups.fundId, fundId));
      }
      
      const allStartups = await baseQuery;
      
      // Filtrar solo las startups con inversión
      const investedStartups = allStartups.filter(s => s.status === 'invested' && s.investmentAmount);
      
      // Calcular estadísticas básicas
      const totalInvestments = investedStartups.length;
      const totalAmountInvested = investedStartups.reduce((sum, s) => 
        sum + (s.investmentAmount ? Number(s.investmentAmount) : 0), 0);
      const averageInvestment = totalInvestments > 0 ? totalAmountInvested / totalInvestments : 0;
      const portfolioCompanies = investedStartups.length;
      
      // Estadísticas por etapa
      const byStage: Record<string, { count: number; totalAmount: number }> = {};
      investedStartups.forEach(startup => {
        if (!byStage[startup.stage]) {
          byStage[startup.stage] = { count: 0, totalAmount: 0 };
        }
        byStage[startup.stage].count++;
        byStage[startup.stage].totalAmount += startup.investmentAmount ? Number(startup.investmentAmount) : 0;
      });
      
      // Estadísticas por vertical
      const byVertical: Record<string, { count: number; totalAmount: number }> = {};
      investedStartups.forEach(startup => {
        if (!byVertical[startup.vertical]) {
          byVertical[startup.vertical] = { count: 0, totalAmount: 0 };
        }
        byVertical[startup.vertical].count++;
        byVertical[startup.vertical].totalAmount += startup.investmentAmount ? Number(startup.investmentAmount) : 0;
      });
      
      // Estadísticas por status
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
        currency: 'USD' // Podríamos hacerlo dinámico basado en el fondo
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
 
  // Document operations (sin cambios)
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
 
  // Chunk operations (sin cambios)
  async createChunk(insertChunk: InsertChunk): Promise<Chunk> {
    const [chunk] = await db.insert(chunks).values(insertChunk).returning();
    return chunk;
  }
  
  async createChunkWithEmbedding(insertChunk: InsertChunk, embedding?: number[]): Promise<Chunk> {
    try {
      // Si ya se proporcionó un embedding, utilízalo
      if (embedding && Array.isArray(embedding)) {
        const [chunk] = await db.insert(chunks)
          .values({ ...insertChunk, embedding })
          .returning();
        return chunk;
      }
      
      // Si no hay embedding, intentar generarlo a partir del contenido del chunk
      let vectorEmbedding: number[] | null = null;
      let attempts = 0;
      const maxAttempts = 3;
      
      // Asegurar que tenemos un string válido para generar embedding
      const content = insertChunk.content;
      if (!content || typeof content !== 'string') {
        console.error("Error: el contenido del chunk no es un string válido");
        return this.createChunk(insertChunk); // Fallback a creación sin embedding
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
  
  // Búsqueda vectorial (sin cambios)
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
 
  // Búsqueda de texto (sin cambios)
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
       
  // Memo operations (sin cambios)
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
       
  // Activity operations (sin cambios)
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
       
  // Dashboard operations (sin cambios)
  async getDashboardMetrics(fundId?: string): Promise<DashboardMetrics> {
    try {
      // Base de las consultas
      let startupQuery = db.select({ count: sql<number>`count(*)::int` }).from(startups);
      let activeDDQuery = db.select({ count: sql<number>`count(*)::int` }).from(startups).where(eq(startups.status, 'active'));
      let pendingMemosQuery = db.select({ count: sql<number>`count(*)::int` }).from(memos).where(eq(memos.status, 'draft'));
      let docsProcessedQuery = db.select({ count: sql<number>`count(*)::int` }).from(documents).where(eq(documents.processingStatus, 'completed'));
      
      // Añadir filtro por fundId si existe
     if (fundId) {
      startupQuery = startupQuery.where(eq(startups.fundId, fundId));
      activeDDQuery = activeDDQuery.where(eq(startups.fundId, fundId));
      pendingMemosQuery = pendingMemosQuery.where(eq(memos.fundId, fundId));
      docsProcessedQuery = docsProcessedQuery.where(eq(documents.fundId, fundId));
    }
    
    // Ejecutar consultas
    const totalStartupsResult = await startupQuery;
    const totalStartups = totalStartupsResult[0]?.count || 0;
    
    const activeDueDiligenceResult = await activeDDQuery;
    const activeDueDiligence = activeDueDiligenceResult[0]?.count || 0;
    
    const pendingMemosResult = await pendingMemosQuery;
    const pendingMemos = pendingMemosResult[0]?.count || 0;
    
    const docsProcessedResult = await docsProcessedQuery;
    const docsProcessed = docsProcessedResult[0]?.count || 0;
    
    // Lógica para las tendencias permanece igual o podría ajustarse para considerar fundId
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
     
// Due Diligence Progress (sin cambios)
async getDueDiligenceProgress(startupId: string): Promise<DueDiligenceProgress> {
  try {
    // Obtener documentos del startup
    const docs = await this.getDocumentsByStartup(startupId);
    
    // Lista configurable de items requeridos por categoría
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
      'Additional Documents': { 
        required: 0, 
        importance: 'low',
        description: 'Additional Documents'
      }
    };
 
    // Contar documentos por categoría
    const categoriesStatus: any = {};
    let totalRequired = 0;
    let totalCompleted = 0;
 
    Object.entries(dueDiligenceCategories).forEach(([categoryKey, config]) => {
      const categoryDocs = docs.filter(doc => doc.type === categoryKey);
      const uploadedCount = categoryDocs.length;
      const processedCount = categoryDocs.filter(doc => doc.processingStatus === 'completed').length;
      
      // Calcular completitud para esta categoría
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
 
      // Sumar al total ponderado por importancia
      const weight = config.importance === 'high' ? 3 : config.importance === 'medium' ? 2 : 1;
      totalRequired += config.required * weight;
      totalCompleted += Math.min(uploadedCount, config.required) * weight;
    });
 
    // Calcular progreso general ponderado
    const overallCompletion = totalRequired > 0 
      ? Math.round((totalCompleted / totalRequired) * 100)
      : 0;
 
    // Contar items totales vs completados (para la respuesta simple)
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
    
    // Return fallback response
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
     
// OPERACIONES PARA CONSULTAS AI (sin cambios)
async saveQuery(insertQuery: InsertAiQuery): Promise<AiQuery> {
  try {
    // Crear UUID para la consulta usando uuid v4 en lugar de crypto
    const queryId = uuidv4();
    
    // Preparar datos para inserción
    const queryData = {
      id: queryId,
      question: insertQuery.question,
      answer: insertQuery.answer,
      sources: JSON.stringify(insertQuery.sources), // Guardar como JSON string
      startupId: insertQuery.startupId || null,
      userId: insertQuery.userId || null,
      processingTimeMs: insertQuery.processingTimeMs,
      metadata: insertQuery.metadata ? JSON.stringify(insertQuery.metadata) : null,
      fundId: insertQuery.fundId || null, // Añadimos fundId
      createdAt: new Date()
    };
    
    // Insertar en tabla ai_queries (asumiendo que existe)
    const insertSql = `
      INSERT INTO ai_queries (
        id, question, answer, sources, startup_id, user_id, 
        processing_time_ms, metadata, created_at, fund_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
      ) RETURNING *
    `;
    
    const result = await db.execute(sql.raw(insertSql, [
      queryData.id,
      queryData.question,
      queryData.answer,
      queryData.sources,
      queryData.startupId,
      queryData.userId,
      queryData.processingTimeMs,
      queryData.metadata,
      queryData.createdAt,
      queryData.fundId
    ]));
    
    const savedQuery = result.rows[0] as any;
    
    return {
      id: savedQuery.id,
      question: savedQuery.question,
      answer: savedQuery.answer,
      sources: JSON.parse(savedQuery.sources || '[]'),
      startupId: savedQuery.startup_id,
      userId: savedQuery.user_id,
      processingTimeMs: savedQuery.processing_time_ms,
      metadata: savedQuery.metadata ? JSON.parse(savedQuery.metadata) : null,
      createdAt: new Date(savedQuery.created_at)
    };
  } catch (error) {
    console.error("Error guardando consulta AI:", error);
    
    // Fallback: retornar un objeto AiQuery con los datos originales
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
      fundId // Nuevo parámetro
    } = options;
 
    // Construir query dinámicamente
    let whereConditions: string[] = [];
    let queryParams: any[] = [];
    let paramIndex = 1;
 
    if (startupId) {
      whereConditions.push(`startup_id = $${paramIndex}`);
      queryParams.push(startupId);
      paramIndex++;
    }
 
    if (userId) {
      whereConditions.push(`user_id = $${paramIndex}`);
      queryParams.push(userId);
      paramIndex++;
    }
 
    if (fromDate) {
      whereConditions.push(`created_at >= $${paramIndex}`);
      queryParams.push(fromDate);
      paramIndex++;
    }
 
    if (toDate) {
      whereConditions.push(`created_at <= $${paramIndex}`);
      queryParams.push(toDate);
      paramIndex++;
    }
    
    // Añadir filtro por fundId si existe
    if (fundId) {
      whereConditions.push(`fund_id = $${paramIndex}`);
      queryParams.push(fundId);
      paramIndex++;
    }
 
    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';
 
    const selectSql = `
      SELECT 
        id, question, answer, sources, startup_id, user_id,
        processing_time_ms, metadata, created_at, fund_id
      FROM ai_queries
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex}
    `;
 
    queryParams.push(limit);
 
    const result = await db.execute(sql.raw(selectSql, queryParams));
 
    return result.rows.map((row: any) => ({
      id: row.id,
      question: row.question,
      answer: row.answer,
      sources: JSON.parse(row.sources || '[]'),
      startupId: row.startup_id,
      userId: row.user_id,
      processingTimeMs: row.processing_time_ms,
      metadata: row.metadata ? JSON.parse(row.metadata) : null,
      createdAt: new Date(row.created_at)
    }));
  } catch (error) {
    console.error("Error obteniendo historial de consultas:", error);
    return [];
  }
}
     
async getPopularQuestions(limit = 10, fundId?: string): Promise<Array<{question: string; count: number}>> {
  try {
    let whereClauses = [];
    let params = [limit];
    let paramIndex = 1;
    
    whereClauses.push(`created_at >= NOW() - INTERVAL '30 days'`);
    
    if (fundId) {
      whereClauses.push(`fund_id = $${paramIndex + 1}`);
      params.push(fundId);
      paramIndex++;
    }
    
    const whereClause = whereClauses.length > 0 
      ? `WHERE ${whereClauses.join(' AND ')}` 
      : '';
    
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