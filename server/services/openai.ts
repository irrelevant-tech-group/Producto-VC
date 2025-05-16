import OpenAI from "openai";
import { AiQueryRequest, AiQueryResponse, MemoGenerationRequest, MemoSection } from "@shared/types";
import { storage } from "../storage";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Genera embeddings vectoriales para un texto usando OpenAI
 * Los embeddings son representaciones numéricas del texto que capturan su significado semántico
 */
export async function generateEmbedding(text: string): Promise<any> {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-large",
      input: text,
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.error("Error al generar embedding:", error);
    throw new Error(`No se pudo generar embedding: ${error.message}`);
  }
}

/**
 * Calcula la similitud de coseno entre dos vectores
 * Valores cercanos a 1 indican alta similitud, cercanos a 0 indican baja similitud
 */
export function calculateCosineSimilarity(vectorA: number[], vectorB: number[]): number {
  if (vectorA.length !== vectorB.length) {
    throw new Error("Los vectores deben tener la misma dimensión");
  }
  
  // Producto escalar
  let dotProduct = 0;
  // Magnitudes
  let magnitudeA = 0;
  let magnitudeB = 0;
  
  for (let i = 0; i < vectorA.length; i++) {
    dotProduct += vectorA[i] * vectorB[i];
    magnitudeA += vectorA[i] * vectorA[i];
    magnitudeB += vectorB[i] * vectorB[i];
  }
  
  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);
  
  // Evitar división por cero
  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }
  
  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Procesa una consulta en lenguaje natural y devuelve una respuesta con fuentes opcionales
 * Implementa búsqueda semántica utilizando embeddings para mejorar la calidad de las respuestas
 */
