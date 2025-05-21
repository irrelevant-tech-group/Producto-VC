// server/storage/repositories/dashboardRepository.ts

import { eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { startups, documents, memos } from "@shared/schema";
import { DashboardMetrics, DueDiligenceProgress } from "@shared/types";
import { IDashboardRepository } from "../interfaces";

export class DashboardRepository implements IDashboardRepository {
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
      
      // Calcular tendencias (en una implementación real, se compararían con datos históricos)
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
      // Obtener documentos del startup
      const docsQuery = await db
        .select()
        .from(documents)
        .where(eq(documents.startupId, startupId));
        
      const docs = docsQuery || [];
      
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
}