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
    if (!text || text.trim() === "") {
      throw new Error("El texto no puede estar vacío");
    }
    
    // Limitar tamaño para evitar exceder límites de API
    const truncatedText = text.slice(0, 8000);
    
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
      const startup = await storage.getStartup(startupId);
      if (!startup) {
        throw new Error("Startup not found");
      }
      
      // Obtener datos necesarios
      const documents = await storage.getDocumentsByStartup(startupId);
      
      // Si no hay documentos suficientes, alertar
      if (documents.length < 2) {
        console.log(`Advertencia: Solo ${documents.length} documentos disponibles para análisis de ${startupId}. El análisis puede ser limitado.`);
      }
      
      // Obtener chunks, priorizando documentos importantes
      const allChunks = await storage.searchChunks("", startupId, 50);
      
      // Definir criterios con pesos
      const criteria = {
        sector: { weight: 0.25, score: 0, justification: "" },
        marketPotential: { weight: 0.20, score: 0, justification: "" },
        technology: { weight: 0.20, score: 0, justification: "" },
        team: { weight: 0.15, score: 0, justification: "" },
        traction: { weight: 0.10, score: 0, justification: "" },
        businessModel: { weight: 0.10, score: 0, justification: "" }
      };
      
      // Extraer entidades importantes de los chunks antes del análisis principal
      const entitySummary = await extractKeyEntitiesFromChunks(allChunks);
      
      // Concatenar contenido relevante para análisis
      const documentContent = allChunks
        .map(chunk => chunk.content)
        .join("\n\n")
        .slice(0, 20000); // Aumentado de 15000 a 20000 para más contexto
      
      // Tesis de inversión de H20 Capital
      const investmentThesis = `
        H20 Capital busca invertir en startups tecnológicas innovadoras con alto potencial de crecimiento,
        preferentemente en etapas pre-seed y seed, en América Latina y con potencial de expansión global.
        Sectores prioritarios: Fintech, SaaS, Inteligencia Artificial, Marketplace.
        Características valoradas: equipo técnico sólido, propuesta de valor diferenciada,
        modelo de negocio escalable, y métricas de tracción iniciales prometedoras.
      `;
      
      // Analizar cada criterio utilizando IA con información de entidades preextraídas
      try {
        // Incluir información de entidades extraídas para enriquecer el contexto
        const entityContext = entitySummary ? 
          `\nENTIDADES CLAVE DETECTADAS:\n${JSON.stringify(entitySummary, null, 2)}` : '';
        
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: 
                "Eres un analista experto en capital de riesgo con especialidad en evaluación de startups. " +
                "Tu tarea es evaluar un startup comparándolo con la tesis de inversión proporcionada y " +
                "asignar puntuaciones (0-100) a cada criterio con justificaciones detalladas. " +
                "Sé objetivo y crítico, evaluando tanto potencial como riesgos. " +
                "Usa un formato JSON estructurado para tu respuesta."
            },
            {
              role: "user",
              content: `
                TESIS DE INVERSIÓN:
                ${investmentThesis}
                
                DATOS DEL STARTUP:
                Nombre: ${startup.name}
                Vertical: ${startup.vertical}
                Etapa: ${startup.stage}
                Ubicación: ${startup.location}
                ${entityContext}
                
                INFORMACIÓN DEL STARTUP:
                ${documentContent}
                
                CRITERIOS A EVALUAR:
                1. Sector: Alineación del sector/vertical con la tesis de inversión
                2. Potencial de mercado: Tamaño, crecimiento y oportunidad
                3. Tecnología: Innovación, diferenciación y ventajas competitivas
                4. Equipo: Experiencia, habilidades y track record
                5. Tracción: Métricas, crecimiento y validación de mercado
                6. Modelo de negocio: Escalabilidad, rentabilidad y unit economics
                
                Para cada criterio, proporciona:
                - Puntuación (0-100)
                - Justificación detallada (2-3 oraciones)
                - Dos fortalezas principales y dos debilidades principales
                
                Incluye también:
                - Tres recomendaciones específicas para mejorar
                - Tres factores clave de riesgo para este startup
                
                Devuelve tu análisis en formato JSON siguiendo esta estructura:
                {
                  "criteria": {
                    "sector": { "score": 0, "justification": "", "strengths": [], "weaknesses": [] },
                    "marketPotential": { "score": 0, "justification": "", "strengths": [], "weaknesses": [] },
                    ...
                  },
                  "recommendations": ["rec1", "rec2", "rec3"],
                  "riskFactors": ["risk1", "risk2", "risk3"]
                }
              `
            }
          ],
          temperature: 0.1, // Menor temperatura para respuestas más consistentes
          response_format: { type: "json_object" }
        });
  
        // Procesar y estructurar la respuesta
        const analysisResult = JSON.parse(response.choices[0].message.content || "{}");
        
        // Calcular puntuación general ponderada
        let finalScore = 0;
        const results = {
          score: 0,
          breakdown: {},
          recommendations: [],
          riskFactors: [],
          strengths: [],
          weaknesses: []
        };
        
        // Procesar los resultados del análisis
        Object.entries(analysisResult.criteria || {}).forEach(([key, data]: [string, any]) => {
          const criterionWeight = criteria[key]?.weight || 0.1;
          const normalizedScore = data.score / 100; // Convertir a escala 0-1
          finalScore += normalizedScore * criterionWeight;
          
          // Agregar al desglose
          results.breakdown[key] = {
            score: data.score,
            justification: data.justification,
            strengths: data.strengths || [],
            weaknesses: data.weaknesses || []
          };
          
          // Agregar fortalezas y debilidades generales
          if (data.strengths) {
            results.strengths = [...results.strengths, ...data.strengths];
          }
          if (data.weaknesses) {
            results.weaknesses = [...results.weaknesses, ...data.weaknesses];
          }
        });
        
        // Recomendaciones y factores de riesgo
        results.recommendations = analysisResult.recommendations || [];
        results.riskFactors = analysisResult.riskFactors || [];
        
        // Asegurar entre 0 y 1, redondeando a 2 decimales para claridad
        results.score = Math.round(Math.min(Math.max(finalScore, 0), 1) * 100) / 100;
        
        // Actualizar score en la base de datos
        await storage.updateStartup(startupId, { 
          alignmentScore: results.score,
          lastAnalyzedAt: new Date().toISOString(),
          analysisMetadata: {
            criteria: results.breakdown,
            recommendationCount: results.recommendations.length,
            documentCount: documents.length,
            chunkCount: allChunks.length
          }
        });
        
        return results;
      } catch (error) {
        console.error("Error en análisis de alineamiento con IA:", error);
        
        // Fallback a método tradicional si falla el análisis con IA
        // Este método es simple pero robusto para emergencias
        const preferredVerticals = ["fintech", "saas", "ai", "marketplace"];
        const verticalScore = preferredVerticals.includes(startup.vertical.toLowerCase()) ? 0.15 : 0.05;
        
        const stageScores: Record<string, number> = {
          "pre-seed": 0.15,
          "seed": 0.15,
          "series-a": 0.05,
        };
        const stageScore = stageScores[startup.stage.toLowerCase()] || 0;
        
        const docsScore = Math.min(documents.length / 15, 0.1);
        
        let alignmentScore = verticalScore + stageScore + docsScore;
        alignmentScore = Math.min(Math.max(alignmentScore, 0), 1);
        
        await storage.updateStartup(startupId, { 
          alignmentScore,
          lastAnalyzedAt: new Date().toISOString(),
        });
        
        return {
          score: alignmentScore,
          breakdown: {
            sector: { score: verticalScore * 100, justification: "Alineación de sector (método fallback)" },
            stage: { score: stageScore * 100, justification: "Etapa de inversión (método fallback)" },
            documents: { score: docsScore * 100, justification: "Cantidad de documentos (método fallback)" }
          },
          recommendations: ["Añadir más documentos para un análisis detallado"]
        };
      }
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