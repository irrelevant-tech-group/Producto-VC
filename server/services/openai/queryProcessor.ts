import OpenAI from "openai";
import { AiQueryRequest, AiQueryResponse } from "@shared/types";
import { storage } from "../../storage";
import { generateEmbedding } from "./embeddings";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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