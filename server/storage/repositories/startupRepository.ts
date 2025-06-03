// server/storage/repositories/startupRepository.ts

import { eq, desc, sql, and, isNotNull } from "drizzle-orm";
import { db } from "../../db";
import { startups, documents, Startup, InsertStartup } from "@shared/schema";
import { StartupSummary, InvestmentStats } from "@shared/types";
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
}