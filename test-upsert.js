import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const payload = {
    ano_letivo: 2026,
    inicio_ano: '2026-02-01',
    fim_ano: '2026-12-15',
    previsao_proximo_ano: '2027-02-01',
    periodos: [],
    tipos_evento_customizados: []
  };

  const { data, error } = await supabase
    .from('calendario_anos_letivos')
    .upsert(payload, { onConflict: 'ano_letivo' })
    .select();
    
  if (error) {
    console.error("UPSERT ERROR:", error);
  } else {
    console.log("UPSERT SUCCESS:", data);
  }
}

test();
