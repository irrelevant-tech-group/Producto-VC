// server/index.ts
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes"; // Cambio aquí - importamos la función, no el default
import { setupVite, serveStatic, log } from "./vite";
import { createHnswIndexIfNeeded, testDatabaseConnection } from "./db";
import * as dotenv from 'dotenv';

// Importación correcta de Clerk SDK
import { clerkClient } from '@clerk/clerk-sdk-node';

// Cargar variables de entorno
dotenv.config();

// Verificar configuración de Clerk
if (!process.env.CLERK_SECRET_KEY) {
  console.error('Error: CLERK_SECRET_KEY no está definida');
  process.exit(1);
}

// No es necesario inicializar clerkClient, ya viene configurado automáticamente
// al leer CLERK_SECRET_KEY de las variables de entorno

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Tipo para usuario autenticado en request
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        clerkId: string;
        email: string;
        name: string;
        role: string;
        fundId: string;
        orgName: string;
        orgLogo?: string;
      };
    }
  }
}

// Middleware para logging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.originalUrl;
  console.log(`[${timestamp}] ${method} ${url}`);
  next();
});

async function initializeServer() {
  try {
    // Validar la conexión a la base de datos primero
    const isConnected = await testDatabaseConnection();

    if (!isConnected) {
      console.error("No se pudo establecer conexión con la base de datos");
      process.exit(1);
    }

    // Verificar conexión con Clerk
    try {
      // Hacemos una llamada simple para verificar que Clerk funciona
      const users = await clerkClient.users.getUserList({
        limit: 1,
      });
      log('Clerk API health check success');
    } catch (clerkError) {
      console.error('Error conectando con Clerk API:', clerkError);
      process.exit(1);
    }

    // Resto de inicialización
    console.log("Inicializando extensión pgvector y creando índices HNSW...");
    await createHnswIndexIfNeeded();
    console.log("Inicialización de pgvector completada");

    // Compartir clerkClient con otras partes de la aplicación
    app.locals.clerk = clerkClient;

    // Registrar rutas de API
    const server = await registerRoutes(app);

    // Error handling middleware global
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      
      console.error(`[ERROR] ${status} - ${message}`);
      if (err.stack && process.env.NODE_ENV === 'development') {
        console.error(err.stack);
      }
      
      res.status(status).json({ 
        message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined 
      });
    });

    // Setup para desarrollo o producción
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Iniciar servidor
    const port = process.env.PORT ? parseInt(process.env.PORT) : 5000;
    server.listen(
      {
        port,
        host: "0.0.0.0",
        reusePort: true,
      },
      () => {
        log(`Servidor iniciado en puerto ${port} - Entorno: ${app.get("env")}`);
      }
    );
  } catch (error) {
    console.error("Error durante la inicialización del servidor:", error);
    process.exit(1);
  }
}

initializeServer().catch((err) => {
  console.error("Error fatal durante el arranque:", err);
  process.exit(1);
});