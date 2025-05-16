import { v4 as uuidv4 } from 'uuid';
import { storage } from '../server/storage';

/**
 * Script para cargar datos esenciales para el asistente de IA
 * Este script carga chunks de documentos para un startup existente
 * para que el asistente de IA pueda responder consultas.
 */
async function loadAIDocuments() {
  try {
    console.log('Iniciando carga de datos para el asistente IA...');
    
    // 1. Obtener el usuario existente o crear uno nuevo si no existe
    let user = await storage.getUserByUsername("davidrodriguez");
    
    if (!user) {
      user = await storage.createUser({
        username: "davidrodriguez",
        password: "password123",
        name: "David Rodriguez",
        email: "david.rodriguez@example.com",
        position: "Investment Analyst",
      });
      console.log(`Usuario creado: ${user.name} (ID: ${user.id})`);
    } else {
      console.log(`Usuario existente: ${user.name} (ID: ${user.id})`);
    }
    
    // 2. Obtener startups existentes
    const startups = await storage.getStartups();
    
    if (startups.length === 0) {
      console.log('No hay startups en la base de datos. Creando uno nuevo...');
      
      // Crear un startup si no existe ninguno
      const startup = await storage.createStartup({
        id: uuidv4(),
        name: "TechVision AI",
        description: "Plataforma de análisis de imágenes usando inteligencia artificial para el sector retail",
        vertical: "ai",
        stage: "seed",
        location: "Ciudad de México, México",
        foundedDate: new Date("2022-03-15").toISOString(),
        amountSought: 500000,
        currency: "USD",
        website: "https://techvision-ai.com",
        status: "active",
        alignmentScore: 85,
      });
      
      console.log(`Startup creado: ${startup.name} (${startup.id})`);
      processStartup(startup, user.id);
    } else {
      // Usar el primer startup existente
      const startup = startups[0];
      console.log(`Usando startup existente: ${startup.name} (${startup.id})`);
      
      // Cargar datos para este startup
      await processStartup(startup, user.id);
    }
    
  } catch (error) {
    console.error('Error durante la carga de datos:', error);
  }
}

