// server/services/openai.ts

import OpenAI from "openai";
import {
  AiQueryRequest,
  AiQueryResponse,
  MemoGenerationRequest,
  MemoSection
} from "@shared/types";
import { storage } from "../storage";

// El modelo más reciente es "gpt-4o" lanzado el 13 de mayo, 2024
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Genera embeddings vectoriales para un texto usando OpenAI
 * Los embeddings son representaciones numéricas del texto que capturan su significado semántico
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    // Validación de entrada
    if (!text || typeof text !== 'string') {
      throw new Error("El texto debe ser un string válido");
    }
    
    // Convertir a string si por alguna razón no lo es
    const textString = String(text).trim();
    
    if (textString === "") {
      throw new Error("El texto no puede estar vacío");
    }
    
    // Limitar tamaño para evitar exceder límites de API
    const truncatedText = textString.slice(0, 8000);
    
    // Implementar retry logic con backoff exponencial para mejorar resiliencia
    let attempts = 0;
    const maxAttempts = 3;
    let lastError: any = null;
    
    while (attempts < maxAttempts) {
      try {
        // Llamada a API con modelo correcto para generar embeddings de 1536 dimensiones
        const response = await openai.embeddings.create({
          model: "text-embedding-ada-002", // Aseguramos usar el modelo correcto para 1536 dimensiones
          input: truncatedText,
          encoding_format: "float"
        });
        
        if (!response.data || response.data.length === 0) {
          throw new Error("No se recibieron embeddings de la API de OpenAI");
        }
        
        return response.data[0].embedding;
      } catch (error: any) {
        lastError = error;
        attempts++;
        
        // Si hay errores de tasa o temporales, esperar antes de reintentar
        if (error.response?.status === 429 || error.response?.status === 500) {
          const delay = Math.pow(2, attempts) * 1000; // backoff exponencial: 2s, 4s, 8s
          console.log(`Reintentando embedding en ${delay}ms (intento ${attempts}/${maxAttempts})`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          // Para otros errores, no reintentar
          break;
        }
      }
    }
    
    // Si llegamos aquí sin retornar, todos los intentos fallaron
    // Mejorar manejo de errores específicos
    if (lastError?.response?.status === 429) {
      throw new Error("Límite de tasa de API excedido. Reintentar después");
    } else if (lastError?.response?.status === 500) {
      throw new Error("Error del servidor de OpenAI. Reintentar después");
    }
    
    console.error("Error al generar embedding:", lastError);
    throw new Error(`No se pudo generar embedding: ${lastError?.message || 'Error desconocido'}`);
  } catch (error: any) {
    console.error("Error al generar embedding:", error);
    throw new Error(`No se pudo generar embedding: ${error.message}`);
  }
}

/**
 * Calcula la similitud de coseno entre dos vectores
 * Valores cercanos a 1 indican alta similitud, cercanos a 0 indican baja similitud
 */
