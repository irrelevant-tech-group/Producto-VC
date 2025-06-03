// server/storage/index.ts

import { IStorage } from './interfaces';
import { UserRepository } from './repositories/userRepository';
import { FundRepository } from './repositories/fundRepository';
import { StartupRepository } from './repositories/startupRepository';
import { DocumentRepository } from './repositories/documentRepository';
import { ChunkRepository } from './repositories/chunkRepository';
import { MemoRepository } from './repositories/memoRepository';
import { ActivityRepository } from './repositories/activityRepository';
import { DashboardRepository } from './repositories/dashboardRepository';
import { AiRepository } from './repositories/aiRepository';
import { InvestmentThesisRepository } from './repositories/investmentThesisRepository'; // ✅ Añadir import

export * from './interfaces';
export * from './types';

/**
 * Implementación principal de Storage que combina todos los repositorios
 */
class DatabaseStorage implements IStorage {
  private userRepository: UserRepository;
  private fundRepository: FundRepository;
  private startupRepository: StartupRepository;
  private documentRepository: DocumentRepository;
  private chunkRepository: ChunkRepository;
  private memoRepository: MemoRepository;
  private activityRepository: ActivityRepository;
  private dashboardRepository: DashboardRepository;
  private aiRepository: AiRepository;
  private investmentThesisRepository: InvestmentThesisRepository; // ✅ Añadir propiedad
  
  constructor() {
    // Iniciar repositorios con sus dependencias
    this.dashboardRepository = new DashboardRepository();
    this.documentRepository = new DocumentRepository();
    this.userRepository = new UserRepository();
    this.fundRepository = new FundRepository();
    this.startupRepository = new StartupRepository(this.dashboardRepository);
    this.chunkRepository = new ChunkRepository();
    this.memoRepository = new MemoRepository();
    this.activityRepository = new ActivityRepository();
    this.aiRepository = new AiRepository();
    this.investmentThesisRepository = new InvestmentThesisRepository(); // ✅ Inicializar
  }
  
  // User operations
  getUser = (id: number) => this.userRepository.getUser(id);
  getUserByUsername = (username: string) => this.userRepository.getUserByUsername(username);
  createUser = (user: any) => this.userRepository.createUser(user);
  getUserByEmail = (email: string) => this.userRepository.getUserByEmail(email);
  getUserByClerkId = (clerkId: string) => this.userRepository.getUserByClerkId(clerkId);
  updateUser = (id: number, data: any) => this.userRepository.updateUser(id, data);
  getUsersByFund = (fundId: string) => this.userRepository.getUsersByFund(fundId);
  
  // Fund operations
  getFund = (id: string) => this.fundRepository.getFund(id);
  getFundByClerkOrgId = (clerkOrgId: string) => this.fundRepository.getFundByClerkOrgId(clerkOrgId);
  createFund = (fund: any) => this.fundRepository.createFund(fund);
  updateFund = (id: string, data: any) => this.fundRepository.updateFund(id, data);
  getStartupsByFund = (fundId: string) => this.fundRepository.getStartupsByFund(fundId);
  getFunds = () => this.fundRepository.getFunds();
  
  // Startup operations
  getStartup = (id: string) => this.startupRepository.getStartup(id);
  getStartups = () => this.startupRepository.getStartups();
  createStartup = (startup: any) => this.startupRepository.createStartup(startup);
  updateStartup = (id: string, data: any) => this.startupRepository.updateStartup(id, data);
  getStartupSummaries = (fundId?: string) => this.startupRepository.getStartupSummaries(fundId);
  
  // Document operations
  getDocument = (id: string) => this.documentRepository.getDocument(id);
  getDocumentsByStartup = (startupId: string) => this.documentRepository.getDocumentsByStartup(startupId);
  createDocument = (document: any) => this.documentRepository.createDocument(document);
  updateDocument = (id: string, data: any) => this.documentRepository.updateDocument(id, data);
  
  // Chunk operations
  createChunk = (chunk: any) => this.chunkRepository.createChunk(chunk);
  searchChunks = (query: string, startupId?: string, limit?: number, fundId?: string) => 
    this.chunkRepository.searchChunks(query, startupId, limit, fundId);
  searchChunksByEmbedding = (embedding: number[], startupId?: string, limit?: number, fundId?: string) => 
    this.chunkRepository.searchChunksByEmbedding(embedding, startupId, limit, fundId);
  createChunkWithEmbedding = (chunk: any, embedding?: number[]) => 
    this.chunkRepository.createChunkWithEmbedding(chunk, embedding);
  
  // Memo operations
  getMemo = (id: string) => this.memoRepository.getMemo(id);
  getMemosByStartup = (startupId: string) => this.memoRepository.getMemosByStartup(startupId);
  createMemo = (memo: any) => this.memoRepository.createMemo(memo);
  updateMemo = (id: string, data: any) => this.memoRepository.updateMemo(id, data);
  
  // Activity operations
  getRecentActivities = (limit?: number, fundId?: string) => 
    this.activityRepository.getRecentActivities(limit, fundId);
  createActivity = (activity: any) => this.activityRepository.createActivity(activity);
  
  // Dashboard operations
  getDashboardMetrics = (fundId?: string) => this.dashboardRepository.getDashboardMetrics(fundId);
  getDueDiligenceProgress = (startupId: string) => this.dashboardRepository.getDueDiligenceProgress(startupId);
  
  // AI operations
  saveQuery = (query: any) => this.aiRepository.saveQuery(query);
  getQueryHistory = (options: any) => this.aiRepository.getQueryHistory(options);
  getPopularQuestions = (limit?: number, fundId?: string) => 
    this.aiRepository.getPopularQuestions(limit, fundId);

  // ✅ Investment Thesis operations - AÑADIR ESTOS MÉTODOS
  getActiveThesis = (fundId: string) => this.investmentThesisRepository.getActiveThesis(fundId);
  getThesisById = (id: string) => this.investmentThesisRepository.getThesisById(id);
  getThesisHistory = (fundId: string) => this.investmentThesisRepository.getThesisHistory(fundId);
  createThesis = (thesis: any) => this.investmentThesisRepository.createThesis(thesis);
  updateThesis = (id: string, data: any) => this.investmentThesisRepository.updateThesis(id, data);
  activateThesis = (id: string, fundId: string) => this.investmentThesisRepository.activateThesis(id, fundId);
}

// Exportar una instancia única
export const storage = new DatabaseStorage();