// server/storage/repositories/chunkRepository.ts

import { eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { chunks, Chunk, InsertChunk } from "@shared/schema";
import { IChunkRepository } from "../interfaces";
import { generateEmbedding } from "../../services/openai";
import { isValidUUID } from "../utils/validation";

export class ChunkRepository implements IChunkRepository {
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
        console.error("Error: contenido del chunk no válido");
        return this.createChunk(insertChunk);
      }
      
      while (attempts < maxAttempts) {
        try {
          vectorEmbedding = await generateEmbedding(content);
          break;
        } catch (err) {
          attempts++;
          console.error(`Error generando embedding (${attempts}/${maxAttempts}):`, err);
          
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
  
  async searchChunksByEmbedding(
    embedding: number[], 
    startupId?: string, 
    limit = 5, 
    fundId?: string
  ): Promise<Chunk[]> {
    try {
      console.log(`🔍 Búsqueda vectorial - StartupId: ${startupId || 'all'}, FundId: ${fundId || 'all'}, Limit: ${limit}`);
      
      if (startupId && !isValidUUID(startupId)) {
        throw new Error("Invalid startupId format");
      }
      
      const embeddingStr = `[${embedding.join(',')}]`;
      
      let whereConditions = ["embedding IS NOT NULL"];
      
      if (startupId) {
        whereConditions.push(`startup_id = '${startupId}'`);
      }
      
      if (fundId) {
        whereConditions.push(`fund_id = '${fundId}'`);
      }
      
      const whereClause = whereConditions.join(' AND ');
      
      const query = `
        SELECT *, 
               1 - (embedding <=> '${embeddingStr}'::vector) as similarity
        FROM chunks 
        WHERE ${whereClause}
        ORDER BY embedding <=> '${embeddingStr}'::vector
        LIMIT ${limit}
      `;
      
      const result = await db.execute(sql.raw(query));
      console.log(`✅ Búsqueda vectorial: ${result.rows.length} resultados`);
      
      return result.rows as Chunk[];
    } catch (error) {
      console.error("❌ Error en búsqueda vectorial:", error);
      
      if (startupId) {
        console.log(`🔄 Fallback a búsqueda de texto`);
        return this.searchChunks("", startupId, limit, fundId);
      }
      return [];
    }
  }
 
  async searchChunks(
    query: string, 
    startupId?: string, 
    limit = 5, 
    fundId?: string
  ): Promise<Chunk[]> {
    try {
      console.log(`🔍 Búsqueda texto - Query: "${query}", StartupId: ${startupId || 'all'}, FundId: ${fundId || 'all'}`);
      
      // Si hay query específico, intentar vectorial primero
      if (query && query.trim() !== '') {
        try {
          const queryEmbedding = await generateEmbedding(query);
          console.log(`🔄 Usando búsqueda vectorial para: "${query}"`);
          return await this.searchChunksByEmbedding(queryEmbedding, startupId, limit, fundId);
        } catch (embeddingError) {
          console.error("❌ Error embedding, continuando con texto:", embeddingError);
        }
      }
      
      // Construir condiciones WHERE
      let whereConditions = ["1=1"];
      
      if (startupId && isValidUUID(startupId)) {
        whereConditions.push(`startup_id = '${startupId}'`);
      }
      
      if (fundId) {
        whereConditions.push(`fund_id = '${fundId}'`);
      }
      
      // Query básico sin filtro de texto
      if (!query || query.trim() === '') {
        const basicQuery = `
          SELECT * FROM chunks 
          WHERE ${whereConditions.join(' AND ')}
          ORDER BY id
          LIMIT ${limit}
        `;
        
        console.log(`📄 Query básico sin filtro de texto`);
        const results = await db.execute(sql.raw(basicQuery));
        console.log(`✅ Búsqueda básica: ${results.rows.length} resultados`);
        return results.rows as Chunk[];
      }
      
      // Búsqueda por keywords
      const keywords = query
        .toLowerCase()
        .split(/\s+/)
        .filter(word => word.length >= 2) // Reducir de 3 a 2 caracteres
        .map(word => word.replace(/[^\w]/g, ''))
        .slice(0, 10); // Limitar a 10 keywords
      
      if (keywords.length === 0) {
        console.log(`⚠️ Sin keywords válidas, usando query básico`);
        const basicQuery = `
          SELECT * FROM chunks 
          WHERE ${whereConditions.join(' AND ')}
          LIMIT ${limit}
        `;
        
        const results = await db.execute(sql.raw(basicQuery));
        return results.rows as Chunk[];
      }
      
      const keywordConditions = keywords.map(keyword => {
        return `content ILIKE '%${keyword}%'`;
      }).join(' OR ');
      
      let sqlQuery = `
        SELECT * FROM chunks 
        WHERE (${keywordConditions}) AND ${whereConditions.slice(1).join(' AND ')}
        ORDER BY id
        LIMIT ${limit}
      `;
      
      console.log(`📄 Búsqueda por keywords: ${keywords.length} términos`);
      let results = await db.execute(sql.raw(sqlQuery));
      
      // Si no hay resultados con keywords, intentar query más simple
      if (results.rows.length === 0) {
        console.log(`⚠️ Sin resultados con keywords, intentando query simple`);
        const simpleQuery = `
          SELECT * FROM chunks 
          WHERE ${whereConditions.join(' AND ')}
          LIMIT ${limit}
        `;
        
        results = await db.execute(sql.raw(simpleQuery));
      }
      
      console.log(`✅ Búsqueda texto completada: ${results.rows.length} resultados`);
      return results.rows as Chunk[];
      
    } catch (error) {
      console.error("❌ Error en búsqueda de texto:", error);
      
      // Fallback de emergencia
      if (startupId && isValidUUID(startupId)) {
        try {
          const emergencyQuery = `SELECT * FROM chunks WHERE startup_id = '${startupId}' LIMIT ${limit}`;
          const results = await db.execute(sql.raw(emergencyQuery));
          console.log(`🆘 Fallback emergencia: ${results.rows.length} resultados`);
          return results.rows as Chunk[];
        } catch (err) {
          console.error("❌ Error en fallback de emergencia:", err);
          return [];
        }
      }
      return [];
    }
  }
}