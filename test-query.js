require('dotenv').config({ path: '.env.local' }) || require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function test() {
  const { data, count, error } = await supabase
    .from('raw_leads')
    .select('*, video_queue(status, defectuoso, bunny_url), outreach(*)', { count: 'exact' })
    .or('crm_status.eq.sin_contactar,crm_status.is.null')
    .order('score', { ascending: false })
    .order('created_at', { ascending: false })
    .range(0, 10);
  console.log(error);
}
test();
