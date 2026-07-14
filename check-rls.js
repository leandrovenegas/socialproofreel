require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
  const { data, error } = await supabase
    .from('video_queue')
    .select('*')
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(1);
    
  console.log("=== RLS / DATA CHECK ===");
  console.log("Error:", error);
  console.log("Data length:", data?.length);
  if (data?.length > 0) {
      console.log("Latest video:", { id: data[0].id, business_name: data[0].business_name, status: data[0].status });
  } else {
      console.log("No completed videos found, or blocked by RLS.");
  }
}
test();
