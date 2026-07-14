import { supabase } from '@/lib/supabase';

const PAGE_SIZE = 50;

export async function fetchCrmData(
  status: 'sin_contactar' | 'contactado' | 'descartado',
  searchParams: { page?: string; rubro?: string; filter?: string; search?: string }
) {
  const page = Math.max(1, parseInt(searchParams.page || '1'));
  const rubro = searchParams.rubro || 'all';
  const filter = searchParams.filter || 'all';
  const search = searchParams.search || '';

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  // 1. Fetch raw_leads with pagination and filters
  let query = supabase.from('raw_leads').select('*');

  if (filter === 'video_ready') {
    query = supabase.from('raw_leads')
      .select('*, video_queue!inner(status, defectuoso)')
      .eq('video_queue.status', 'completed')
      .eq('video_queue.defectuoso', false);
  } else if (filter === 'contacted_wa') {
    query = supabase.from('raw_leads')
      .select('*, outreach!inner(canal, estado)')
      .eq('outreach.canal', 'whatsapp')
      .eq('outreach.estado', 'contactado');
  } else if (filter === 'landing_opened') {
    query = supabase.from('raw_leads')
      .select('*, outreach!inner(canal)')
      .eq('outreach.canal', 'web');
  } else if (filter === 'closed') {
    query = supabase.from('raw_leads')
      .select('*, outreach!inner(estado)')
      .eq('outreach.estado', 'cerrado');
  }

  if (status === 'sin_contactar') {
    query = query.or('crm_status.eq.sin_contactar,crm_status.is.null');
  } else {
    query = query.eq('crm_status', status);
  }

  if (rubro !== 'all') {
    query = query.eq('rubro', rubro);
  }

  if (search.trim()) {
    const cleanSearch = search.trim().replace(/"/g, '');
    const searchTerm = `"%${cleanSearch}%"`;
    query = query.or(`raw_data->>name.ilike.${searchTerm},contact_data->>phone_international.ilike.${searchTerm},contact_data->>email.ilike.${searchTerm}`);
  }

  // Order by score DESC, and fallback to created_at DESC
  query = query.order('score', { ascending: false }).order('created_at', { ascending: false });

  const { data: leadsOnly, error: leadsErr } = await query.range(from, to);

  if (leadsErr) {
    console.error(`Error fetching CRM leads for status ${status}:`, JSON.stringify(leadsErr, null, 2), leadsErr);
  }

  // 1.5 Fetch related video_queue and outreach records in parallel for just the page leads and merge in JS
  let rawLeads: any[] = [];
  if (leadsOnly && leadsOnly.length > 0) {
    const leadIds = leadsOnly.map((l: any) => l.id);
    const [
      { data: videoData, error: vqErr },
      { data: outreachData, error: outErr }
    ] = await Promise.all([
      supabase.from('video_queue').select('*').in('raw_lead_id', leadIds),
      supabase.from('outreach').select('*').in('lead_id', leadIds)
    ]);

    if (vqErr) console.error('Error fetching video_queue for page:', vqErr);
    if (outErr) console.error('Error fetching outreach for page:', outErr);

    rawLeads = leadsOnly.map((lead: any) => {
      return {
        ...lead,
        video_queue: videoData ? videoData.filter((v: any) => v.raw_lead_id === lead.id) : [],
        outreach: outreachData ? outreachData.filter((o: any) => o.lead_id === lead.id) : []
      };
    });
  }

  // 2. Fetch all unique rubros to populate filter dropdown from 'rubros' table
  const { data: rubrosRows } = await supabase
    .from('rubros')
    .select('nombre')
    .order('nombre');

  const rubrosList = rubrosRows?.map((r: any) => r.nombre).filter(Boolean) as string[] || [];

  // Helper to fetch filter-scoped counts starting from the child table for high performance
  const getFilterCount = async (filterName: 'video_ready' | 'contacted_wa' | 'landing_opened' | 'closed'): Promise<number> => {
    let q;
    
    if (filterName === 'video_ready') {
      q = supabase.from('video_queue')
        .select('id, raw_leads!inner(id)', { count: 'exact', head: true })
        .eq('status', 'completed')
        .eq('defectuoso', false);
    } else {
      let canal = '';
      let estado = '';
      if (filterName === 'contacted_wa') {
        canal = 'whatsapp';
        estado = 'contactado';
      } else if (filterName === 'landing_opened') {
        canal = 'web';
      } else if (filterName === 'closed') {
        estado = 'cerrado';
      }
      
      q = supabase.from('outreach')
        .select('id, raw_leads!inner(id)', { count: 'exact', head: true });
        
      if (canal) q = q.eq('canal', canal);
      if (estado) q = q.eq('estado', estado);
    }

    // Apply parent table (raw_leads) filters: crm_status and rubro
    if (status === 'sin_contactar') {
      q = q.or('crm_status.eq.sin_contactar,crm_status.is.null', { foreignTable: 'raw_leads' });
    } else {
      q = q.eq('raw_leads.crm_status', status);
    }
    
    if (rubro !== 'all') {
      q = q.eq('raw_leads.rubro', rubro);
    }

    if (search.trim()) {
      const cleanSearch = search.trim().replace(/"/g, '');
      const searchTerm = `"%${cleanSearch}%"`;
      q = q.or(`raw_data->>name.ilike.${searchTerm},contact_data->>phone_international.ilike.${searchTerm},contact_data->>email.ilike.${searchTerm}`, { foreignTable: 'raw_leads' });
    }

    const { count: cCount, error: countErr } = await q;
    if (countErr) {
      console.error(`Error counting ${filterName}:`, countErr);
      return 0;
    }
    return cCount || 0;
  };

  // Get total count (unfiltered for the current status and rubro)
  let totalCountQuery = supabase.from('raw_leads').select('id', { count: 'exact', head: true });
  if (status === 'sin_contactar') {
    totalCountQuery = totalCountQuery.or('crm_status.eq.sin_contactar,crm_status.is.null');
  } else {
    totalCountQuery = totalCountQuery.eq('crm_status', status);
  }
  if (rubro !== 'all') {
    totalCountQuery = totalCountQuery.eq('rubro', rubro);
  }
  if (search.trim()) {
    const cleanSearch = search.trim().replace(/"/g, '');
    const searchTerm = `"%${cleanSearch}%"`;
    totalCountQuery = totalCountQuery.or(`raw_data->>name.ilike.${searchTerm},contact_data->>phone_international.ilike.${searchTerm},contact_data->>email.ilike.${searchTerm}`);
  }
  const { count: totalLeadsCount } = await totalCountQuery;

  const [
    videoReadyCount,
    contactedCount,
    landingsOpenedCount,
    closedCount
  ] = await Promise.all([
    getFilterCount('video_ready'),
    getFilterCount('contacted_wa'),
    getFilterCount('landing_opened'),
    getFilterCount('closed'),
  ]);

  const stats = {
    totalLeads: totalLeadsCount || 0,
    videoReady: videoReadyCount || 0,
    contacted: contactedCount || 0,
    landingsOpened: landingsOpenedCount || 0,
    closed: closedCount || 0,
  };

  const activeCount = filter === 'all' ? (totalLeadsCount || 0) :
                     filter === 'video_ready' ? videoReadyCount :
                     filter === 'contacted_wa' ? contactedCount :
                     filter === 'landing_opened' ? landingsOpenedCount :
                     closedCount;

  return {
    rawLeads: rawLeads || [],
    count: activeCount,
    page,
    rubro,
    rubrosList,
    stats,
    pageSize: PAGE_SIZE,
  };
}
