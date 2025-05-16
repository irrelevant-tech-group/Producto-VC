import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { pgvector } from 'pgvector/drizzle';
import ws from "ws";
import * as schema from "@shared/schema";

// Configuración de WebSocket para Neon
neonConfig.webSocketConstructor = ws;

// Configuraciones adicionales para mejorar la estabilidad de la conexión
neonConfig.wsProxyUrl = 'wss://proxy.neon.tech';
neonConfig.poolQueryTimeout = 60000; // 60 segundos
neonConfig.useSecureWebSocket = true;
neonConfig.pipelineConnect = false; // Deshabilitar pipeline connect para conexiones más estables

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Opciones de la pool para mejorar la estabilidad
const poolOptions = {
  connectionString: process.env.DATABASE_URL,
  max: 10, // máximo número de conexiones en el pool
  idleTimeoutMillis: 30000, // tiempo máximo que una conexión puede estar inactiva (30 segundos)
  connectionTimeoutMillis: 10000, // tiempo máximo para establecer una conexión (10 segundos)
  ssl: {
    rejectUnauthorized: true, // Forzar conexiones seguras
  },
};

// Para Neon PostgreSQL con pgvector
export const pool = new Pool(poolOptions);

// Configurar manejo de errores de conexión para el pool
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Inicializar Drizzle ORM con el schema
export const db = drizzle({ client: pool, schema });

// Función de utilidad para crear la extensión pgvector y los índices HNSW para búsqueda rápida
export async function createHnswIndexIfNeeded() {
  let client;
  try {
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
  } catch (error) {
    console.error('Error setting up vector extension or indices:', error);
    throw error; // Re-lanzar el error para que pueda ser manejado en el nivel superior
  } finally {
    if (client) client.release(); // Liberar la conexión de vuelta al pool
  }
}

// Función para verificar la conexión a la base de datos
export async function testDatabaseConnection() {
  let client;
  try {
    console.log('Testing database connection...');
    client = await pool.connect();
    const { rows } = await client.query('SELECT NOW() as time');
    console.log(`Database connection successful. Server time: ${rows[0].time}`);
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  } finally {
    if (client) client.release();
  }
}

// Función para cerrar el pool de conexiones (útil al finalizar la aplicación)
export async function closePool() {
  try {
    await pool.end();
    console.log('Database connection pool closed');
  } catch (error) {
    console.error('Error closing database connection pool:', error);
  }
}