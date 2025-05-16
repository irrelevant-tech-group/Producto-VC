import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { pgvector } from 'pgvector/drizzle';
import ws from "ws";
import * as schema from "@shared/schema";

// Configuración básica de WebSocket para Neon
neonConfig.webSocketConstructor = ws;

// Configuraciones ajustadas para mejor compatibilidad
neonConfig.useSecureWebSocket = false; // Cambiar a false para evitar problemas SSL
neonConfig.pipelineConnect = 'auto'; // Usar auto en lugar de false
neonConfig.poolQueryTimeout = 120000; // Aumentar timeout a 120 segundos

// Eliminar wsProxyUrl que puede causar problemas
// neonConfig.wsProxyUrl = 'wss://proxy.neon.tech';

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

console.log("Attempting to connect to database...");

// Opciones de pool ajustadas
const poolOptions = {
  connectionString: process.env.DATABASE_URL,
  max: 5, // Reducir máximo de conexiones para evitar sobrecarga
  idleTimeoutMillis: 60000, // Aumentar timeout de inactividad
  connectionTimeoutMillis: 30000, // Aumentar timeout de conexión
  ssl: {
    rejectUnauthorized: false // Cambiar a false si hay problemas con certificados SSL
  },
};

// Para Neon PostgreSQL con pgvector
export const pool = new Pool(poolOptions);

// Configurar manejo de errores de conexión para el pool
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  // No terminar el proceso, solo registrar el error
  // process.exit(-1);
});

// Inicializar Drizzle ORM con el schema
export const db = drizzle({ client: pool, schema });

// Función de utilidad para crear la extensión pgvector y los índices HNSW para búsqueda rápida
export async function createHnswIndexIfNeeded() {
  let client;
  let retries = 3; // Intentar hasta 3 veces
  
  while (retries > 0) {
    try {
      console.log(`Attempting to connect to database (retries left: ${retries})...`);
      // Obtener una conexión del pool
      client = await pool.connect();
      
      console.log('Creating pgvector extension...');
      await client.query('CREATE EXTENSION IF NOT EXISTS vector');
      
      console.log('Checking if chunks table exists...');
      const { rows: tableExists } = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'chunks'
        ) as exists
      `);
      
      // Si la tabla chunks no existe, crear los índices no tiene sentido
      if (!tableExists[0].exists) {
        console.log('Table chunks does not exist yet. Skip creating indices.');
        return;
      }
      
      console.log('Creating HNSW index on chunks.embedding...');
      // Crea un índice HNSW para búsquedas eficientes
      await client.query(`
        CREATE INDEX IF NOT EXISTS chunks_embedding_idx 
        ON chunks USING hnsw(embedding vector_l2_ops) 
        WITH (
          m = 16,
          ef_construction = 64
        );
      `);
      
      console.log('Creating index on startup_id...');
      await client.query(`
        CREATE INDEX IF NOT EXISTS chunks_startup_id_idx 
        ON chunks(startup_id);
      `);
      
      console.log('Creating index on document_id...');
      await client.query(`
        CREATE INDEX IF NOT EXISTS chunks_document_id_idx 
        ON chunks(document_id);
      `);
      
      console.log('Vector extension and indices setup successful');
      break; // Si llegamos aquí, todo funcionó y podemos salir del bucle
      
    } catch (error) {
      console.error(`Error setting up vector extension or indices (attempt ${4-retries}/3):`, error);
      retries--;
      
      if (retries === 0) {
        console.error('All connection attempts failed. Please check your database configuration.');
        throw error; // Re-lanzar el error en el último intento
      }
      
      // Esperar antes de reintentar
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } finally {
      if (client) {
        try {
          client.release(); // Liberar la conexión de vuelta al pool
        } catch (e) {
          console.error('Error releasing client:', e);
        }
      }
    }
  }
}

// Función para verificar la conexión a la base de datos con reintentos
export async function testDatabaseConnection() {
  let client;
  let retries = 3; // Intentar hasta 3 veces
  
  while (retries > 0) {
    try {
      console.log(`Testing database connection (retries left: ${retries})...`);
      client = await pool.connect();
      const { rows } = await client.query('SELECT NOW() as time');
      console.log(`Database connection successful. Server time: ${rows[0].time}`);
      return true;
    } catch (error) {
      console.error(`Database connection test failed (attempt ${4-retries}/3):`, error);
      retries--;
      
      if (retries === 0) {
        console.error('All connection attempts failed. Please check your database configuration.');
        return false;
      }
      
      // Esperar antes de reintentar
      await new Promise(resolve => setTimeout(resolve, 2000));
    } finally {
      if (client) {
        try {
          client.release();
        } catch (e) {
          console.error('Error releasing client:', e);
        }
      }
    }
  }
  
  return false;
}

// Función para cerrar el pool de conexiones (útil al finalizar la aplicación)
export async function closePool() {
  try {
    console.log('Closing database connection pool...');
    await pool.end();
    console.log('Database connection pool closed successfully');
  } catch (error) {
    console.error('Error closing database connection pool:', error);
  }
}