export async function processQuery(request: AiQueryRequest): Promise<AiQueryResponse> {
  const { startupId, question, includeSourceDocuments = true } = request;
  
  try {
    console.log(`Procesando consulta: "${question}" para startupId: ${startupId || 'todos'}`);
    
    // Generar embedding para la consulta
    let questionEmbedding;
    try {
      questionEmbedding = await generateEmbedding(question);
      console.log("Embedding de consulta generado correctamente");
    } catch (embeddingError) {
      console.error("Error al generar embedding para la consulta:", embeddingError);
      // Si falla la generación de embedding, continuamos con la búsqueda de texto normal
    }
    
    // Primero obtenemos todos los chunks para ese startup si existen
    let allChunks = [];
    let relevantChunks = [];
    
    if (startupId && startupId !== "all") {
      // Si se seleccionó un startup específico, obtener todos sus chunks
      console.log("Buscando todos los chunks para el startup:", startupId);
      allChunks = await storage.searchChunks("", startupId, 20);
      console.log(`Encontrados ${allChunks.length} chunks totales para el startup`);
      
      // También buscamos con texto para tener resultados de ambos métodos
      const textSearchChunks = await storage.searchChunks(question, startupId);
      console.log(`Encontrados ${textSearchChunks.length} chunks por búsqueda de texto`);
      
      // Añadimos los resultados de búsqueda de texto si no están ya en allChunks
      for (const chunk of textSearchChunks) {
        if (!allChunks.some(c => c.id === chunk.id)) {
          allChunks.push(chunk);
        }
      }
    } else {
      // Buscar en todos los startups
      console.log("Buscando chunks en todos los startups");
      allChunks = await storage.searchChunks("", undefined, 30);
      
      // También buscamos con texto
      const textSearchChunks = await storage.searchChunks(question);
      
      // Combinamos los resultados
      for (const chunk of textSearchChunks) {
        if (!allChunks.some(c => c.id === chunk.id)) {
          allChunks.push(chunk);
        }
      }
    }
    
    if (allChunks.length === 0) {
      console.log("No se encontraron chunks");
      return {
        answer: "No tengo suficiente información para responder esa pregunta. Considera subir más documentos relacionados con el startup."
      };
    }
    
    // Si tenemos embedding de la consulta, calculamos la similitud semántica
    if (questionEmbedding) {
      const chunksWithScores = await Promise.all(allChunks.map(async (chunk) => {
        try {
          // Generamos embedding para el contenido del chunk
          const chunkEmbedding = await generateEmbedding(chunk.content);
          
          // Calculamos similitud con la consulta
          const similarity = calculateCosineSimilarity(questionEmbedding, chunkEmbedding);
          
          return {
            ...chunk,
            semanticScore: similarity
          };
        } catch (error) {
          console.error(`Error al calcular similitud para chunk ${chunk.id}:`, error);
          // Si hay error, usamos similarityScore existente o un valor bajo
          return {
            ...chunk,
            semanticScore: chunk.similarityScore || 0.1
          };
        }
      }));
      
      // Ordenamos por similitud semántica y tomamos los más relevantes
      const sortedChunks = chunksWithScores.sort((a, b) => 
        (b.semanticScore || 0) - (a.semanticScore || 0)
      );
      
      // Tomamos los chunks más relevantes para la respuesta (máximo 5)
      relevantChunks = sortedChunks.slice(0, 5);
      console.log(`Seleccionados ${relevantChunks.length} chunks por similitud semántica`);
    } else {
      // Si no pudimos usar embeddings, usamos la búsqueda de texto tradicional
      relevantChunks = await storage.searchChunks(question, startupId);
      
      // Si no hay resultados, usamos todos los chunks disponibles (limitados)
      if (relevantChunks.length === 0) {
        relevantChunks = allChunks.slice(0, 5);
      }
      
      console.log(`Usando ${relevantChunks.length} chunks encontrados por búsqueda de texto`);
    }
    
    // Preparamos el contexto con información de la fuente
    const context = relevantChunks
      .map(chunk => {
        const sourceName = chunk.metadata?.source || 'Documento';
        return `--- Fragmento de "${sourceName}" ---\n${chunk.content}`;
      })
      .join("\n\n");
    
    // Llamamos a la API de OpenAI con el contexto enriquecido
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: 
            "Eres un asistente analista de inversiones especializado en startups. " +
            "Responde a las preguntas basándote únicamente en el contexto proporcionado. " +
            "Si la información no está en el contexto o no tienes suficientes datos, indícalo claramente. " +
            "Sé conciso, preciso y enfócate en datos e insights relevantes para inversionistas. " +
            "Menciona la fuente de la información cuando corresponda."
        },
        {
          role: "user",
          content: `Contexto de los documentos del startup:\n\n${context}\n\nPregunta: ${question}`
        }
      ],
      max_tokens: 800,
    });
    
    const answer = response.choices[0].message.content || "No se pudo generar una respuesta.";
    
    // Preparamos las fuentes si se solicitaron
    let sources;
    if (includeSourceDocuments) {
      sources = await Promise.all(
        relevantChunks.map(async (chunk) => {
          const document = await storage.getDocument(chunk.documentId);
          return {
            documentId: chunk.documentId,
            documentName: document?.name || "Documento desconocido",
            content: chunk.content,
            relevanceScore: chunk.semanticScore || chunk.similarityScore || 0
          };
        })
      );
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
 * Analyzes startup alignment with investment thesis
 */
export async function analyzeStartupAlignment(startupId: string): Promise<number> {
  try {
    const startup = await storage.getStartup(startupId);
    if (!startup) {
      throw new Error("Startup not found");
    }
    
    // Obtenemos los documentos y chunks para este startup
    const documents = await storage.getDocumentsByStartup(startupId);
    if (documents.length === 0) {
      return 0; // No hay suficientes datos para analizar
    }
    
    // Obtenemos todos los chunks del startup
    const allChunks = await storage.searchChunks("", startupId, 30);
    
    // Tesis de inversión de H20 Capital (simplificada)
    const investmentThesis = `
      H20 Capital busca invertir en startups tecnológicas innovadoras con alto potencial de crecimiento, 
      preferentemente en etapas pre-seed y seed. Nos enfocamos en los siguientes sectores:
      
      1. Fintech: Soluciones que transformen servicios financieros tradicionales con tecnología.
      2. SaaS: Plataformas B2B con modelos de ingresos recurrentes y alto potencial de escala.
      3. Inteligencia Artificial: Empresas que apliquen IA para resolver problemas empresariales reales.
      4. Marketplace: Plataformas que conecten oferta y demanda en mercados fragmentados.
      
      Buscamos equipos fuertes con experiencia en el sector, tracción demostrable, 
      y potencial para expandirse internacionalmente. Valoramos modelos de negocio 
      con economías de escala claras y ventajas competitivas defensibles.
    `;
    
    let alignmentScore = 0;
    
    // Si tenemos suficientes datos, usamos embeddings para un análisis semántico
    if (allChunks.length > 0) {
      try {
        // Generamos embedding para la tesis de inversión
        const thesisEmbedding = await generateEmbedding(investmentThesis);
        
        // Calculamos la similitud semántica de cada chunk con la tesis
        const chunkScores = await Promise.all(allChunks.map(async (chunk) => {
          try {
            const chunkEmbedding = await generateEmbedding(chunk.content);
            return calculateCosineSimilarity(thesisEmbedding, chunkEmbedding);
          } catch (err) {
            console.error("Error calculando similitud para chunk:", err);
            return 0; // Valor por defecto si falla el cálculo
          }
        }));
        
        // Tomamos los mejores puntajes (top 5) y calculamos el promedio
        const topScores = chunkScores.sort((a, b) => b - a).slice(0, 5);
        const semanticScore = topScores.reduce((sum, score) => sum + score, 0) / topScores.length;
        
        // El puntaje semántico representa hasta el 50% del puntaje final
        alignmentScore += semanticScore * 0.5;
        
        console.log(`Puntaje semántico: ${semanticScore}`);
      } catch (embeddingError) {
        console.error("Error al usar embeddings para análisis de alineamiento:", embeddingError);
        // Continuamos con el análisis tradicional si fallan los embeddings
      }
    }
    
    // Análisis tradicional basado en criterios explícitos (representa el otro 50%)
    
    // Analizamos el vertical (sector)
    const preferredVerticals = ['fintech', 'saas', 'ai', 'marketplace'];
    const verticalScore = preferredVerticals.includes(startup.vertical) ? 0.15 : 0.05;
    
    // Analizamos la etapa
    const stageScores = {
      'pre-seed': 0.15,
      'seed': 0.15,
      'series-a': 0.05
    };
    const stageScore = stageScores[startup.stage] || 0;
    
    // Factor por cantidad de documentos (máximo 10%)
    const docsScore = Math.min(documents.length / 15, 0.1);
    
    // Complementamos el puntaje con los factores tradicionales
    alignmentScore += verticalScore + stageScore + docsScore;
    
    // Normalizamos el puntaje entre 0 y 1
    alignmentScore = Math.min(Math.max(alignmentScore, 0), 1);
    
    // Actualizamos el startup con el puntaje calculado
    await storage.updateStartup(startupId, { alignmentScore });
    
    return alignmentScore;
  } catch (error) {
    console.error("Error al analizar alineamiento del startup:", error);
    throw new Error("No se pudo analizar el alineamiento del startup con la tesis de inversión.");
  }
}

/**
 * Generate investment memo sections
 */
export async function generateMemoSection(startupId: string, section: string): Promise<MemoSection> {
  try {
    const startup = await storage.getStartup(startupId);
    if (!startup) {
      throw new Error("Startup not found");
    }
    
    // Get relevant chunks for this startup and section topic
    const relevantChunks = await storage.searchChunks(section, startupId, 15);
    
    if (relevantChunks.length === 0) {
      return {
        title: section,
        content: "Insufficient data available to generate this section. Please upload more relevant documents.",
      };
    }
    
    // Prepare context from chunks
    const context = relevantChunks.map(chunk => chunk.content).join("\n\n");
    
    // Create section content with OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: 
            "You are an investment memo writer for a venture capital firm. " +
            "Generate professional, well-structured content for the requested section of an investment memo. " +
            "Use only the provided context information. If insufficient data is available, " +
            "note the information gaps clearly. Use the voice and style of an experienced investment analyst."
        },
        {
          role: "user",
          content: `
          Startup: ${startup.name}
          Vertical: ${startup.vertical}
          Stage: ${startup.stage}
          Location: ${startup.location}
          Amount sought: ${startup.amountSought} ${startup.currency}
          
          Section to generate: ${section}
          
          Context information:
          ${context}
          
          Generate a well-structured, professional ${section} section for an investment memo.`
        }
      ],
    });
    
    const content = response.choices[0].message.content || "Unable to generate content for this section.";
    
    // Collect document sources
    const sources = relevantChunks.map(chunk => ({
      documentId: chunk.documentId,
      content: chunk.content.substring(0, 100) + "..."
    }));
    
    return {
      title: section,
      content,
      sources,
      lastEdited: new Date().toISOString()
    };
  } catch (error) {
    console.error(`Error generating memo section ${section}:`, error);
    return {
      title: section,
      content: "Error generating this section. Please try again later.",
    };
  }
}
