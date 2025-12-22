import { neon, neonConfig } from "@neondatabase/serverless";

// Configure Neon for serverless environments
neonConfig.fetchConnectionCache = true;

// Create SQL client
const sql = neon(process.env.DATABASE_URL!);

export { sql };

// Helper function to run queries with parameters
// Converts PostgreSQL parameterized queries ($1, $2, etc.) to Neon template literals
export async function query<T>(
  queryText: string,
  params: unknown[] = []
): Promise<T[]> {
  try {
    // Check if sql has a query method for parameterized queries
    const sqlObj = sql as unknown as { query?: (text: string, params: unknown[]) => Promise<T[]>; unsafe?: (text: string) => Promise<T[]> };
    if (typeof sqlObj.query === 'function') {
      return await sqlObj.query(queryText, params);
    }
    
    if (params.length === 0) {
      // No parameters - execute directly using unsafe or template literal
      if (typeof sqlObj.unsafe === 'function') {
        return await sqlObj.unsafe(queryText);
      }
      // Construct simple template literal
      const escaped = queryText.replace(/`/g, '\\`').replace(/\$/g, '\\$');
      const fn = new Function('sql', `return sql\`${escaped}\``);
      return await fn(sql) as T[];
    }
    
    // Convert $1, $2, etc. to template literal with proper escaping
    // Find all parameter positions
    const paramPositions: Array<{ index: number; paramNum: number }> = [];
    const paramRegex = /\$(\d+)/g;
    let match;
    
    while ((match = paramRegex.exec(queryText)) !== null) {
      const paramNum = parseInt(match[1]);
      if (paramNum > 0 && paramNum <= params.length) {
        paramPositions.push({ index: match.index, paramNum });
      }
    }
    
    // Sort by index descending to replace from end
    paramPositions.sort((a, b) => b.index - a.index);
    
    // Build template literal parts
    const templateParts: string[] = [];
    const templateValues: unknown[] = [];
    let remaining = queryText;
    
    for (const { paramNum } of paramPositions) {
      const paramIndex = paramNum - 1;
      const placeholder = `$${paramNum}`;
      const pos = remaining.lastIndexOf(placeholder);
      
      if (pos !== -1) {
        const after = remaining.substring(pos + placeholder.length);
        const before = remaining.substring(0, pos);
        
        if (after) templateParts.unshift(after);
        templateValues.unshift(params[paramIndex]);
        remaining = before;
      }
    }
    
    if (remaining) templateParts.unshift(remaining);
    
    // Construct template literal: sql`part0${val0}part1${val1}...`
    const parts = templateParts.map(p => p.replace(/`/g, '\\`').replace(/\$/g, '\\$'));
    let templateCode = 'sql`';
    for (let i = 0; i < parts.length; i++) {
      templateCode += parts[i];
      if (i < templateValues.length) {
        templateCode += '${vals[' + i + ']}';
      }
    }
    templateCode += '`';
    
    const fn = new Function('sql', 'vals', `return ${templateCode}`);
    return await fn(sql, templateValues) as T[];
  } catch (error) {
    console.error("Database query error:", error);
    throw error;
  }
}

// Helper for single row queries
export async function queryOne<T>(
  queryText: string,
  params: unknown[] = []
): Promise<T | null> {
  const results = await query<T>(queryText, params);
  return results[0] || null;
}



