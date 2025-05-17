// server/services/openai.ts

import OpenAI from "openai";
import {
  AiQueryRequest,
  AiQueryResponse,
  MemoGenerationRequest,
  MemoSection
} from "@shared/types";
import { storage } from "../storage";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Genera embeddings vectoriales para un texto usando OpenAI
 * Los embeddings son representaciones numéricas del texto que capturan su significado semántico
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    // Validar entrada
    if (!text || text.trim() === "") {
      throw new Error("El texto no puede estar vacío");
    }

    // Limitar tamaño para evitar exceder límites de la API
    const truncatedText = text.slice(0, 8000);

    const response = await openai.embeddings.create({
      model: "text-embedding-3-large",
      input: truncatedText,
      encoding_format: "float", // Asegura que obtenemos un vector de números flotantes
    });

    if (!response.data || response.data.length === 0) {
      throw new Error("No se recibieron embeddings de la API de OpenAI");
    }

    return response.data[0].embedding;
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
 * Procesa una consulta en lenguaje natural y devuelve una respuesta con fuentes opcionales
 * Implementa búsqueda semántica utilizando pgvector para mejorar la calidad de las respuestas
 */
export async function processQuery(
  request: AiQueryRequest
): Promise<AiQueryResponse> {
  const { startupId, question, includeSourceDocuments = true } = request;

  console.log(
    `Procesando consulta: "${question}" para startupId: ${startupId || "todos"}`
  );

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
  if (questionEmbedding) {
    relevantChunks = await storage.searchChunksByEmbedding(
      questionEmbedding,
      effectiveStartupId,
      5
    );
    console.log(
      `Seleccionados ${relevantChunks.length} chunks por búsqueda vectorial`
    );
  } else {
    relevantChunks = await storage.searchChunks(
      question,
      effectiveStartupId,
      5
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
    };
  }

  // Construir contexto a partir de los fragments obtenidos
  const context = relevantChunks
    .map((chunk) => {
      const sourceName = chunk.metadata?.source || "Documento";
      return `--- Fragmento de "${sourceName}" ---\n${chunk.content}`;
    })
    .join("\n\n");

  // Llamada a OpenAI Chat completions con el contexto
  const chatResponse = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content:
          "Eres un asistente analista de inversiones especializado en startups. " +
          "Responde a las preguntas basándote únicamente en el contexto proporcionado. " +
          "Si la información no está en el contexto o no tienes suficientes datos, indícalo claramente. " +
          "Sé conciso, preciso y enfócate en datos e insights relevantes para inversionistas. " +
          "Menciona la fuente de la información cuando corresponda.",
      },
      {
        role: "user",
        content: `Contexto de los documentos del startup:\n\n${context}\n\nPregunta: ${question}`,
      },
    ],
    max_tokens: 800,
  });

  const answer =
    chatResponse.choices?.[0]?.message?.content ||
    "No se pudo generar una respuesta.";

  // Preparar fuentes si se solicitaron
  let sources;
  if (includeSourceDocuments) {
    sources = await Promise.all(
      relevantChunks.map(async (chunk) => {
        const document = await storage.getDocument(chunk.documentId);
        return {
          documentId: chunk.documentId,
          documentName: document?.name || "Documento desconocido",
          content: chunk.content,
          relevanceScore:
            (chunk.semanticScore as number) ||
            (chunk.similarityScore as number) ||
            0,
        };
      })
    );
  }

  return {
    answer,
    sources,
  };
}

/**
 * Analiza el alineamiento de un startup con la tesis de inversión
 */
export async function analyzeStartupAlignment(
  startupId: string
): Promise<number> {
  try {
    const startup = await storage.getStartup(startupId);
    if (!startup) {
      throw new Error("Startup not found");
    }

    const documents = await storage.getDocumentsByStartup(startupId);
    const allChunks = await storage.searchChunks("", startupId, 30);

    // Tesis de inversión simplificada
    const investmentThesis = `
      H20 Capital busca invertir en startups tecnológicas innovadoras con alto potencial de crecimiento,
      preferentemente en etapas pre-seed y seed. Nos enfocamos en los siguientes sectores:
      1. Fintech
      2. SaaS
      3. Inteligencia Artificial
      4. Marketplace
    `;

    let alignmentScore = 0;

    // Parte semántica usando embeddings
    if (allChunks.length > 0) {
      try {
        const thesisEmbedding = await generateEmbedding(investmentThesis);
        const chunkScores = await Promise.all(
          allChunks.map(async (chunk: any) => {
            try {
              const chunkEmbedding = await generateEmbedding(chunk.content);
              return calculateCosineSimilarity(
                thesisEmbedding,
                chunkEmbedding
              );
            } catch {
              return 0;
            }
          })
        );
        const topScores = chunkScores.sort((a, b) => b - a).slice(0, 5);
        const semanticScore =
          topScores.reduce((sum, s) => sum + s, 0) / topScores.length;
        alignmentScore += semanticScore * 0.5;
        console.log(`Puntaje semántico: ${semanticScore}`);
      } catch {
        console.error(
          "Error al usar embeddings para análisis de alineamiento"
        );
      }
    }

    // Parte tradicional (50%)
    const preferredVerticals = ["fintech", "saas", "ai", "marketplace"];
    const verticalScore = preferredVerticals.includes(startup.vertical)
      ? 0.15
      : 0.05;

    const stageScores: Record<string, number> = {
      "pre-seed": 0.15,
      seed: 0.15,
      "series-a": 0.05,
    };
    const stageScore = stageScores[startup.stage] || 0;

    const docsScore = Math.min(documents.length / 15, 0.1);

    alignmentScore += verticalScore + stageScore + docsScore;
    alignmentScore = Math.min(Math.max(alignmentScore, 0), 1);

    await storage.updateStartup(startupId, { alignmentScore });

    return alignmentScore;
  } catch (error) {
    console.error("Error al analizar alineamiento del startup:", error);
    throw new Error(
      "No se pudo analizar el alineamiento del startup con la tesis de inversión."
    );
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
            const chunkEmbedding = await generateEmbedding(chunk.content);
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
    } catch {
      console.error("Error al usar embeddings para la sección");
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

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "Eres un analista de inversiones. Genera contenido profesional para la sección solicitada, cita fuentes cuando sea posible.",
        },
        {
          role: "user",
          content: `Información del startup:
- Nombre: ${startup.name}
- Sector: ${startup.vertical}
- Etapa: ${startup.stage}

SECCIÓN: ${section}

Contexto:
${context}`,
        },
      ],
      max_tokens: 1200,
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
          content: chunk.content.substring(0, 150) + "...",
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
    };
  } catch (error) {
    console.error(`Error al generar la sección ${section}:`, error);
    return {
      title: section,
      content:
        "Error al generar esta sección. Por favor, intenta nuevamente más tarde.",
    };
  }
}
