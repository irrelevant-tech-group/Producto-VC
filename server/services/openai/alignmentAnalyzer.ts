import OpenAI from "openai";
import { storage } from "../../storage";
import { generateEmbedding } from "./embeddings";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Extrae entidades clave de un conjunto de chunks para enriquecer el análisis
 */
async function extractKeyEntitiesFromChunks(chunks: any[]): Promise<any> {
  if (!chunks || chunks.length === 0) return null;
  
  try {
    // Tomar una muestra representativa de chunks para análisis
    const sampleSize = Math.min(chunks.length, 10);
    const selectedChunks = chunks.slice(0, sampleSize);
    
    // Concatenar contenido con límite para API
    const combinedContent = selectedChunks
      .map(chunk => chunk.content)
      .join("\n\n")
      .slice(0, 10000);
    
    // Usar OpenAI para extraer entidades clave
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `
            Extrae entidades clave del siguiente texto sobre un startup. Devuelve JSON con estas categorías:
            - people: Personas mencionadas con sus roles/cargos
            - organizations: Organizaciones mencionadas (competidores, partners, inversores)
            - metrics: Métricas financieras y de tracción (ARR, MRR, CAC, LTV, etc.)
            - technologies: Tecnologías o plataformas utilizadas
            - locations: Ubicaciones geográficas relevantes
            
            Sé conciso y específico. Solo incluye información presente en el texto.
          `
        },
        {
          role: "user",
          content: combinedContent
        }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" }
    });
    
    return JSON.parse(response.choices[0].message.content || "{}");
  } catch (error) {
    console.error("Error extrayendo entidades de chunks:", error);
    return null; // Fallo silencioso, no bloqueamos el flujo principal
  }
}

/**
 * Calcula la completitud de la documentación disponible
 */
function calculateDataCompleteness(documents: any[]): number {
  const requiredDocTypes = ['pitch-deck', 'financials', 'tech', 'market', 'legal'];
  const availableTypes = new Set(documents.map(d => d.type));
  
  let completeness = 0;
  requiredDocTypes.forEach(type => {
    if (availableTypes.has(type)) {
      completeness += 1/requiredDocTypes.length;
    }
  });
  
  return Math.min(Math.max(completeness, 0), 1);
}

/**
 * Genera un score de alineamiento usando método de respaldo
 * cuando el análisis principal falla
 */
