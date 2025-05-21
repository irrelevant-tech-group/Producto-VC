// server/storage/utils/queryBuilder.ts

import { sql } from "drizzle-orm";

/**
 * Builds a WHERE clause from conditions
 */
export function buildWhereClause(
  conditions: Record<string, any>, 
  paramStartIndex = 1
): { clause: string; params: any[]; nextParamIndex: number } {
  const whereConditions: string[] = [];
  const params: any[] = [];
  let paramIndex = paramStartIndex;
  
  Object.entries(conditions).forEach(([field, value]) => {
    if (value !== undefined) {
      whereConditions.push(`${field} = $${paramIndex}`);
      params.push(value);
      paramIndex++;
    }
  });
  
  const clause = whereConditions.length > 0 
    ? `WHERE ${whereConditions.join(' AND ')}`
    : '';
    
  return { clause, params, nextParamIndex: paramIndex };
}

/**
 * Creates a raw SQL query with the given conditions
 */
export function createRawQuery(
  table: string,
  columns: string[] = ['*'],
  conditions: Record<string, any> = {},
  orderBy?: { column: string; direction: 'ASC' | 'DESC' },
  limit?: number
): { query: string; params: any[] } {
  const columnsStr = columns.join(', ');
  
  const { clause: whereClause, params, nextParamIndex } = buildWhereClause(conditions);
  
  let queryStr = `SELECT ${columnsStr} FROM ${table} ${whereClause}`;
  
  if (orderBy) {
    queryStr += ` ORDER BY ${orderBy.column} ${orderBy.direction}`;
  }
  
  if (limit !== undefined) {
    queryStr += ` LIMIT $${nextParamIndex}`;
    params.push(limit);
  }
  
  return { query: queryStr, params };
}