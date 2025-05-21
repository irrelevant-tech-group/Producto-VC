// server/storage/repositories/userRepository.ts

import { eq } from "drizzle-orm";
import { db } from "../../db";
import { users, User, InsertUser } from "@shared/schema";
import { IUserRepository } from "../interfaces";

export class UserRepository implements IUserRepository {
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
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }
  
  async getUserByClerkId(clerkId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.clerkId, clerkId));
    return user;
  }
  
  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();
    return updated;
  }
  
  async getUsersByFund(fundId: string): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.fundId, fundId))
      .orderBy(users.name);
  }
}