function generateFallbackAlignmentScore(startup: any, documents: any[], chunks: any[]): any {
  // Implementación mejorada del fallback con más factores
  const preferredVerticals = ["fintech", "saas", "ai", "marketplace"];
  const verticalScore = preferredVerticals.includes(startup.vertical.toLowerCase()) ? 0.20 : 0.05;
  
  const stageScores: Record<string, number> = {
    "pre-seed": 0.20,
    "seed": 0.20,
    "series-a": 0.05,
  };
  const stageScore = stageScores[startup.stage.toLowerCase()] || 0;
  
  // Calcular score basado en completitud de documentación
  const docTypeCoverage: Record<string, number> = {
    'pitch-deck': 0.20,
    'financials': 0.20,
    'legal': 0.10,
    'tech': 0.15,
    'market': 0.15
  };
  
  let docsScore = 0;
  const docTypes = new Set(documents.map(d => d.type));
  
  Object.entries(docTypeCoverage).forEach(([type, weight]) => {
    if (docTypes.has(type)) {
      docsScore += weight;
    }
  });
  
  // Analizar contenido de chunks para keywords relevantes
  const keywordSets: Record<string, string[]> = {
    growth: ["crecimiento", "growth", "growing", "scale", "expansion"],
    metrics: ["revenue", "arr", "mrr", "cac", "ltv", "churn", "retention"],
    innovation: ["innovative", "patented", "proprietary", "unique", "novel"],
    team: ["founder", "cto", "ceo", "experience", "background", "track record"]
  };
  
  const contentText = chunks.map(c => c.content).join(" ").toLowerCase();
  let keywordsScore = 0;
  
  Object.entries(keywordSets).forEach(([category, keywords]) => {
    keywords.forEach(keyword => {
      if (contentText.includes(keyword)) {
        keywordsScore += 0.01; // Pequeño incremento por cada keyword relevante
      }
    });
  });
  keywordsScore = Math.min(keywordsScore, 0.20); // Cap en 0.20
  
  // Calcular score final
  let alignmentScore = verticalScore + stageScore + docsScore + keywordsScore;
  alignmentScore = Math.min(Math.max(alignmentScore, 0), 1);
  
  // Actualizar la base de datos con el score generado
  storage.updateStartup(startup.id, { 
    alignmentScore,
    lastAnalyzedAt: new Date().toISOString(),
    analysisMetadata: {
      fallbackMode: true,
      verticalScore: verticalScore,
      stageScore: stageScore,
      documentationScore: docsScore,
      keywordScore: keywordsScore,
      documentCount: documents.length,
      lastUpdated: new Date().toISOString()
    }
  }).catch(err => console.error("Error al actualizar startup con fallback score:", err));
  
  return {
    startupId: startup.id,
    name: startup.name,
    alignmentScore,
    analysis: {
      summary: "Análisis generado mediante método alternativo debido a limitaciones de datos.",
      criteriaScores: {
        vertical: { score: verticalScore * 100, justification: preferredVerticals.includes(startup.vertical.toLowerCase()) ? 
          `El vertical ${startup.vertical} está alineado con la tesis de inversión` : 
          `El vertical ${startup.vertical} no es uno de los focos principales (${preferredVerticals.join(', ')})` },
        stage: { score: stageScore * 100, justification: stageScores[startup.stage.toLowerCase()] >= 0.15 ? 
          `La etapa ${startup.stage} está bien alineada con la tesis de inversión` :
          `La etapa ${startup.stage} no es ideal para nuestro perfil de inversión` },
        documentation: { score: docsScore * 100, justification: `Se han subido ${documents.length} documentos para análisis` },
        contentQuality: { score: keywordsScore * 100, justification: "Análisis basado en palabras clave relevantes" }
      },
      strengths: [
        preferredVerticals.includes(startup.vertical.toLowerCase()) ? 
          `El vertical ${startup.vertical} está alineado con la tesis de inversión` : 
          "Startup con documentación disponible para análisis",
        startup.stage.toLowerCase() in ["pre-seed", "seed"] ?
          `La etapa ${startup.stage} está alineada con la tesis de inversión` :
          "Startup con potencial de crecimiento"
      ],
      weaknesses: [
        documents.length < 5 ? "Documentación limitada para análisis completo" : 
          "Análisis generado mediante método alternativo",
        !preferredVerticals.includes(startup.vertical.toLowerCase()) ?
          `El vertical ${startup.vertical} no es foco principal de la tesis de inversión` :
          "Se requiere análisis más profundo"
      ],
      recommendations: [
        "Subir documentación adicional para un análisis más preciso",
        "Solicitar análisis manual por parte del equipo de inversión",
        "Complementar con métricas de tracción específicas"
      ],
      riskFactors: [
        documents.length < 3 ? "Información insuficiente para evaluación completa" :
          "Potencial falta de información crítica",
        "El análisis automático puede no capturar matices importantes",
        "Considerar revisar manualmente este startup"
      ]
    },
    metadata: {
      fallbackMode: true,
      analyzedAt: new Date().toISOString(),
      documentCount: documents.length
    }
  };
}

/**
 * Analiza el alineamiento de un startup con la tesis de inversión
 * Implementa un análisis detallado por criterios con justificaciones
 */
export async function analyzeStartupAlignment(
  startupId: string
): Promise<any> {
  try {
    // Ahora simplemente llamamos a la versión mejorada
    return await enhancedStartupAlignment(startupId);
  } catch (error) {
    console.error("Error al analizar alineamiento del startup:", error);
    throw new Error("No se pudo analizar el alineamiento del startup con la tesis de inversión.");
  }
}

/**
 * Versión mejorada para analizar alineamiento de startups con la tesis de inversión
 * Proporciona un análisis más detallado y explicable
 */
