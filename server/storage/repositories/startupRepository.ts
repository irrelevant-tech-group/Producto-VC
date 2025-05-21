// server/storage/repositories/startupRepository.ts

import { eq, desc, sql } from "drizzle-orm";
import { db } from "../../db";
import { startups, documents, Startup, InsertStartup } from "@shared/schema";
import { StartupSummary } from "@shared/types";
import { IStartupRepository } from "../interfaces";
import { IDashboardRepository } from "../interfaces";

export class StartupRepository implements IStartupRepository {
  private dashboardRepository: IDashboardRepository;
  
  constructor(dashboardRepository: IDashboardRepository) {
    this.dashboardRepository = dashboardRepository;
  }
  
  async getStartup(id: string): Promise<Startup | undefined> {
    const [startup] = await db.select().from(startups).where(eq(startups.id, id));
    return startup;
  }
 
  async getStartups(): Promise<Startup[]> {
    return await db.select().from(startups).orderBy(desc(startups.createdAt));
  }
 
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
          const progress = await this.dashboardRepository.getDueDiligenceProgress(startup.id);
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
          fundId: startup.fundId || null,
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
        currency: startup.currency || 'USD',
        status: startup.status || 'active',
        alignmentScore: startup.alignmentScore,
        documentsCount: 0,
        completionPercentage: 0,
        lastUpdated: startup.updatedAt?.toISOString() || startup.createdAt?.toISOString() || new Date().toISOString(),
        fundId: startup.fundId || null,
      }));
    }
  }
}