async function processStartup(startup: any, userId: number) {
  try {
    // Verificar si ya tiene documentos
    const existingDocs = await storage.getDocumentsByStartup(startup.id);
    
    if (existingDocs.length === 0) {
      console.log('Creando documentos para el startup...');
      
      // Crear documentos si no existen
      const pitchDeckDoc = await storage.createDocument({
        id: uuidv4(),
        startupId: startup.id,
        name: "TechVision AI Pitch Deck",
        description: "Presentación oficial para inversionistas",
        type: "pitch-deck",
        uploadedBy: userId,
        fileUrl: "https://example.com/pitch-deck.pdf",
        fileSize: 2500000,
        pageCount: 15,
        processingStatus: "completed",
        fileType: "application/pdf",
      });
      
      const financialsDoc = await storage.createDocument({
        id: uuidv4(),
        startupId: startup.id,
        name: "TechVision AI Financials Q2 2024",
        description: "Proyecciones financieras y métricas clave",
        type: "financials",
        uploadedBy: userId,
        fileUrl: "https://example.com/financials.xlsx",
        fileSize: 1500000,
        pageCount: 5,
        processingStatus: "completed",
        fileType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      
      const marketDoc = await storage.createDocument({
        id: uuidv4(),
        startupId: startup.id,
        name: "Análisis de Mercado IA en Retail",
        description: "Análisis de la competencia y tamaño del mercado",
        type: "market",
        uploadedBy: userId,
        fileUrl: "https://example.com/market-analysis.pdf",
        fileSize: 3000000,
        pageCount: 22,
        processingStatus: "completed",
        fileType: "application/pdf",
      });
      
      console.log(`Documentos creados: ${[pitchDeckDoc, financialsDoc, marketDoc].map(d => d.name).join(', ')}`);
      
      // Crear chunks para estos documentos
      await createChunksForDocuments(startup.id, [pitchDeckDoc, financialsDoc, marketDoc]);
    } else {
      console.log(`El startup ya tiene ${existingDocs.length} documentos`);
      
      // Verificar si hay chunks para estos documentos
      const firstDoc = existingDocs[0];
      const searchResult = await storage.searchChunks("", startup.id, 1);
      
      if (searchResult.length === 0) {
        console.log('No se encontraron chunks para los documentos. Creando...');
        await createChunksForDocuments(startup.id, existingDocs);
      } else {
        console.log('Ya existen chunks para los documentos existentes');
      }
    }
    
    console.log('Carga de datos completada exitosamente');
    
  } catch (error) {
    console.error('Error procesando startup:', error);
  }
}

async function createChunksForDocuments(startupId: string, documents: any[]) {
  try {
    console.log('Creando chunks para documentos...');
    
    for (const doc of documents) {
      if (doc.type === 'pitch-deck') {
        await storage.createChunk({
          id: uuidv4(),
          documentId: doc.id,
          startupId: startupId,
          content: "TechVision AI es una startup de inteligencia artificial fundada en 2022 en Ciudad de México. Nuestra plataforma utiliza visión computacional avanzada para analizar el comportamiento de los consumidores en tiendas físicas, proporcionando insights detallados sobre patrones de compra, demografía y engagement con productos. Actualmente tenemos 5 clientes piloto en México y buscamos expandirnos a toda Latinoamérica.",
          embedding: null,
          metadata: { page: 1 }
        });
        
        await storage.createChunk({
          id: uuidv4(),
          documentId: doc.id,
          startupId: startupId,
          content: "El equipo fundador está compuesto por: María Rodríguez (CEO) - Ex-Google, 8 años de experiencia en IA. Carlos Méndez (CTO) - PhD en Computer Vision del Tec de Monterrey. Laura Sánchez (COO) - Ex-directora de operaciones en una empresa de retail con presencia en 5 países.",
          embedding: null,
          metadata: { page: 3 }
        });
        
        await storage.createChunk({
          id: uuidv4(),
          documentId: doc.id,
          startupId: startupId,
          content: "Nuestro modelo de negocio es SaaS con suscripción mensual basada en número de cámaras y tiendas. Precio promedio: $2,500 USD/mes por tienda. Costo de adquisición actual: $5,000 USD por cliente. LTV proyectado: $120,000 USD (4 años de retención promedio).",
          embedding: null,
          metadata: { page: 7 }
        });
      } 
      else if (doc.type === 'financials') {
        await storage.createChunk({
          id: uuidv4(),
          documentId: doc.id,
          startupId: startupId,
          content: "Métricas financieras clave de TechVision AI: Ingresos mensuales recurrentes (MRR): $15,000 USD. Tasa de crecimiento mensual: 15%. Burn rate: $40,000 USD/mes. Runway actual: 10 meses. Buscamos una inversión de $500,000 USD para extender el runway a 18 meses y acelerar adquisición de clientes.",
          embedding: null,
          metadata: { page: 1 }
        });
        
        await storage.createChunk({
          id: uuidv4(),
          documentId: doc.id,
          startupId: startupId,
          content: "Proyección financiera a 3 años: Año 1: $300K en ingresos, -$200K EBITDA. Año 2: $1.2M en ingresos, $50K EBITDA. Año 3: $3.5M en ingresos, $800K EBITDA. ROI esperado para inversionistas: 5x en 4 años.",
          embedding: null,
          metadata: { page: 2 }
        });
      } 
      else if (doc.type === 'market') {
        await storage.createChunk({
          id: uuidv4(),
          documentId: doc.id,
          startupId: startupId,
          content: "El mercado global de análisis de retail mediante IA está valorado en $2B y se espera que crezca a $8B en 2027 (CAGR 32%). En Latinoamérica, el mercado actual es de $150M con proyección de $650M para 2027. Principales competidores: RetailEye (EE.UU.), ShopVision (Europa) y SmartSight (Asia). Ventaja competitiva: Somos los primeros en enfocarnos exclusivamente en el mercado latinoamericano con modelos de IA entrenados para la demografía local.",
          embedding: null,
          metadata: { page: 4 }
        });
        
        await storage.createChunk({
          id: uuidv4(),
          documentId: doc.id,
          startupId: startupId,
          content: "La tasa de adopción de soluciones de IA en retail en México es del 12%, por debajo del 35% en EE.UU. y 28% en Europa. Esto representa una oportunidad significativa de crecimiento. Los retailers están priorizando inversiones en tecnología debido a la recuperación post-pandemia y la necesidad de competir con el e-commerce.",
          embedding: null,
          metadata: { page: 10 }
        });
      }
    }
    
    console.log('Chunks de documentos creados exitosamente');
    
  } catch (error) {
    console.error('Error creando chunks:', error);
  }
}

// Ejecutamos la función
loadAIDocuments().then(() => {
  console.log('Proceso de carga de datos completado');
  process.exit(0);
}).catch((err) => {
  console.error('Error crítico:', err);
  process.exit(1);
});