// server/storage/repositories/memoRepository.ts

import { eq, desc } from "drizzle-orm";
import { db } from "../../db";
import { memos, Memo, InsertMemo } from "@shared/schema";
import { IMemoRepository } from "../interfaces";

export class MemoRepository implements IMemoRepository {
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
}