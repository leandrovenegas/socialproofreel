
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('Iniciando migración de mitigación...');

  // 1. Update outreach table
  const { data: outreachData, error: outreachError, count: outreachCount } = await supabase
    .from('outreach')
    .update({ estado: 'contacto_1_enviado' })
    .eq('estado', 'contactado')
    .select('*', { count: 'exact', head: false });

  if (outreachError) {
    console.error('Error actualizando outreach:', outreachError);
  } else {
    console.log(`Tabla outreach: ${outreachData.length} registros modificados de 'contactado' a 'contacto_1_enviado'.`);
  }

  // 2. Update raw_leads table
  const { data: leadsData, error: leadsError, count: leadsCount } = await supabase
    .from('raw_leads')
    .update({ crm_status: 'contacto_1_enviado' })
    .eq('crm_status', 'contactado')
    .select('*', { count: 'exact', head: false });

  if (leadsError) {
    console.error('Error actualizando raw_leads:', leadsError);
  } else {
    console.log(`Tabla raw_leads: ${leadsData.length} registros modificados de 'contactado' a 'contacto_1_enviado'.`);
  }
}

runMigration();
