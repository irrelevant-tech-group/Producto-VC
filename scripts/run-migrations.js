import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

// Configurar dotenv
dotenv.config();

// Obtener el directorio actual en ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  console.log('Iniciando migraciones...');
  
  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL no está definida');
    process.exit(1);
  }
  
  // Usar pg estándar
  const { Pool } = pg;
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  let client;
  
  try {
    console.log('Conectando a la base de datos...');
    client = await pool.connect();
    console.log('Conexión exitosa a la base de datos');
    
    const migrationsDir = path.join(__dirname, '..', 'migrations');
    
    // Filtrar para incluir solo 0001_add_pgvector.sql y excluir setup-db.sql
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .filter(file => file === '0001_add_pgvector.sql') // Solo ejecutar la primera migración
      .sort();
    
    console.log(`Encontradas ${migrationFiles.length} migraciones para ejecutar`);
    
    // Crear tabla de migraciones si no existe
    console.log('Creando tabla de migraciones si no existe...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        executed_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    
    // Obtener migraciones ya ejecutadas
    const { rows: executedMigrations } = await client.query('SELECT name FROM migrations');
    const executedMigrationNames = executedMigrations.map(row => row.name);
    
    for (const file of migrationFiles) {
      if (executedMigrationNames.includes(file)) {
        console.log(`Migración ${file} ya ejecutada, omitiendo...`);
        continue;
      }
      
      console.log(`Ejecutando migración: ${file}`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      try {
        // Ejecutar la migración
        await client.query(sql);
        
        // Registrar migración ejecutada
        await client.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
        
        console.log(`Migración ${file} ejecutada con éxito`);
      } catch (error) {
        console.error(`Error al ejecutar migración ${file}:`, error.message);
        throw error;
      }
    }
    
    console.log('Todas las migraciones ejecutadas correctamente');
  } catch (error) {
    console.error('Error al ejecutar migraciones:', error);
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
    console.log('Conexión a la base de datos cerrada');
  }
}

runMigrations().catch(error => {
  console.error('Error en la ejecución de migraciones:', error);
  process.exit(1);
});