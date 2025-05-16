/**
 * Script para eliminar startups duplicados
 * Este script mantiene una instancia de TechVision AI y elimina las duplicadas
 */

import { db } from "../server/db";
import { startups, activities, documents, chunks, memos } from "../shared/schema";
import { eq } from "drizzle-orm";

async function cleanDuplicateStartups() {
  console.log("Iniciando limpieza de startups duplicados...");
  
  try {
    // Obtener todos los startups con el nombre "TechVision AI"
    const techVisionStartups = await db.select().from(startups).where(eq(startups.name, "TechVision AI"));
    
    if (techVisionStartups.length <= 1) {
      console.log("No hay duplicados de TechVision AI para eliminar.");
      return;
    }
    
    console.log(`Se encontraron ${techVisionStartups.length} instancias de TechVision AI.`);
    
    // Mantener la primera instancia y eliminar las demás
    const startupToKeep = techVisionStartups[0];
    const startupsToDelete = techVisionStartups.slice(1);
    
    console.log(`Manteniendo startup con ID: ${startupToKeep.id}`);
    console.log(`Eliminando ${startupsToDelete.length} startups duplicados...`);
    
    // Para cada startup a eliminar, eliminar sus registros relacionados
    for (const startup of startupsToDelete) {
      console.log(`Procesando startup con ID: ${startup.id}`);
      
      // Eliminar actividades relacionadas
      const deletedActivities = await db
        .delete(activities)
        .where(eq(activities.startupId, startup.id))
        .returning();
      console.log(`  - ${deletedActivities.length} actividades eliminadas`);
      
      // Obtener documentos relacionados
      const relatedDocuments = await db
        .select()
        .from(documents)
        .where(eq(documents.startupId, startup.id));
      
      // Eliminar chunks relacionados con los documentos
      for (const doc of relatedDocuments) {
        const deletedChunks = await db
          .delete(chunks)
          .where(eq(chunks.documentId, doc.id))
          .returning();
        console.log(`  - ${deletedChunks.length} chunks eliminados del documento ${doc.id}`);
      }
      
      // Eliminar documentos
      const deletedDocuments = await db
        .delete(documents)
        .where(eq(documents.startupId, startup.id))
        .returning();
      console.log(`  - ${deletedDocuments.length} documentos eliminados`);
      
      // Eliminar memos
      const deletedMemos = await db
        .delete(memos)
        .where(eq(memos.startupId, startup.id))
        .returning();
      console.log(`  - ${deletedMemos.length} memos eliminados`);
      
      // Finalmente, eliminar el startup
      await db
        .delete(startups)
        .where(eq(startups.id, startup.id));
      console.log(`  - Startup ${startup.id} eliminado`);
    }
    
    console.log("Limpieza de startups duplicados completada con éxito.");
    console.log(`Ahora solo existe una instancia de TechVision AI con ID: ${startupToKeep.id}`);
    
  } catch (error) {
    console.error("Error al limpiar startups duplicados:", error);
  } finally {
    process.exit(0);
  }
}

// Ejecutar la función principal
cleanDuplicateStartups();