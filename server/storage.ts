import { eq, and, desc, sql, count } from "drizzle-orm";
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
import { generateEmbedding } from "./services/openai";

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
}

// Nuevo tipo para historial de consultas
interface QueryHistoryOptions {
  limit?: number;
  startupId?: string;
  userId?: number;
  fromDate?: Date;
  toDate?: Date;
}

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
  
  // Búsqueda vectorial
  searchChunksByEmbedding(embedding: number[], startupId?: string, limit?: number): Promise<Chunk[]>;
  createChunkWithEmbedding(chunk: InsertChunk, text: string): Promise<Chunk>;
  
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
  
  // NUEVAS operaciones para consultas AI
  saveQuery(query: InsertAiQuery): Promise<AiQuery>;
  getQueryHistory(options: QueryHistoryOptions): Promise<AiQuery[]>;
  getPopularQuestions(limit?: number): Promise<Array<{question: string; count: number}>>;
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
 
  // Startup operations - ACTUALIZADOS
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
      // Asegurar que primaryContact es un objeto JSON válido
      primaryContact: insertStartup.primaryContact ? insertStartup.primaryContact : null,
      // Convertir firstContactDate string a Date object si es necesario
      firstContactDate: insertStartup.firstContactDate ? new Date(insertStartup.firstContactDate) : null
    };
 
    const [startup] = await db.insert(startups).values(insertData).returning();
    return startup;
  }
 
  async updateStartup(id: string, data: Partial<Startup>): Promise<Startup | undefined> {
    const [updated] = await db
      .update(startups)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(startups.id, id))
      .returning();
    return updated;
  }
 
  // ACTUALIZADO - Incluir documentsCount y completionPercentage
  async getStartupSummaries(): Promise<StartupSummary[]> {
    try {
      // Obtener startups con conteo de documentos en una sola query
      const startupsWithDocs = await db
        .select({
          startup: startups,
          docCount: sql<number>`CAST(COUNT(${documents.id}) AS INTEGER)`
        })
        .from(startups)
        .leftJoin(documents, eq(startups.id, documents.startupId))
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
          currency: startup.currency || 'USD',
          status: startup.status || 'active',
          alignmentScore: startup.alignmentScore,
          documentsCount: docCount || 0,
          completionPercentage,
          lastUpdated: startup.updatedAt?.toISOString() || startup.createdAt?.toISOString() || new Date().toISOString(),
        });
      }
 
      return summaries;
    } catch (error) {
      console.error("Error in getStartupSummaries:", error);
      
      // Fallback: obtener datos básicos sin conteos adicionales
      const results = await db.select().from(startups).orderBy(desc(startups.createdAt));
      
      return results.map(startup => ({
        id: startup.id,
        name: startup.name,
        vertical: startup.vertical,
        stage: startup.stage,
        location: startup.location,
        amountSought: startup.amountSought ? Number(startup.amountSought) : null,
        currency: startup.currency || 'USD',
        status: startup.status || 'active',
        alignmentScore: startup.alignmentScore,
        documentsCount: 0,
        completionPercentage: 0,
        lastUpdated: startup.updatedAt?.toISOString() || startup.createdAt?.toISOString() || new Date().toISOString(),
      }));
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
        // No hay updatedAt en documents, pero si lo hubiera:
        // updatedAt: new Date()
      })
      .where(eq(documents.id, id))
      .returning();
    return updated;
  }
 
  // Chunk operations (sin cambios significativos)
  async createChunk(insertChunk: InsertChunk): Promise<Chunk> {
    const [chunk] = await db.insert(chunks).values(insertChunk).returning();
    return chunk;
  }
  
  async createChunkWithEmbedding(insertChunk: InsertChunk, text: string): Promise<Chunk> {
    try {
      let embedding: number[] | null = null;
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        try {
          embedding = await generateEmbedding(text);
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
      
      if (embedding) {
        const [chunk] = await db.insert(chunks)
          .values({ ...insertChunk, embedding })
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
  
  async searchChunksByEmbedding(embedding: number[], startupId?: string, limit = 5): Promise<Chunk[]> {
    try {
      const isValidUUID = (id: string) => {
        return id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      };
      
      if (startupId && !isValidUUID(startupId)) {
        throw new Error("Invalid startupId format");
      }
      
      const embeddingStr = `[${embedding.join(',')}]`;
      
      let query;
      
      if (startupId) {
        query = `
          SELECT *, 
                 1 - (embedding <=> '${embeddingStr}'::vector) as similarity
          FROM chunks 
          WHERE startup_id = '${startupId}' 
            AND embedding IS NOT NULL
          ORDER BY embedding <=> '${embeddingStr}'::vector
          LIMIT ${limit}
        `;
      } else {
        query = `
          SELECT *, 
                 1 - (embedding <=> '${embeddingStr}'::vector) as similarity
          FROM chunks 
          WHERE embedding IS NOT NULL
          ORDER BY embedding <=> '${embeddingStr}'::vector
          LIMIT ${limit}
        `;
      }
      
      const result = await db.execute(sql.raw(query));
      
      return result.rows as Chunk[];
    } catch (error) {
      console.error("Error en búsqueda vectorial:", error);
      
      if (startupId) {
        return this.searchChunks("", startupId, limit);
      }
      return [];
    }
  }
 
  async searchChunks(query: string, startupId?: string, limit = 5): Promise<Chunk[]> {
    try {
      if (query && query.trim() !== '') {
        try {
          const queryEmbedding = await generateEmbedding(query);
          return await this.searchChunksByEmbedding(queryEmbedding, startupId, limit);
        } catch (embeddingError) {
          console.error("Error en búsqueda vectorial, fallback a búsqueda de texto:", embeddingError);
        }
      }
      
      const isValidUUID = (id: string) => {
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      };
      
      if (!query || query.trim() === '') {
        if (startupId && isValidUUID(startupId)) {
          const results = await db.execute(
            sql`SELECT * FROM chunks 
                WHERE startup_id = ${startupId}
                LIMIT ${limit}`);
                return results.rows as Chunk[];
              }
              return [];
            }
            
            const keywords = query
              .toLowerCase()
              .split(/\s+/)
              .filter(word => word.length >= 3)
              .map(word => word.replace(/[^\w]/g, ''));
            
            if (keywords.length === 0) {
              if (startupId && isValidUUID(startupId)) {
                const results = await db.execute(
                  sql`SELECT * FROM chunks 
                      WHERE startup_id = ${startupId}
                      LIMIT ${limit}`
                );
                return results.rows as Chunk[];
              }
              return [];
            }
            
            const keywordConditions = keywords.map(keyword => {
              return `content ILIKE '%${keyword}%'`;
            }).join(' OR ');
            
            let results;
            
            if (startupId && isValidUUID(startupId)) {
              const sqlQuery = `
                SELECT * FROM chunks 
                WHERE (${keywordConditions})
                AND startup_id = '${startupId}'
                LIMIT ${limit}
              `;
              results = await db.execute(sql.raw(sqlQuery));
            } else {
              const sqlQuery = `
                SELECT * FROM chunks 
                WHERE (${keywordConditions})
                LIMIT ${limit}
              `;
              results = await db.execute(sql.raw(sqlQuery));
            }
            
            if (results.rows.length === 0 && startupId && isValidUUID(startupId)) {
              results = await db.execute(
                sql`SELECT * FROM chunks 
                    WHERE startup_id = ${startupId}
                    LIMIT ${limit}`
              );
            }
            
            return results.rows as Chunk[];
          } catch (error) {
            console.error("Error searching chunks:", error);
            if (startupId) {
              try {
                const results = await db.execute(
                  sql`SELECT * FROM chunks 
                      WHERE startup_id = ${startupId}
                      LIMIT ${limit}`
                );
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
       
        // Dashboard operations (sin cambios)
        async getDashboardMetrics(): Promise<DashboardMetrics> {
          try {
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
       
        // NUEVA FUNCIÓN - Progreso de due diligence
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
              'other': { 
                required: 0, 
                importance: 'low',
                description: 'Additional supporting documents'
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
       
        // NUEVAS operaciones para consultas AI con persistencia
        async saveQuery(insertQuery: InsertAiQuery): Promise<AiQuery> {
          try {
            // Crear UUID para la consulta
            const queryId = crypto.randomUUID();
            
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
              createdAt: new Date()
            };
            
            // Insertar en tabla ai_queries (asumiendo que existe)
            const insertSql = `
              INSERT INTO ai_queries (
                id, question, answer, sources, startup_id, user_id, 
                processing_time_ms, metadata, created_at
              ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9
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
              queryData.createdAt
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
              id: crypto.randomUUID(),
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
              toDate
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
       
            const whereClause = whereConditions.length > 0 
              ? `WHERE ${whereConditions.join(' AND ')}`
              : '';
       
            const selectSql = `
              SELECT 
                id, question, answer, sources, startup_id, user_id,
                processing_time_ms, metadata, created_at
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
       
        async getPopularQuestions(limit = 10): Promise<Array<{question: string; count: number}>> {
          try {
            const popularSql = `
              SELECT 
                question, 
                COUNT(*) as count
              FROM ai_queries
              WHERE created_at >= NOW() - INTERVAL '30 days'
              GROUP BY question
              HAVING COUNT(*) > 1
              ORDER BY count DESC, question
              LIMIT $1
            `;
       
            const result = await db.execute(sql.raw(popularSql, [limit]));
       
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