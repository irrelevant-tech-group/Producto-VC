import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

async function runMigrations() {
  console.log('Iniciando migraciones.');

  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL no está definida');
    process.exit(1);
  }

  const { Pool } = pg;
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  let client;
  try {
    console.log('Conectando a la base de datos...');
    client = await pool.connect();
    console.log('Conexión exitosa a la base de datos');

    // Apunta a <projectRoot>/migrations en lugar de scripts/migrations
    const migrationsDir = path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      '..',           // subir un nivel: de scripts/ a projectRoot/
      'migrations'    // carpeta migrations en la raíz
    );

    if (!fs.existsSync(migrationsDir)) {
      throw new Error(`No se encontró la carpeta de migraciones en: ${migrationsDir}`);
    }

    // Leer todas las migraciones .sql (excluyendo backups) y ordenarlas
    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql') && !file.endsWith('.backup.sql'))
      .sort();

    console.log(`Encontradas ${migrationFiles.length} migraciones para ejecutar`);

    // Asegurar existencia de la tabla de seguimiento de migraciones
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        executed_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Obtener migraciones ya ejecutadas
    const { rows: executed } = await client.query('SELECT name FROM migrations');
    const executedNames = executed.map(r => r.name);

    for (const file of migrationFiles) {
      if (executedNames.includes(file)) {
        console.log(`🟡 Migración ${file} ya ejecutada, omitiendo.`);
        continue;
      }

      console.log(`🟢 Ejecutando migración: ${file}`);
      const sqlContent = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await client.query(sqlContent);
      await client.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
      console.log(`✅ Migración ${file} ejecutada con éxito`);
    }

    console.log('🏁 Todas las migraciones ejecutadas correctamente');
  } catch (err) {
    console.error('❌ Error al ejecutar migraciones:', err);
    process.exit(1);
  } finally {
    if (client) client.release();
    await pool.end();
    console.log('🔒 Conexión a la base de datos cerrada');
  }
}

runMigrations().catch(err => {
  console.error('❌ Error en la ejecución de migraciones:', err);
  process.exit(1);
});
