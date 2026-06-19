import { supabase } from '@/lib/supabase';

const PAGE_SIZE = 50;

export async function fetchCrmData(
  status: 'sin_contactar' | 'contactado' | 'descartado',
  searchParams: { page?: string; rubro?: string }
) {
  const page = Math.max(1, parseInt(searchParams.page || '1'));
  const rubro = searchParams.rubro || 'all';

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  // 1. Fetch raw_leads with pagination and filters
  let query = supabase
    .from('raw_leads')
    .select('*, video_queue(status, defectuoso, bunny_url), outreach(*)', { count: 'exact' });

  if (status === 'sin_contactar') {
    query = query.or('crm_status.eq.sin_contactar,crm_status.is.null');
  } else {
    query = query.eq('crm_status', status);
  }

  if (rubro !== 'all') {
    query = query.eq('rubro', rubro);
  }

  // Order by score DESC, and fallback to created_at DESC
  query = query.order('score', { ascending: false }).order('created_at', { ascending: false });

  const { data: rawLeads, count, error } = await query.range(from, to);

  if (error) {
    console.error(`Error fetching CRM leads for status ${status}:`, error);
  }

  // 2. Fetch all unique rubros to populate filter dropdown from 'rubros' table
  const { data: rubrosRows } = await supabase
    .from('rubros')
    .select('nombre')
    .order('nombre');

  const rubrosList = rubrosRows?.map((r) => r.nombre).filter(Boolean) as string[] || [];

  // 3. Compute stats for general indicators
  const [
    { count: videoReadyCount },
    { count: contactedCount },
    { count: landingsOpenedCount },
    { count: closedCount }
  ] = await Promise.all([
    supabase.from('video_queue').select('*', { count: 'exact', head: true }).eq('status', 'completed').eq('defectuoso', false),
    supabase.from('outreach').select('*', { count: 'exact', head: true }).eq('canal', 'whatsapp').eq('estado', 'contactado'),
    supabase.from('outreach').select('*', { count: 'exact', head: true }).eq('canal', 'web'),
    supabase.from('outreach').select('*', { count: 'exact', head: true }).eq('estado', 'cerrado'),
  ]);

  const stats = {
    totalLeads: count || 0,
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
