import { supabase } from '@/lib/supabase';

const PAGE_SIZE = 50;

export async function fetchCrmData(
  status: 'sin_contactar' | 'contactado' | 'descartado',
  searchParams: { page?: string; rubro?: string; filter?: string }
) {
  const page = Math.max(1, parseInt(searchParams.page || '1'));
  const rubro = searchParams.rubro || 'all';
  const filter = searchParams.filter || 'all';

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  // 1. Fetch raw_leads with pagination and filters
  let selectQuery = '*, video_queue(status, defectuoso, bunny_url), outreach(*)';
  if (filter === 'video_ready') {
    selectQuery = '*, video_queue!inner(status, defectuoso, bunny_url), outreach(*)';
  } else if (filter === 'contacted_wa') {
    selectQuery = '*, video_queue(status, defectuoso, bunny_url), outreach!inner(*)';
  } else if (filter === 'landing_opened') {
    selectQuery = '*, video_queue(status, defectuoso, bunny_url), outreach!inner(*)';
  } else if (filter === 'closed') {
    selectQuery = '*, video_queue(status, defectuoso, bunny_url), outreach!inner(*)';
  }

  let query = supabase
    .from('raw_leads')
    .select(selectQuery, { count: 'exact' });

  if (status === 'sin_contactar') {
    query = query.or('crm_status.eq.sin_contactar,crm_status.is.null');
  } else {
    query = query.eq('crm_status', status);
  }

  if (rubro !== 'all') {
    query = query.eq('rubro', rubro);
  }

  if (filter === 'video_ready') {
    query = query
      .eq('video_queue.status', 'completed')
      .eq('video_queue.defectuoso', false);
  } else if (filter === 'contacted_wa') {
    query = query
      .eq('outreach.canal', 'whatsapp')
      .eq('outreach.estado', 'contactado');
  } else if (filter === 'landing_opened') {
    query = query
      .eq('outreach.canal', 'web');
  } else if (filter === 'closed') {
    query = query
      .eq('outreach.estado', 'cerrado');
  }

  // Order by score DESC, and fallback to created_at DESC
  query = query.order('score', { ascending: false }).order('created_at', { ascending: false });

  const { data: rawLeads, count, error } = await query.range(from, to);

  if (error) {
    console.error(`Error fetching CRM leads for status ${status}:`, JSON.stringify(error, null, 2), error);
  }

  // 2. Fetch all unique rubros to populate filter dropdown from 'rubros' table
  const { data: rubrosRows } = await supabase
    .from('rubros')
    .select('nombre')
    .order('nombre');

  const rubrosList = rubrosRows?.map((r) => r.nombre).filter(Boolean) as string[] || [];

  // Helper to fetch filter-scoped counts
  const getFilterCount = async (filterName: 'video_ready' | 'contacted_wa' | 'landing_opened' | 'closed'): Promise<number> => {
    let q = supabase.from('raw_leads').select('id', { count: 'exact', head: true });
    
    if (status === 'sin_contactar') {
      q = q.or('crm_status.eq.sin_contactar,crm_status.is.null');
    } else {
      q = q.eq('crm_status', status);
    }
    
    if (rubro !== 'all') {
      q = q.eq('rubro', rubro);
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

  return {
    rawLeads: rawLeads || [],
    count: count || 0,
    page,
    rubro,
    rubrosList,
    stats,
    pageSize: PAGE_SIZE,
  };
}
