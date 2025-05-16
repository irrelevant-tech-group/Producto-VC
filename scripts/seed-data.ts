import { v4 as uuidv4 } from 'uuid';
import { storage } from '../server/storage';

const seedStartupId = uuidv4();

async function seedDatabase() {
  try {
    console.log('Iniciando la carga de datos de prueba...');
    
    // 1. Crear un usuario
    const user = await storage.createUser({
      username: "davidrodriguez",
      password: "password123",
      name: "David Rodriguez",
      email: "david.rodriguez@example.com",
      position: "Investment Analyst",
    });
    
    console.log(`Usuario creado: ${user.name} (ID: ${user.id})`);
    
    // 2. Crear un startup
    const startup = await storage.createStartup({
      id: seedStartupId,
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
    
    // 2. Crear documentos para el startup
    const pitchDeckDoc = await storage.createDocument({
      id: uuidv4(),
      startupId: startup.id,
      name: "TechVision AI Pitch Deck",
      description: "Presentación oficial para inversionistas",
      type: "pitch-deck",
      uploadedBy: user.id,
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
      uploadedBy: user.id,
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
      uploadedBy: user.id,
      fileUrl: "https://example.com/market-analysis.pdf",
      fileSize: 3000000,
      pageCount: 22,
      processingStatus: "completed",
      fileType: "application/pdf",
    });
    
    console.log(`Documentos creados: ${[pitchDeckDoc, financialsDoc, marketDoc].map(d => d.name).join(', ')}`);
    
    // 3. Crear chunks para los documentos
    
    // Chunks para el pitch deck
    await storage.createChunk({
      id: uuidv4(),
      documentId: pitchDeckDoc.id,
      startupId: startup.id,
      content: "TechVision AI es una startup de inteligencia artificial fundada en 2022 en Ciudad de México. Nuestra plataforma utiliza visión computacional avanzada para analizar el comportamiento de los consumidores en tiendas físicas, proporcionando insights detallados sobre patrones de compra, demografía y engagement con productos. Actualmente tenemos 5 clientes piloto en México y buscamos expandirnos a toda Latinoamérica.",
      embedding: null,
      metadata: { page: 1 }
    });
    
    await storage.createChunk({
      id: uuidv4(),
      documentId: pitchDeckDoc.id,
      startupId: startup.id,
      content: "El equipo fundador está compuesto por: María Rodríguez (CEO) - Ex-Google, 8 años de experiencia en IA. Carlos Méndez (CTO) - PhD en Computer Vision del Tec de Monterrey. Laura Sánchez (COO) - Ex-directora de operaciones en una empresa de retail con presencia en 5 países.",
      embedding: null,
      metadata: { page: 3 }
    });
    
    await storage.createChunk({
      id: uuidv4(),
      documentId: pitchDeckDoc.id,
      startupId: startup.id,
      content: "Nuestro modelo de negocio es SaaS con suscripción mensual basada en número de cámaras y tiendas. Precio promedio: $2,500 USD/mes por tienda. Costo de adquisición actual: $5,000 USD por cliente. LTV proyectado: $120,000 USD (4 años de retención promedio).",
      embedding: null,
      metadata: { page: 7 }
    });
    
    // Chunks para financials
    await storage.createChunk({
      id: uuidv4(),
      documentId: financialsDoc.id,
      startupId: startup.id,
      content: "Métricas financieras clave de TechVision AI: Ingresos mensuales recurrentes (MRR): $15,000 USD. Tasa de crecimiento mensual: 15%. Burn rate: $40,000 USD/mes. Runway actual: 10 meses. Buscamos una inversión de $500,000 USD para extender el runway a 18 meses y acelerar adquisición de clientes.",
      embedding: null,
      metadata: { page: 1 }
    });
    
    await storage.createChunk({
      id: uuidv4(),
      documentId: financialsDoc.id,
      startupId: startup.id,
      content: "Proyección financiera a 3 años: Año 1: $300K en ingresos, -$200K EBITDA. Año 2: $1.2M en ingresos, $50K EBITDA. Año 3: $3.5M en ingresos, $800K EBITDA. ROI esperado para inversionistas: 5x en 4 años.",
      embedding: null,
      metadata: { page: 2 }
    });
    
    // Chunks para market analysis
    await storage.createChunk({
      id: uuidv4(),
      documentId: marketDoc.id,
      startupId: startup.id,
      content: "El mercado global de análisis de retail mediante IA está valorado en $2B y se espera que crezca a $8B en 2027 (CAGR 32%). En Latinoamérica, el mercado actual es de $150M con proyección de $650M para 2027. Principales competidores: RetailEye (EE.UU.), ShopVision (Europa) y SmartSight (Asia). Ventaja competitiva: Somos los primeros en enfocarnos exclusivamente en el mercado latinoamericano con modelos de IA entrenados para la demografía local.",
      embedding: null,
      metadata: { page: 4 }
    });
    
    await storage.createChunk({
      id: uuidv4(),
      documentId: marketDoc.id,
      startupId: startup.id,
      content: "La tasa de adopción de soluciones de IA en retail en México es del 12%, por debajo del 35% en EE.UU. y 28% en Europa. Esto representa una oportunidad significativa de crecimiento. Los retailers están priorizando inversiones en tecnología debido a la recuperación post-pandemia y la necesidad de competir con el e-commerce.",
      embedding: null,
      metadata: { page: 10 }
    });
    
    console.log('Chunks de documentos creados exitosamente');
    
    // 4. Crear un memo para el startup
    const memo = await storage.createMemo({
      id: uuidv4(),
      startupId: startup.id,
      version: 1,
      status: 'draft',
      sections: [
        {
          title: "Resumen Ejecutivo",
          content: "TechVision AI ofrece una plataforma de análisis para retail usando IA. Con un equipo sólido y tecnología probada, están bien posicionados en un mercado creciente en Latinoamérica. Recomendamos continuar el proceso de due diligence.",
          lastEdited: new Date().toISOString(),
          sources: []
        },
        {
          title: "Equipo",
          content: "El equipo fundador combina experiencia técnica en IA con conocimiento del sector retail. María Rodríguez (CEO) tiene experiencia en Google y Carlos Méndez (CTO) cuenta con un PhD en Computer Vision. Laura Sánchez (COO) aporta experiencia operativa en retail.",
          lastEdited: new Date().toISOString(),
          sources: []
        },
        {
          title: "Evaluación Financiera",
          content: "Con un MRR de $15,000 USD y una tasa de crecimiento mensual del 15%, la empresa muestra tracción. El modelo de negocios SaaS produce buenos márgenes y la proyección de $3.5M para el año 3 es ambiciosa pero alcanzable.",
          lastEdited: new Date().toISOString(),
          sources: []
        }
      ]
    });
    
    console.log(`Memo de inversión creado: versión ${memo.version}, estado: ${memo.status}`);
    
    // 5. Crear algunas actividades
    await storage.createActivity({
      id: uuidv4(),
      type: 'startup_created',
      userId: 1,
      userName: 'David Rodriguez',
      startupId: startup.id,
      startupName: startup.name,
      content: 'Startup añadido al pipeline',
      createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString() // 2 días atrás
    });
    
    await storage.createActivity({
      id: uuidv4(),
      type: 'document_uploaded',
      userId: 1,
      userName: 'David Rodriguez',
      startupId: startup.id,
      startupName: startup.name,
      documentId: pitchDeckDoc.id,
      documentName: pitchDeckDoc.name,
      content: 'Documento subido',
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 1 día atrás
    });
    
    await storage.createActivity({
      id: uuidv4(),
      type: 'memo_created',
      userId: 1,
      userName: 'David Rodriguez',
      startupId: startup.id,
      startupName: startup.name,
      memoId: memo.id,
      content: 'Investment memo generado',
      createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString() // 12 horas atrás
    });
    
    console.log('Actividades creadas correctamente');
    
    console.log('¡Datos de prueba cargados exitosamente!');
    
  } catch (error) {
    console.error('Error durante la carga de datos:', error);
  }
}

// Ejecutamos la función
seedDatabase().then(() => {
  console.log('Proceso de carga de datos completado');
  process.exit(0);
}).catch((err) => {
  console.error('Error crítico:', err);
  process.exit(1);
});