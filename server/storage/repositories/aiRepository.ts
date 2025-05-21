// server/storage/repositories/aiRepository.ts

import { sql } from "drizzle-orm";
import { db } from "../../db";
import { v4 as uuidv4 } from 'uuid';
import { IAiRepository } from "../interfaces";
import { AiQuery, InsertAiQuery, QueryHistoryOptions } from "../types";
import { safeParse } from "../utils/validation";

export class AiRepository implements IAiRepository {
  async saveQuery(insertQuery: InsertAiQuery): Promise<AiQuery> {
    try {
      // Crear UUID para la consulta usando uuid v4
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
      
      // Insertar en tabla ai_queries
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
        sources: safeParse(savedQuery.sources) || [],
        startupId: savedQuery.startup_id,
        userId: savedQuery.user_id,
        processingTimeMs: savedQuery.processing_time_ms,
        metadata: safeParse(savedQuery.metadata),
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
        sources: safeParse(row.sources) || [],
        startupId: row.startup_id,
        userId: row.user_id,
        processingTimeMs: row.processing_time_ms,
        metadata: safeParse(row.metadata),
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