// server/storage/repositories/investmentThesisRepository.ts

import { eq, and, desc } from "drizzle-orm";
import { db } from "../../db";
import { investmentThesis, InvestmentThesis, InsertInvestmentThesis } from "@shared/schema";

export interface IInvestmentThesisRepository {
  getActiveThesis(fundId: string): Promise<InvestmentThesis | undefined>;
  getThesisById(id: string): Promise<InvestmentThesis | undefined>;
  getThesisHistory(fundId: string): Promise<InvestmentThesis[]>;
  createThesis(thesis: InsertInvestmentThesis): Promise<InvestmentThesis>;
  updateThesis(id: string, data: Partial<InvestmentThesis>): Promise<InvestmentThesis | undefined>;
  activateThesis(id: string, fundId: string): Promise<InvestmentThesis | undefined>;
}

export class InvestmentThesisRepository implements IInvestmentThesisRepository {
  async getActiveThesis(fundId: string): Promise<InvestmentThesis | undefined> {
    const [thesis] = await db
      .select()
      .from(investmentThesis)
      .where(and(
        eq(investmentThesis.fundId, fundId),
        eq(investmentThesis.isActive, true)
      ));
    return thesis;
  }

  async getThesisById(id: string): Promise<InvestmentThesis | undefined> {
    const [thesis] = await db
      .select()
      .from(investmentThesis)
      .where(eq(investmentThesis.id, id));
    return thesis;
  }

  async getThesisHistory(fundId: string): Promise<InvestmentThesis[]> {
    return await db
      .select()
      .from(investmentThesis)
      .where(eq(investmentThesis.fundId, fundId))
      .orderBy(desc(investmentThesis.createdAt));
  }

  async createThesis(insertThesis: InsertInvestmentThesis): Promise<InvestmentThesis> {
    // Si es la primera tesis del fondo, marcarla como activa
    if (insertThesis.isActive) {
      // Desactivar todas las tesis anteriores del fondo
      await db
        .update(investmentThesis)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(investmentThesis.fundId, insertThesis.fundId));
    }

    const [thesis] = await db
      .insert(investmentThesis)
      .values(insertThesis)
      .returning();
    return thesis;
  }

  async updateThesis(id: string, data: Partial<InvestmentThesis>): Promise<InvestmentThesis | undefined> {
    const [updated] = await db
      .update(investmentThesis)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(investmentThesis.id, id))
      .returning();
    return updated;
  }

  async activateThesis(id: string, fundId: string): Promise<InvestmentThesis | undefined> {
    // Desactivar todas las tesis del fondo
    await db
      .update(investmentThesis)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(investmentThesis.fundId, fundId));

    // Activar la tesis específica
    const [activated] = await db
      .update(investmentThesis)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(investmentThesis.id, id))
      .returning();
    
    return activated;
  }
}