export function calculateCosineSimilarity(
  vectorA: number[],
  vectorB: number[]
): number {
  if (vectorA.length !== vectorB.length) {
    throw new Error("Los vectores deben tener la misma dimensión");
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < vectorA.length; i++) {
    dotProduct += vectorA[i] * vectorB[i];
    magnitudeA += vectorA[i] * vectorA[i];
    magnitudeB += vectorB[i] * vectorB[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Procesa una consulta en lenguaje natural y devuelve una respuesta con fuentes automáticamente citadas
 * Implementa búsqueda semántica utilizando pgvector y citación automática de fuentes
 */
export async function processQuery(
  request: AiQueryRequest
): Promise<AiQueryResponse> {
  const { startupId, question, includeSourceDocuments = true } = request;
  
  console.log(`Procesando consulta: "${question}" para startupId: ${startupId || "todos"}`);
  
  try {
    // Intentar generar embedding de la consulta
    let questionEmbedding: number[] | null = null;
    try {
      questionEmbedding = await generateEmbedding(question);
      console.log("Embedding de consulta generado correctamente");
    } catch (embeddingError) {
      console.error(
        "Error al generar embedding para la consulta, se usará búsqueda de texto:",
        embeddingError
      );
    }

    // Recuperar chunks relevantes ya ordenados por similitud
    let relevantChunks: any[] = [];
    const effectiveStartupId = startupId === "all" ? undefined : startupId;
    
    // Priorizar búsqueda vectorial, pero tener fallback a búsqueda de texto
    if (questionEmbedding) {
      relevantChunks = await storage.searchChunksByEmbedding(
        questionEmbedding,
        effectiveStartupId,
        8  // Aumentar de 5 a 8 para tener más contexto
      );
      console.log(
        `Seleccionados ${relevantChunks.length} chunks por búsqueda vectorial`);
      } else {
        relevantChunks = await storage.searchChunks(
          question,
          effectiveStartupId,
          8
        );
        console.log(
          `Seleccionados ${relevantChunks.length} chunks por búsqueda de texto`
        );
      }
  
      if (relevantChunks.length === 0) {
        console.log("No se encontraron chunks relevantes");
        return {
          answer:
            "No tengo suficiente información para responder esa pregunta. Considera subir más documentos relacionados con el startup.",
          sources: []
        };
      }
  
      // Preparar contexto con citaciones numeradas automáticamente
      const context = relevantChunks
        .map((chunk, index) => {
          // Obtener metadata detallada sobre la fuente
          const sourceName = chunk.metadata?.source || "Documento sin nombre";
          const sourceType = chunk.metadata?.documentType || "desconocido";
          const pageInfo = chunk.metadata?.page ? ` (página ${chunk.metadata.page})` : "";
          const dateInfo = chunk.metadata?.extractedAt ? 
            ` [extraído: ${new Date(chunk.metadata.extractedAt).toLocaleDateString()}]` : "";
          const citationNumber = index + 1;
          
          return `[FUENTE ${citationNumber}] "${sourceName}" (${sourceType})${pageInfo}${dateInfo}:\n${chunk.content}`;
        })
        .join("\n\n");
      
      console.log(`Enviando consulta a OpenAI con ${relevantChunks.length} fragmentos de contexto`);
      
      // Mejorar el prompt de sistema para incluir citaciones automáticas
      const chatResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: 
              "Eres un asistente analista de inversiones especializado en startups. " +
              "Tu tarea es responder preguntas sobre startups basándote ÚNICAMENTE en la información proporcionada en el contexto. " +
              "Si la información no está presente en el contexto, indícalo claramente sin inventar hechos. " +
              "\n\nMUY IMPORTANTE: Cuando cites información, DEBES indicar la fuente específica usando el formato [FUENTE X], " +
              "donde X es el número de la fuente de donde obtienes la información. Esto es crucial para mantener la trazabilidad " +
              "de la información. Cada afirmación importante debe incluir su fuente correspondiente. Al citar, usa EXACTAMENTE " +
              "el formato [FUENTE X] donde X es el número asignado. " +
              "\n\nEstructura tus respuestas de manera clara, con datos concretos y análisis pertinente para decisiones de inversión. " +
              "Utiliza lenguaje profesional pero accesible. Si detectas inconsistencias en los datos entre fuentes, señálalas. " +
              "Sé objetivo en tu análisis, resaltando tanto aspectos positivos como riesgos."
          },
          {
            role: "user",
            content: `Contexto sobre el startup:\n\n${context}\n\nPregunta: ${question}`
          }
        ],
        temperature: 0.2, // Menor temperatura para respuestas más precisas y consistentes
        max_tokens: 1000, // Aumentado para permitir respuestas más completas
      });
  
      const answer =
        chatResponse.choices?.[0]?.message?.content ||
        "No se pudo generar una respuesta.";
  
      // Preparar fuentes estructuradas automáticamente citadas
      let sources: AiQueryResponse['sources'] = [];
      if (includeSourceDocuments) {
        sources = await Promise.all(
          relevantChunks.map(async (chunk, index) => {
            const document = await storage.getDocument(chunk.documentId);
            return {
              documentId: chunk.documentId,
              documentName: document?.name || "Documento desconocido",
              documentType: document?.type || "desconocido",
              content: chunk.content,
              relevanceScore:
                (chunk.semanticScore as number) ||
                (chunk.similarityScore as number) ||
                0,
              sourceIndex: index + 1, // Para mapear con las citas en la respuesta
              metadata: {
                ...chunk.metadata || {},
                extractedAt: chunk.metadata?.extractedAt || null,
                pageInfo: chunk.metadata?.page || null,
                chunkIndex: chunk.metadata?.chunkIndex || null,
                documentUploadedAt: document?.uploadedAt || null,
              }
            };
          })
        );
        
        // Ordenar por relevancia descendente
        sources.sort((a, b) => b.relevanceScore - a.relevanceScore);
      }
  
      // Registrar la consulta como actividad
      try {
        await storage.createActivity({
          type: 'ai_query',
          startupId: startupId,
          content: question,
          metadata: {
            chunksUsed: relevantChunks.length,
            timestamp: new Date().toISOString(),
            embeddingUsed: !!questionEmbedding,
            queryResponseTime: Date.now() - performance.now(), // Tiempo aproximado de respuesta
          }
        });
      } catch (activityError) {
        console.error("Error al registrar actividad:", activityError);
        // Continuar incluso si falla el registro de actividad
      }
  
      return {
        answer,
        sources,
      };
    } catch (error) {
      console.error("Error al procesar la consulta:", error);
      throw new Error("No se pudo procesar tu consulta. Por favor, intenta de nuevo más tarde.");
    }
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
   * Genera una sección de memo de inversión usando embeddings y OpenAI
   */
  export async function generateMemoSection(
    startupId: string,
    section: string
  ): Promise<MemoSection> {
    try {
      const startup = await storage.getStartup(startupId);
      if (!startup) {
        throw new Error("Startup not found");
      }
  
      const allChunks = await storage.searchChunks("", startupId, 30);
  
      if (allChunks.length === 0) {
        return {
          title: section,
          content:
            "No hay suficientes datos disponibles para generar esta sección. Por favor, sube más documentos relevantes.",
        };
      }
  
      // Intentar usar embeddings para relevancia
      let relevantChunks: any[] = [];
      try {
        const sectionContext = `Sección de memo: ${section}. Startup ${startup.name}.`;
        const sectionEmbedding = await generateEmbedding(sectionContext);
  
        const scored = await Promise.all(
          allChunks.map(async (chunk: any) => {
            try {
              // Usar embedding prexistente si está disponible, de lo contrario generar nuevo
              let chunkEmbedding;
              if (chunk.embedding && Array.isArray(chunk.embedding) && chunk.embedding.length > 0) {
                chunkEmbedding = chunk.embedding;
              } else {
                chunkEmbedding = await generateEmbedding(chunk.content);
              }
              
              const sim = calculateCosineSimilarity(
                sectionEmbedding,
                chunkEmbedding
              );
              return { ...chunk, semanticScore: sim };
            } catch {
              return { ...chunk, semanticScore: 0 };
            }
          })
        );
  
        relevantChunks = scored
          .sort((a, b) => b.semanticScore - a.semanticScore)
          .slice(0, 10);
        console.log(
          `Seleccionados ${relevantChunks.length} chunks por similitud semántica`
        );
      } catch (error) {
        console.error("Error al usar embeddings para la sección:", error);
        relevantChunks = await storage.searchChunks(section, startupId, 15);
      }
  
      if (relevantChunks.length === 0) {
        relevantChunks = allChunks.slice(0, 5);
      }
  
      const context = relevantChunks
        .map((chunk) => {
          const source = chunk.metadata?.source || "Documento sin título";
          const score = chunk.semanticScore
            ? ` (relevancia: ${(chunk.semanticScore * 100).toFixed(1)}%)`
            : "";
          return `--- De "${source}"${score} ---\n${chunk.content}`;
        })
        .join("\n\n");
  
      // Mejorar prompt para generar contenido de mayor calidad
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "Eres un analista de inversiones experto en capital de riesgo. " +
              "Genera contenido profesional, objetivo y detallado para la sección solicitada del memo de inversión. " +
              "Usa un tono analítico, apoyándote solo en datos concretos del contexto, sin especulaciones. " +
              "Cita fuentes cuando sea posible. Organiza el contenido con subtítulos si es apropiado. " +
              "No inventes información. Si los datos son insuficientes, indícalo claramente."
          },
          {
            role: "user",
            content: `Información del startup:
  - Nombre: ${startup.name}
  - Sector: ${startup.vertical}
  - Etapa: ${startup.stage}
  - Ubicación: ${startup.location || "No especificada"}
  
  SECCIÓN DE MEMO DE INVERSIÓN: ${section}
  
  Contexto extraído de documentos:
  ${context}
  
  Genera un contenido profesional y analítico para esta sección del memo de inversión.
  Estructura el texto adecuadamente y mantén un enfoque equilibrado que destaque tanto oportunidades como riesgos.`
          },
        ],
        max_tokens: 1500, // Aumentado para secciones más detalladas
      });
  
      const content =
        response.choices?.[0]?.message?.content ||
        "No se pudo generar contenido para esta sección.";
  
      const sources = await Promise.all(
        relevantChunks.map(async (chunk) => {
          const doc = await storage.getDocument(chunk.documentId);
          return {
            documentId: chunk.documentId,
            documentName: doc?.name || "Documento sin nombre",
            documentType: doc?.type || "Desconocido",
            uploadedAt: doc?.uploadedAt || null,
            content: chunk.content.substring(0, 180) + "...", // Ampliado para más contexto
            relevanceScore:
              (chunk.semanticScore as number) ||
              (chunk.similarityScore as number) ||
              0,
          };
        })
      );
  
      return {
        title: section,
        content,
        sources,
        lastEdited: new Date().toISOString(),
        generatedBy: "gpt-4o"
      };
    } catch (error) {
      console.error(`Error al generar la sección ${section}:`, error);
      return {
        title: section,
        content:
          "Error al generar esta sección. Por favor, intenta nuevamente más tarde.",
        lastEdited: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Error desconocido"
      };
    }
  }