export async function enhancedStartupAlignment(
  startupId: string
): Promise<any> {
  try {
    const startup = await storage.getStartup(startupId);
    if (!startup) {
      throw new Error("Startup not found");
    }
    
    // Obtener TODOS los datos disponibles para un análisis más completo
    const documents = await storage.getDocumentsByStartup(startupId);
    const allChunks = await storage.searchChunks("", startupId, 80); // Aumentado de 50 a 80 chunks
    
    // Obtener actividades y memos para enriquecer contexto 
    const activities = await storage.getRecentActivities(20, startup.fundId);
    const startupActivities = activities.filter(a => a.startupId === startupId);
    const memos = await storage.getMemosByStartup(startupId);
    
    // Sistema de pesos y criterios refinados con subcategorías
    const criteriaStructure = {
      market: { 
        weight: 0.20, 
        subcriteria: {
          size: { weight: 0.40 },
          growth: { weight: 0.40 },
          trends: { weight: 0.20 }
        }
      },
      product: { 
        weight: 0.20,
        subcriteria: {
          innovation: { weight: 0.40 },
          defensibility: { weight: 0.30 },
          scalability: { weight: 0.30 }
        }
      },
      team: { 
        weight: 0.20,
        subcriteria: {
          experience: { weight: 0.40 },
          domainExpertise: { weight: 0.40 },
          completeness: { weight: 0.20 }
        }
      },
      traction: { 
        weight: 0.15,
        subcriteria: {
          growthMetrics: { weight: 0.50 },
          customerValidation: { weight: 0.30 },
          revenueQuality: { weight: 0.20 }
        }
      },
      businessModel: { 
        weight: 0.15,
        subcriteria: {
          unitEconomics: { weight: 0.40 },
          margins: { weight: 0.30 },
          repeatability: { weight: 0.30 }
        }
      },
      fundFit: { 
        weight: 0.10,
        subcriteria: {
          stageAlignment: { weight: 0.40 },
          verticalAlignment: { weight: 0.40 },
          geographicFit: { weight: 0.20 }
        }
      }
    };
    
    // Extraer entidades clave para enriquecer el análisis
    const entitySummary = await extractKeyEntitiesFromChunks(allChunks);
    
    // Contexto específico del fondo (se podría personalizar por fondo)
    const fund = startup.fundId ? await storage.getFund(startup.fundId) : null;
    const fundContext = fund ? 
      `Fondo: ${fund.name}. Este fondo tiene preferencia por inversiones en ${fund.metadata?.preferredVerticals || "fintech, SaaS, AI, marketplace"} 
      en etapas ${fund.metadata?.preferredStages || "pre-seed y seed"} 
      con ticket inicial entre ${fund.metadata?.ticketRange || "$100K-$500K USD"}.` : 
      "Fondo de inversión genérico H20 Capital";
    
    // Preparar contenido para análisis
    const contextSample = allChunks
      .slice(0, 40)
      .map(chunk => chunk.content)
      .join("\n\n")
      .slice(0, 25000); // Texto significativo para análisis
    
    // Tesis de inversión de H20 Capital (mantenemos la misma que en la función original)
    const investmentThesis = `
      H20 Capital busca invertir en startups tecnológicas innovadoras con alto potencial de crecimiento,
      preferentemente en etapas pre-seed y seed, en América Latina y con potencial de expansión global.
      Sectores prioritarios: Fintech, SaaS, Inteligencia Artificial, Marketplace.
      Características valoradas: equipo técnico sólido, propuesta de valor diferenciada,
      modelo de negocio escalable, y métricas de tracción iniciales prometedoras.
    `;
    
    // Análisis IA mejorado con modelo más potente y prompt refinado
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `
            Eres un socio senior de venture capital especializado en evaluar startups para inversión.
            Tu tarea es evaluar minuciosamente una startup en relación con la tesis de inversión del fondo,
            proporcionando un análisis detallado, riguroso y basado en hechos.
            
            Debes evaluar los siguientes criterios y sus subcategorías, asignando una puntuación (0-100) a cada una:
            1. MERCADO: tamaño, crecimiento potencial, tendencias
            2. PRODUCTO: innovación, defensibilidad, escalabilidad
            3. EQUIPO: experiencia, expertise en el dominio, completitud
            4. TRACCIÓN: métricas de crecimiento, validación de clientes, calidad de ingresos
            5. MODELO DE NEGOCIO: unit economics, márgenes, repetibilidad
            6. FIT CON EL FONDO: alineación de etapa, vertical y geografía
            
            Para cada criterio, proporciona:
            - Puntuación objetiva (0-100) para cada subcategoría
            - Justificación detallada (3-5 oraciones) con hechos específicos del texto
            - 2-3 fortalezas principales y 2-3 riesgos principales
            - Recomendaciones específicas para mejorar este aspecto
            
            Tu análisis debe ser sumamente objetivo, reconociendo tanto las fortalezas como las debilidades.
            Basado en tu análisis integral, calcula un Alignment Score final (0-100) que refleje la alineación
            general con la tesis de inversión.
            
            MUY IMPORTANTE: Tu respuesta DEBE seguir un formato estructurado en JSON para integrarse en nuestro sistema.
            No incluyas texto fuera del formato. Proporciona razones y justificaciones completas.
            `
          },
          {
            role: "user",
            content: `
            # CONTEXTO DEL FONDO
            ${fundContext}
            
            # TESIS DE INVERSIÓN
            ${investmentThesis}
            
            # DATOS DEL STARTUP
            Nombre: ${startup.name}
            Vertical: ${startup.vertical}
            Etapa: ${startup.stage}
            Ubicación: ${startup.location}
            Monto buscado: ${startup.amountSought ? `${startup.amountSought} ${startup.currency}` : "No especificado"}
            Documentos disponibles: ${documents.length} (${documents.map(d => d.type).join(', ')})
            
            # ENTIDADES CLAVE DETECTADAS
            ${JSON.stringify(entitySummary, null, 2)}
            
            # INFORMACIÓN DEL STARTUP (EXTRACTOS DE DOCUMENTOS)
            ${contextSample}
            
            Realiza un análisis exhaustivo y objetivo para determinar el Alignment Score de este startup con nuestra tesis de inversión.
            `
          }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      });
      
      // Procesar respuesta
      const analysisResult = JSON.parse(response.choices[0].message.content || "{}");
      
      // Verificar estructura mínima necesaria o aplicar valores por defecto
      if (!analysisResult.alignmentScore) {
        analysisResult.alignmentScore = 50; // Valor por defecto si no existe
      }
      
      if (!analysisResult.summary) {
        analysisResult.summary = "Análisis de alineamiento con la tesis de inversión.";
      }
      
      // Estructura del resultado para la respuesta
      const result = {
        startupId,
        name: startup.name,
        alignmentScore: analysisResult.alignmentScore / 100, // Normalizar a 0-1
        analysis: {
          summary: analysisResult.summary,
          criteriaScores: analysisResult.criteriaScores || {},
          strengths: analysisResult.strengths || [],
          weaknesses: analysisResult.weaknesses || [],
          recommendations: analysisResult.recommendations || [],
          riskFactors: analysisResult.riskFactors || []
        },
        metadata: {
          analyzedAt: new Date().toISOString(),
          dataPoints: allChunks.length,
          documentCount: documents.length,
          dataCompleteness: calculateDataCompleteness(documents)
        }
      };
      
      // Actualizar score en la base de datos con metadata extendida
      await storage.updateStartup(startupId, { 
        alignmentScore: result.alignmentScore,
        lastAnalyzedAt: new Date().toISOString(),
        analysisMetadata: {
          summary: analysisResult.summary,
          criteriaScores: analysisResult.criteriaScores,
          strengths: analysisResult.strengths,
          weaknesses: analysisResult.weaknesses,
          recommendations: analysisResult.recommendations,
          riskFactors: analysisResult.riskFactors,
          documentCount: documents.length,
          dataCompleteness: result.metadata.dataCompleteness,
          lastUpdated: new Date().toISOString()
        }
      });
      
      // Registrar actividad
      await storage.createActivity({
        type: 'alignment_analyzed',
        startupId,
        fundId: startup.fundId,
        content: `Análisis de alineamiento actualizado para ${startup.name}`,
        metadata: {
          score: result.alignmentScore,
          dataPoints: allChunks.length,
          documentCount: documents.length
        }
      });
      
      return result;
    } catch (error) {
      console.error("Error en análisis de alineamiento con IA:", error);
      // Sistema de fallback mejorado
      return generateFallbackAlignmentScore(startup, documents, allChunks);
    }
  } catch (error) {
    console.error("Error al analizar alineamiento del startup:", error);
    throw new Error("No se pudo analizar el alineamiento del startup con la tesis de inversión.");
  }
}