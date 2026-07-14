const SUPABASE_URL = "https://uqcqofptduwclqqoehnw.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxY3FvZnB0ZHV3Y2xxcW9laG53Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODc4MDk0OCwiZXhwIjoyMDk0MzU2OTQ4fQ.2eNo713HeqZc7ciZZf6MZH1XSHFOQdrUr5DWFCb7slo";

async function listTables() {
  try {
    const res = await fetch(SUPABASE_URL + "/rest/v1/", {
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`
      }
    });
    
    if (!res.ok) {
      console.error('Fetch failed:', res.status, await res.text());
      return;
    }
    
    const schema = await res.json();
    console.log('Exposed Tables and Views in Supabase:');
    if (schema.paths) {
      Object.keys(schema.paths).forEach(path => {
        if (path !== '/' && !path.includes('rpc/')) {
          console.log(`- ${path.replace(/\//g, '')}`);
        }
      });
    }
  } catch (err) {
    console.error(err);
  }
}

listTables();
