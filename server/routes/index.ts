// server/routes/index.ts

import type { Express } from "express";
import { createServer, type Server } from "http";
import { errorHandler } from "./middlewares";

// Import all route modules
import authRouter from './auth';
import dashboardRouter from './dashboard';
import startupsRouter from './startups';
import documentsRouter from './documents';
import aiRouter from './ai';
import memosRouter from './memos';
import fundsRouter from './funds';
import usersRouter from './users';
import investmentThesisRouter from './investmentThesis';
import dueDiligenceRouter from './dueDiligence';

export async function registerRoutes(app: Express): Promise<Server> {
  // API prefix
  const apiRouter = '/api';

  // Set up health check route (no auth required)
  app.get(`${apiRouter}/health`, (req, res) => {
    res.json({ status: 'ok', version: '1.0.0' });
  });

  // Register all route modules
  app.use(`${apiRouter}/auth`, authRouter);
  app.use(`${apiRouter}/dashboard`, dashboardRouter);
  app.use(`${apiRouter}/startups`, startupsRouter);
  app.use(`${apiRouter}/documents`, documentsRouter);
  app.use(`${apiRouter}/ai`, aiRouter);
  app.use(`${apiRouter}/memos`, memosRouter);
  app.use(`${apiRouter}/due-diligence`, dueDiligenceRouter);
  app.use(`${apiRouter}/funds`, fundsRouter);
  app.use(`${apiRouter}/users`, usersRouter);
  app.use(`${apiRouter}/investment-thesis`, investmentThesisRouter); // ✅ Ruta ya registrada

  // Global error handler
  app.use(errorHandler);

  // Create and return the HTTP server
  const httpServer = createServer(app);
  return httpServer;
}

export default registerRoutes;