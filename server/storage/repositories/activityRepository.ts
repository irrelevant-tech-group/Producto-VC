// server/storage/repositories/activityRepository.ts

import { eq, desc } from "drizzle-orm";
import { db } from "../../db";
import { activities, Activity, InsertActivity } from "@shared/schema";
import { ActivityItem } from "@shared/types";
import { IActivityRepository } from "../interfaces";

export class ActivityRepository implements IActivityRepository {
  async getRecentActivities(limit = 10, fundId?: string): Promise<ActivityItem[]> {
    let query = db.select().from(activities);
    
    if (fundId) {
      query = query.where(eq(activities.fundId, fundId));
    }
    
    const results = await query
      .orderBy(desc(activities.createdAt))
      .limit(limit);
   
    return results.map(activity => ({
      id: activity.id,
      type: activity.type,
      userId: activity.userId || undefined,
      userName: activity.userName || undefined,
      startupId: activity.startupId || undefined,
      startupName: activity.startupName || undefined,
      documentId: activity.documentId || undefined,
      documentName: activity.documentName || undefined,
      memoId: activity.memoId || undefined,
      timestamp: activity.createdAt?.toISOString() || new Date().toISOString(),
      content: activity.content || undefined,
      metadata: activity.metadata as Record<string, any>,
      fundId: activity.fundId || undefined,
    }));
  }
       
  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const [activity] = await db.insert(activities).values(insertActivity).returning();
    return activity;
  }
}