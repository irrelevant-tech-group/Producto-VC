// server/storage/interfaces.ts

import {
  User, InsertUser,
  Startup, InsertStartup,
  Document, InsertDocument,
  Chunk, InsertChunk,
  Memo, InsertMemo,
  Activity, InsertActivity,
  Fund, InsertFund
} from "@shared/schema";
import { 
  DashboardMetrics, 
  StartupSummary, 
  ActivityItem,
  DueDiligenceProgress,
  InvestmentStats
} from "@shared/types";
import { AiQuery, InsertAiQuery, QueryHistoryOptions } from './types';

// Interface for User Repository
export interface IUserRepository {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByClerkId(clerkId: string): Promise<User | undefined>;
  updateUser(id: number, data: Partial<User>): Promise<User | undefined>;
  getUsersByFund(fundId: string): Promise<User[]>;
}

// Interface for Fund Repository
export interface IFundRepository {
  getFund(id: string): Promise<Fund | undefined>;
  getFundByClerkOrgId(clerkOrgId: string): Promise<Fund | undefined>;
  createFund(fund: InsertFund): Promise<Fund>;
  updateFund(id: string, data: Partial<Fund>): Promise<Fund | undefined>;
  getStartupsByFund(fundId: string): Promise<Startup[]>;
  getFunds(): Promise<Fund[]>;
}

// Interface for Startup Repository - ACTUALIZADA
export interface IStartupRepository {
  getStartup(id: string): Promise<Startup | undefined>;
  getStartups(): Promise<Startup[]>;
  createStartup(startup: InsertStartup): Promise<Startup>;
  updateStartup(id: string, data: Partial<Startup>): Promise<Startup | undefined>;
  getStartupSummaries(fundId?: string): Promise<StartupSummary[]>;
  getInvestmentStats(fundId?: string): Promise<InvestmentStats>;
}

// Interface for Document Repository
export interface IDocumentRepository {
  getDocument(id: string): Promise<Document | undefined>;
  getDocumentsByStartup(startupId: string): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: string, data: Partial<Document>): Promise<Document | undefined>;
}

// Interface for Chunk Repository
export interface IChunkRepository {
  createChunk(chunk: InsertChunk): Promise<Chunk>;
  searchChunks(query: string, startupId?: string, limit?: number, fundId?: string): Promise<Chunk[]>;
  searchChunksByEmbedding(embedding: number[], startupId?: string, limit?: number, fundId?: string): Promise<Chunk[]>;
  createChunkWithEmbedding(chunk: InsertChunk, embedding?: number[]): Promise<Chunk>;
}

// Interface for Memo Repository
export interface IMemoRepository {
  getMemo(id: string): Promise<Memo | undefined>;
  getMemosByStartup(startupId: string): Promise<Memo[]>;
  createMemo(memo: InsertMemo): Promise<Memo>;
  updateMemo(id: string, data: Partial<Memo>): Promise<Memo | undefined>;
}

// Interface for Activity Repository
export interface IActivityRepository {
  getRecentActivities(limit?: number, fundId?: string): Promise<ActivityItem[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;
}

// Interface for Dashboard Repository
export interface IDashboardRepository {
  getDashboardMetrics(fundId?: string): Promise<DashboardMetrics>;
  getDueDiligenceProgress(startupId: string): Promise<DueDiligenceProgress>;
}

// Interface for AI Repository
export interface IAiRepository {
  saveQuery(query: InsertAiQuery): Promise<AiQuery>;
  getQueryHistory(options: QueryHistoryOptions): Promise<AiQuery[]>;
  getPopularQuestions(limit?: number, fundId?: string): Promise<Array<{question: string; count: number}>>;
}

// Main Storage Interface - combines all repositories - ACTUALIZADA
export interface IStorage extends 
  IUserRepository, 
  IFundRepository, 
  IStartupRepository, 
  IDocumentRepository, 
  IChunkRepository,
  IMemoRepository,
  IActivityRepository,
  IDashboardRepository,
  IAiRepository {
    // Añadir método de estadísticas de inversión
    getInvestmentStats(fundId?: string): Promise<InvestmentStats>;
  }