import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Leemos el script SQL original
    const sqlPath = path.join(process.cwd(), 'scripts', 'init-schema.sql');
    const sqlContent = fs.existsSync(sqlPath) ? fs.readFileSync(sqlPath, 'utf8') : 'Script init-schema.sql no encontrado';

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        success: false,
        message: "Faltan credenciales de Supabase (NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY). Por favor, ejecuta el siguiente SQL manualmente en el SQL Editor de Supabase:",
        sql: sqlContent
      }, { status: 200 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Como Supabase JS Client no soporta ejecución directa de DDL largo sin RPC, 
    // lo más seguro es devolver el DDL al usuario para que lo pegue en el editor SQL
    // a menos que haya una función RPC pre-creada como exec_sql.
    
    return NextResponse.json({
      success: true,
      message: "Por seguridad, para inicializar las tablas debes copiar el siguiente script y ejecutarlo en el 'SQL Editor' de Supabase de tu proyecto.",
      sql: sqlContent
    }, { status: 200 });
    
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
