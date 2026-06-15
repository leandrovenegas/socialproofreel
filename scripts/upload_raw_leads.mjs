import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import ws from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Obtenemos variables de entorno (asegúrate de usar --env-file=.env.local)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Faltan las variables de entorno de Supabase.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
  realtime: { transport: ws }
});

async function uploadLeads() {
  try {
    const filePath = path.join(__dirname, '..', 'global_businesses.json');
    console.log(`Leyendo archivo: ${filePath}`);
    
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const leads = JSON.parse(fileContent);

    console.log(`Se encontraron ${leads.length} clientes en el JSON.`);

    // Preparar el array de inserción masiva
    const insertData = leads.map(lead => ({
      raw_data: lead,
      processed: false
    }));

    // Insertar en lotes de 100 para no sobrecargar Supabase
    const BATCH_SIZE = 100;
    let totalInserted = 0;

    for (let i = 0; i < insertData.length; i += BATCH_SIZE) {
      const batch = insertData.slice(i, i + BATCH_SIZE);
      
      const { error } = await supabase
        .from('raw_leads')
        .insert(batch);

      if (error) {
        console.error(`Error al insertar lote ${i} a ${i + BATCH_SIZE}:`, error);
      } else {
        totalInserted += batch.length;
        console.log(`Insertados: ${totalInserted} / ${insertData.length}`);
      }
    }

    console.log("¡Importación completada con éxito!");

  } catch (err) {
    console.error("Error durante la ejecución:", err);
  }
}

uploadLeads();
