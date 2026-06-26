const fs = require('fs');
const path = require('path');
const ws = require('ws');

// Manually parse .env from workspace root
const envPath = path.join(__dirname, '.env');
const content = fs.readFileSync(envPath, 'utf8');
const env = {};
content.split(/\r?\n/).forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[key] = value;
  }
});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
  realtime: { transport: ws }
});

async function getCount(status, filterName) {
  let q = supabase.from('raw_leads').select('id', { count: 'exact', head: true });
  if (status === 'sin_contactar') {
    q = q.or('crm_status.eq.sin_contactar,crm_status.is.null');
  } else {
    q = q.eq('crm_status', status);
  }

  if (filterName === 'video_ready') {
    q = q.select('id, video_queue!inner(status, defectuoso)', { count: 'exact', head: true })
      .eq('video_queue.status', 'completed')
      .eq('video_queue.defectuoso', false);
  } else if (filterName === 'contacted_wa') {
    q = q.select('id, outreach!inner(canal, estado)', { count: 'exact', head: true })
      .eq('outreach.canal', 'whatsapp')
      .eq('outreach.estado', 'contactado');
  } else if (filterName === 'landing_opened') {
    q = q.select('id, outreach!inner(canal)', { count: 'exact', head: true })
      .eq('outreach.canal', 'web');
  } else if (filterName === 'closed') {
    q = q.select('id, outreach!inner(estado)', { count: 'exact', head: true })
      .eq('outreach.estado', 'cerrado');
  }

  const { count, error } = await q;
  if (error) {
    console.error(`Error counting ${filterName} in status ${status}:`, error);
    return 0;
  }
  return count || 0;
}

async function run() {
  const statuses = ['sin_contactar', 'contactado'];
  const filters = ['total', 'video_ready', 'contacted_wa', 'landing_opened', 'closed'];
  
  for (const status of statuses) {
    console.log(`--- Status: ${status} ---`);
    for (const f of filters) {
      if (f === 'total') {
        let q = supabase.from('raw_leads').select('id', { count: 'exact', head: true });
        if (status === 'sin_contactar') {
          q = q.or('crm_status.eq.sin_contactar,crm_status.is.null');
        } else {
          q = q.eq('crm_status', status);
        }
        const { count } = await q;
        console.log(`Total: ${count}`);
      } else {
        const count = await getCount(status, f);
        console.log(`${f}: ${count}`);
      }
    }
  }
}

run();
