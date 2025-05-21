import OpenAI from "openai";

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