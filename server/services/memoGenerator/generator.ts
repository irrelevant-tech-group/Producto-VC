// server/services/memoGenerator/generator.ts

import { storage } from "../../storage";
import { Memo, MemoSection } from "@shared/types";
import { DEFAULT_MEMO_TEMPLATE } from './templates';
import { generateMemoSection } from './sectionGenerator';
import { exportMemoByFormat } from './exporters';

/**
 * Genera un memo de inversión completo
 */
export async function generateMemo(startupId: string, sections = DEFAULT_MEMO_TEMPLATE): Promise<Memo> {
  try {
    console.log(`Iniciando generación de memo para startup ${startupId}`);
    
    const startup = await storage.getStartup(startupId);
    if (!startup) {
      throw new Error(`Startup with ID ${startupId} not found`);
    }
    
    // Verificar si tenemos suficientes documentos
    const documents = await storage.getDocumentsByStartup(startupId);
    if (documents.length < 2) {
      throw new Error("Documentos insuficientes para generar un memo. Por favor, sube más información.");
    }
    
    // Obtener memos existentes para determinar versión
    const existingMemos = await storage.getMemosByStartup(startupId);
    const version = existingMemos.length + 1;
    
    console.log(`Generando memo v${version} para ${startup.name} con ${sections.length} secciones`);
    
    // Generar cada sección en paralelo para mayor eficiencia
    console.log("Iniciando generación paralela de secciones...");
    const generatedSections = await Promise.all(
      sections.map(section => generateMemoSection(startupId, section))
    );
    
    console.log(`${generatedSections.length} secciones generadas exitosamente`);
    
    // Crear el memo en la base de datos
    const memo = await storage.createMemo({
      startupId,
      version,
      status: 'draft',
      sections: generatedSections,
      exportUrls: {}
    });
    
    // Registrar actividad
    await storage.createActivity({
      type: 'memo_generated',
      startupId,
      memoId: memo.id,
      content: `Memo de inversión (v${version}) generado para ${startup.name}`,
      metadata: {
        sectionCount: sections.length,
        generatedAt: new Date().toISOString()
      }
    });
    
    console.log(`Memo ${memo.id} (v${version}) creado exitosamente para ${startup.name}`);
    
    return memo;
  } catch (error) {
    console.error(`Error generando memo para startup ${startupId}:`, error);
    
    // Registrar actividad de fallo
    await storage.createActivity({
      type: 'memo_generation_failed',
      startupId,
      content: `Error al generar memo de inversión: ${error.message}`
    });
    
    throw error;
  }
}

/**
 * Actualiza secciones específicas de un memo existente
 */
export async function updateMemoSections(
  memoId: string, 
  sectionUpdates: { title: string, content: string }[]
): Promise<Memo | undefined> {
  try {
    console.log(`Actualizando secciones para memo ${memoId}`);
    
    const memo = await storage.getMemo(memoId);
    if (!memo) {
      throw new Error(`Memo with ID ${memoId} not found`);
    }
    
    // Obtener secciones actuales
    const currentSections = memo.sections as MemoSection[];
    
    // Actualizar las secciones especificadas
    const updatedSections = currentSections.map(section => {
      const update = sectionUpdates.find(u => u.title === section.title);
      if (update) {
        console.log(`Actualizando sección "${section.title}"`);
        return {
          ...section,
          content: update.content,
          lastEdited: new Date().toISOString()
        };
      }
      return section;
    });
    
    // Actualizar memo en base de datos
    const updatedMemo = await storage.updateMemo(memoId, {
      sections: updatedSections,
      updatedAt: new Date()
    });
    
    // Registrar actividad
    await storage.createActivity({
      type: 'memo_updated',
      memoId,
      startupId: memo.startupId,
      content: `Secciones del memo actualizadas`,
      metadata: {
        updatedSections: sectionUpdates.map(s => s.title)
      }
    });
    
    console.log(`Memo ${memoId} actualizado exitosamente`);
    
    return updatedMemo;
  } catch (error) {
    console.error(`Error actualizando memo ${memoId}:`, error);
    throw error;
  }
}

/**
 * Exporta un memo a diferentes formatos (PDF, DOCX, slides)
 */
export async function exportMemo(memoId: string, format: 'pdf' | 'docx' | 'slides'): Promise<string> {
  try {
    console.log(`Exportando memo ${memoId} a formato ${format}`);
    
    const memo = await storage.getMemo(memoId);
    if (!memo) {
      throw new Error(`Memo with ID ${memoId} not found`);
    }
    
    const startup = await storage.getStartup(memo.startupId);
    if (!startup) {
      throw new Error(`Startup with ID ${memo.startupId} not found`);
    }
    
    // Usar el servicio de exportación adecuado según el formato
    const exportUrl = await exportMemoByFormat(memo, startup, format);
    
    // Actualizar memo con URL de exportación
    const exportUrls = memo.exportUrls as Record<string, string> || {};
    exportUrls[format] = exportUrl;
    
    await storage.updateMemo(memoId, { exportUrls });
    
    // Registrar actividad
    await storage.createActivity({
      type: 'memo_exported',
      memoId,
      startupId: memo.startupId,
      content: `Memo exportado a formato ${format.toUpperCase()}`,
      metadata: { format, url: exportUrl }
    });
    
    console.log(`Memo ${memoId} exportado exitosamente a ${format}`);
    
    return exportUrl;
  } catch (error) {
    console.error(`Error exportando memo ${memoId} a ${format}:`, error);
    throw error;
  }
}