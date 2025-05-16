import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Pool } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Configurar dotenv manualmente ya que no estamos usando -r dotenv/config
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
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    const migrationsDir = path.join(__dirname, '..', 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Ordenar archivos alfabéticamente
    
    console.log(`Encontradas ${migrationFiles.length} migraciones para ejecutar`);
    
    // Crear tabla de migraciones si no existe
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        executed_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    
    // Obtener migraciones ya ejecutadas
    const { rows: executedMigrations } = await pool.query('SELECT name FROM migrations');
    const executedMigrationNames = executedMigrations.map(row => row.name);
    
    for (const file of migrationFiles) {
      if (executedMigrationNames.includes(file)) {
        console.log(`Migración ${file} ya ejecutada, omitiendo...`);
        continue;
      }
      
      console.log(`Ejecutando migración: ${file}`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      // Ejecutar la migración
      await pool.query(sql);
      
      // Registrar migración ejecutada
      await pool.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
      
      console.log(`Migración ${file} ejecutada con éxito`);
    }
    
    console.log('Todas las migraciones ejecutadas correctamente');
  } catch (error) {
    console.error('Error al ejecutar migraciones:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();