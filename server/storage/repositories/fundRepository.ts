// server/storage/repositories/fundRepository.ts

import { eq, desc } from "drizzle-orm";
import { db } from "../../db";
import { funds, Fund, InsertFund, startups, Startup } from "@shared/schema";
import { IFundRepository } from "../interfaces";

export class FundRepository implements IFundRepository {
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
}