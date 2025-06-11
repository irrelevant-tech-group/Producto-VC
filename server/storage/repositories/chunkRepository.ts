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
  
  async searchChunksByEmbedding(
    embedding: number[], 
    startupId?: string, 
    limit = 5, 
    fundId?: string
  ): Promise<Chunk[]> {
    try {
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
 
  async searchChunks(
    query: string, 
    startupId?: string, 
    limit = 5, 
    fundId?: string
  ): Promise<Chunk[]> {
    try {
      if (query && query.trim() !== '') {
        try {
          const queryEmbedding = await generateEmbedding(query);
          return await this.searchChunksByEmbedding(queryEmbedding, startupId, limit, fundId);
        } catch (embeddingError) {
          console.error("Error en búsqueda vectorial, fallback a búsqueda de texto:", embeddingError);
        }
      }
      
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
}