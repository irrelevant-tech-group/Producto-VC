// server/services/documentProcessor/utils.ts

import { Document } from "@shared/schema";

/**
 * Contenido simulado si no hay URL de archivo
 */
export function generateMockContent(document: Document): string {
  return `${document.name} - Contenido simulado para ${document.type} - Generado el ${new Date().toISOString()}`;
}

/**
 * Función helper para obtener los últimos N caracteres con sentido semántico
 * (mantenida para compatibilidad con código existente)
 */
export function getLastNChars(text: string, n: number): string {
  if (!text || n <= 0) return "";
  if (text.length <= n) return text;
  
  // Intentar cortar en una oración completa
  const lastPart = text.slice(-n * 2);
  const sentenceEnd = lastPart.search(/[.!?]\s+/);
  
  if (sentenceEnd >= 0 && sentenceEnd < n * 1.5) {
    return lastPart.slice(sentenceEnd + 2).trim();
  }
  
  // Si no hay oración completa, cortar en un espacio
  const shortPart = text.slice(-n * 1.5);
  const spaceIndex = shortPart.indexOf(' ', shortPart.length - n);
  
  if (spaceIndex >= 0) {
    return shortPart.slice(spaceIndex + 1).trim();
  }
  
  // Como último recurso, tomar los últimos caracteres
  return text.slice(-n).trim();
}