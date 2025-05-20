import { execSync } from 'child_process';
import { join } from 'path';
import * as dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

async function setupClerkAuth() {
  try {
    console.log('Iniciando configuración de autenticación con Clerk...');
    
    // Verificar variables de entorno
    if (!process.env.CLERK_SECRET_KEY) {
      throw new Error('CLERK_SECRET_KEY no está definida en las variables de entorno');
    }
    
    if (!process.env.SUPERADMIN_EMAIL) {
      throw new Error('SUPERADMIN_EMAIL no está definida en las variables de entorno');
    }
    
    // Ejecutar migración para actualizar la base de datos
    console.log('Ejecutando migración para Clerk Auth...');
    execSync('node scripts/run-migrations.js migrations/20240519_add_clerk_auth.sql', { 
      stdio: 'inherit',
      cwd: process.cwd() 
    });
    
    // Inicializar el superadmin
    console.log('Configurando superadmin...');
    execSync('npx ts-node scripts/init-superadmin.ts', { 
      stdio: 'inherit',
      cwd: process.cwd() 
    });
    
    console.log('Configuración de Clerk completada con éxito!');
  } catch (error) {
    console.error('Error durante la configuración de Clerk:', error);
    process.exit(1);
  }
}

setupClerkAuth()
  .then(() => {
    console.log('Proceso completado');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error en el script de configuración:', err);
    process.exit(1);
  });