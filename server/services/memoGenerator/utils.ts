// server/services/memoGenerator/utils.ts

/**
 * Sanitiza texto para asegurar compatibilidad con diferentes formatos de exportación
 */
export function sanitizeText(text: string): string {
    if (!text) return '';
    
    // Eliminar cualquier carácter no compatible con PDF/DOCX
    return text
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '') // Caracteres de control
      .replace(/[\uD800-\uDFFF]/g, ''); // Sustitutos de alta/baja para caracteres fuera de BMP
  }
  
  /**
   * Formatea fecha para nombres de archivo y metadatos
   */
  export function formatDateForFilename(): string {
    return new Date().toISOString().split('T')[0];
  }
  
  /**
 * Sanitiza nombres de archivo para compatibilidad con sistemas de archivos
 */
export function sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9_\-\.]/g, '_') // Reemplazar caracteres no permitidos
      .replace(/_{2,}/g, '_')             // Evitar múltiples guiones bajos consecutivos
      .replace(/^\.|\.$/g, '_');          // Evitar puntos al inicio o final
  }
  
  /**
   * Convierte texto Markdown a texto plano simple
   * Útil para exportaciones que no soportan Markdown
   */
  export function markdownToPlainText(markdown: string): string {
    if (!markdown) return '';
    
    return markdown
      // Eliminar encabezados
      .replace(/^#+\s+/gm, '')
      // Eliminar énfasis
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/_(.+?)_/g, '$1')
      // Eliminar listas
      .replace(/^\s*[\-\*\+]\s+/gm, '• ')
      .replace(/^\s*\d+\.\s+/gm, '• ')
      // Mantener saltos de línea
      .replace(/\n\n+/g, '\n\n');
  }
  
  /**
   * Genera un resumen corto de una sección para su uso en slides o vistas previas
   */
  export function generateSectionSummary(section: any, maxLength: number = 150): string {
    if (!section || !section.content) return '';
    
    // Extraer el primer párrafo
    const firstParagraph = section.content.split('\n\n')[0];
    
    // Limitar la longitud
    if (firstParagraph.length <= maxLength) return firstParagraph;
    
    // Cortar en la última oración completa dentro del límite
    const truncated = firstParagraph.substring(0, maxLength);
    const lastSentenceEnd = Math.max(
      truncated.lastIndexOf('.'), 
      truncated.lastIndexOf('!'), 
      truncated.lastIndexOf('?')
    );
    
    if (lastSentenceEnd > 0) {
      return truncated.substring(0, lastSentenceEnd + 1);
    }
    
    // Si no hay final de oración, cortar en el último espacio
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > maxLength * 0.8) { // Solo si el espacio está cerca del final
      return truncated.substring(0, lastSpace) + '...';
    }
    
    // Si todo falla, simplemente truncar
    return truncated + '...';
  }