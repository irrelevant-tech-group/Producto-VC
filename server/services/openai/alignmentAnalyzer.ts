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
  console.log("🔄 Usando sistema de fallback para alignment score");
  
  // Implementación mejorada del fallback con más factores
  const preferredVerticals = ["fintech", "saas", "ai", "marketplace"];
  const verticalScore = preferredVerticals.includes(startup.vertical.toLowerCase()) ? 0.20 : 0.05;
  
  const stageScores: Record<string, number> = {
    "first approach": 0.20,
    "due diligence": 0.20,
    "post inversion": 0.05,
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
  alignmentScore = Math.min(Math.max(alignmentScore, 0.1), 0.9); // Entre 10% y 90%
  
  console.log(`📊 Fallback scores - Vertical: ${verticalScore}, Stage: ${stageScore}, Docs: ${docsScore}, Keywords: ${keywordsScore}, Final: ${alignmentScore}`);
  
  // Actualizar la base de datos con el score generado
  storage.updateStartup(startup.id, { 
    alignmentScore,
    lastAnalyzedAt: new Date().toISOString(),
    metadata: {
      ...startup.metadata,
      alignmentAnalysis: {
        fallbackMode: true,
        verticalScore: verticalScore,
        stageScore: stageScore,
        documentationScore: docsScore,
        keywordScore: keywordsScore,
        documentCount: documents.length,
        lastUpdated: new Date().toISOString(),
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
          startup.stage.toLowerCase() in ["first approach", "due diligence"] ?
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
      }
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
        startup.stage.toLowerCase() in ["first approach", "due diligence"] ?
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
  console.log(`🚀 Iniciando análisis de alineamiento para startup: ${startupId}`);
  
  try {
    const startup = await storage.getStartup(startupId);
    if (!startup) {
      throw new Error("Startup not found");
    }
    
    console.log(`📋 Startup encontrado: ${startup.name} (${startup.vertical}, ${startup.stage})`);
    
    // Obtener TODOS los datos disponibles para un análisis más completo
    const documents = await storage.getDocumentsByStartup(startupId);
    const allChunks = await storage.searchChunks("", startupId, 80); // Aumentado de 50 a 80 chunks
    
    console.log(`📄 Documentos: ${documents.length}, Chunks: ${allChunks.length}`);
    
    // Si no hay documentos ni chunks, usar fallback inmediatamente
    if (documents.length === 0 && allChunks.length === 0) {
      console.log("⚠️ Sin documentos ni chunks disponibles, usando fallback");
      return generateFallbackAlignmentScore(startup, documents, allChunks);
    }
    
    // Verificar que tenemos API key de OpenAI
    if (!process.env.OPENAI_API_KEY) {
      console.error("❌ OPENAI_API_KEY no configurada");
      throw new Error("OpenAI API key not configured");
    }
    
    // Obtener actividades y memos para enriquecer contexto 
    const activities = await storage.getRecentActivities(20, startup.fundId);
    const startupActivities = activities.filter(a => a.startupId === startupId);
    const memos = await storage.getMemosByStartup(startupId);
    
    console.log(`📊 Actividades: ${startupActivities.length}, Memos: ${memos.length}`);
    
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
    let entitySummary = null;
    try {
      entitySummary = await extractKeyEntitiesFromChunks(allChunks);
      console.log("🔍 Entidades extraídas:", Object.keys(entitySummary || {}).length);
    } catch (entityError) {
      console.warn("⚠️ Error extrayendo entidades:", entityError.message);
    }
    
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
    
    console.log("🤖 Enviando análisis a OpenAI...");
    
    // Análisis IA mejorado con modelo más potente y prompt refinado
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `
            Eres un analista de venture capital. Evalúa startups y responde ÚNICAMENTE con JSON válido.
            
            FORMATO REQUERIDO (copia exactamente esta estructura):
            {
              "alignmentScore": 75,
              "summary": "Descripción del análisis en 2-3 oraciones",
              "criteriaScores": {
                "market": {"score": 80, "justification": "Explicación del mercado"},
                "product": {"score": 70, "justification": "Explicación del producto"},
                "team": {"score": 85, "justification": "Explicación del equipo"},
                "traction": {"score": 60, "justification": "Explicación de tracción"},
                "businessModel": {"score": 75, "justification": "Explicación del modelo de negocio"},
                "fundFit": {"score": 90, "justification": "Explicación del fit con el fondo"}
              },
              "strengths": ["Fortaleza 1", "Fortaleza 2", "Fortaleza 3"],
              "weaknesses": ["Debilidad 1", "Debilidad 2"],
              "recommendations": ["Recomendación 1", "Recomendación 2"],
              "riskFactors": ["Riesgo 1", "Riesgo 2"]
            }
            
            IMPORTANTE: 
            - alignmentScore debe ser un número entre 0 y 100
            - Todos los arrays deben tener al menos 1 elemento
            - Todos los scores en criteriaScores deben ser números entre 0 y 100
            - Solo responde con JSON, sin texto adicional
            `
          },
          {
            role: "user",
            content: `
            Analiza este startup para H20 Capital:
            
            STARTUP: ${startup.name}
            VERTICAL: ${startup.vertical}
            ETAPA: ${startup.stage}
            UBICACIÓN: ${startup.location}
            MONTO: ${startup.amountSought ? `${startup.amountSought} ${startup.currency}` : "No especificado"}
            
            TESIS H20 CAPITAL:
            - Sectores: Fintech, SaaS, AI, Marketplace
            - Etapas: Pre-seed, Seed
            - Región: América Latina
            - Ticket: $100K-$500K
            
            DOCUMENTOS DISPONIBLES: ${documents.length}
            TIPOS: ${documents.map(d => d.type).join(', ') || 'ninguno'}
            
            ${contextSample ? `CONTENIDO:\n${contextSample.slice(0, 5000)}` : 'Sin contenido de documentos disponible'}
            
            Evalúa el alineamiento con la tesis de H20 Capital y responde con el JSON requerido.
            `
          }
        ],
        temperature: 0.1,
        max_tokens: 2000,
        response_format: { type: "json_object" }
      });
      
      console.log("✅ Respuesta recibida de OpenAI");
      
      // DEBUGGING TEMPORAL - Añadir justo después de JSON.parse
      console.log("🔍 DEBUG - Respuesta RAW de OpenAI:");
      console.log(response.choices[0].message.content);
      
      // Procesar respuesta
      const analysisResult = JSON.parse(response.choices[0].message.content || "{}");
      
      console.log("🔍 DEBUG - analysisResult parseado:");
      console.log(JSON.stringify(analysisResult, null, 2));
      
      // Verificar estructura mínima necesaria o aplicar valores por defecto
      if (!analysisResult.alignmentScore) {
        analysisResult.alignmentScore = 50; // Valor por defecto si no existe
      }
      
      if (!analysisResult.summary) {
        analysisResult.summary = "Análisis de alineamiento con la tesis de inversión.";
      }
      
      console.log(`📊 Score calculado: ${Math.round(analysisResult.alignmentScore)}%`);
      
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
          dataCompleteness: calculateDataCompleteness(documents),
          usedOpenAI: true
        }
      };
      
      console.log("🔍 DEBUG - Resultado completo del análisis:");
      console.log("📊 Alignment Score:", result.alignmentScore);
      console.log("📝 Summary:", result.analysis?.summary?.substring(0, 100) + "...");
      console.log("📈 Criteria Scores:", Object.keys(result.analysis?.criteriaScores || {}));
      console.log("💪 Strengths:", result.analysis?.strengths?.length || 0);
      console.log("⚠️ Weaknesses:", result.analysis?.weaknesses?.length || 0);
      console.log("💡 Recommendations:", result.analysis?.recommendations?.length || 0);
      console.log("🚨 Risk Factors:", result.analysis?.riskFactors?.length || 0);
      
      // Actualizar score en la base de datos con metadata extendida
      await storage.updateStartup(startupId, { 
        alignmentScore: result.alignmentScore,
        lastAnalyzedAt: new Date().toISOString(),
        metadata: {
          ...startup.metadata,
          alignmentAnalysis: {
            summary: analysisResult.summary,
            criteriaScores: analysisResult.criteriaScores,
            strengths: analysisResult.strengths,
            weaknesses: analysisResult.weaknesses,
            recommendations: analysisResult.recommendations,
            riskFactors: analysisResult.riskFactors,
            documentCount: documents.length,
            dataCompleteness: result.metadata.dataCompleteness,
            lastUpdated: new Date().toISOString(),
            usedOpenAI: true
          }
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
      
      console.log("✅ Análisis completado y guardado en base de datos");
      
      return result;
    } catch (error) {
      console.error("❌ Error en análisis de alineamiento con IA:", error);
      // Sistema de fallback mejorado
      return generateFallbackAlignmentScore(startup, documents, allChunks);
    }
  } catch (error) {
    console.error("❌ Error al analizar alineamiento del startup:", error);
    throw new Error("No se pudo analizar el alineamiento del startup con la tesis de inversión.");
  }
}