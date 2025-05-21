import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Función de utilidad para crear un cliente de OpenAI
 * con manejo adecuado de errores y reintentos
 */
export function createOpenAIClient() {
  return openai;
}

/**
 * Función de utilidad para manejar reintentos de peticiones a la API
 * con backoff exponencial
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxAttempts = 3,
  initialDelay = 1000
): Promise<T> {
  let attempts = 0;
  let lastError: any = null;
  
  while (attempts < maxAttempts) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      attempts++;
      
      if (attempts >= maxAttempts) {
        break;
      }
      
      // Si hay errores de tasa o temporales, esperar antes de reintentar
      const isRateLimitError = error.response?.status === 429;
      const isServerError = error.response?.status >= 500 && error.response?.status < 600;
      
      if (isRateLimitError || isServerError) {
        const delay = initialDelay * Math.pow(2, attempts - 1);
        console.log(`Reintentando operación en ${delay}ms (intento ${attempts}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        // Para otros tipos de errores, no reintentar
        break;
      }
    }
  }
  
  throw lastError;
}