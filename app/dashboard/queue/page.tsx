import { supabase } from '@/lib/supabase/client';
import QueueClient from './QueueClient';

export const revalidate = 0;

const PAGE_SIZE = 50;

export default async function QueuePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; rubro?: string }>;
}) {
  const { page: pageParam, status: statusParam, rubro: rubroParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam || '1'));
  const status = statusParam || 'all';
  const rubro = rubroParam || 'all';

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from('video_queue')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (status !== 'all') query = query.eq('status', status);
  if (rubro !== 'all') query = query.eq('rubro', rubro);

  const { data: queueData, count } = await query;

  // Stats y rubros
  const { data: allStatuses } = await supabase
    .from('video_queue')
    .select('status, rubro');

  const stats = {
    total: allStatuses?.length || 0,
    pending: allStatuses?.filter((r) => r.status === 'pending').length || 0,
    completed: allStatuses?.filter((r) => r.status === 'completed').length || 0,
    failed: allStatuses?.filter((r) => r.status === 'failed').length || 0,
    rendering: allStatuses?.filter((r) => r.status === 'rendering').length || 0,
  };

  const rubros = Array.from(
    new Set(allStatuses?.map((r) => r.rubro).filter(Boolean) || [])
  ).sort() as string[];

  // Leads sin procesar
  const { data: rawLeads } = await supabase
    .from('raw_leads')
    .select('id, raw_data, processed, rubro')
    .eq('processed', false)
    .limit(10);

  return (
    <QueueClient
      initialQueue={queueData || []}
      initialLeads={rawLeads || []}
      totalCount={count || 0}
      currentPage={page}
      pageSize={PAGE_SIZE}
      currentStatus={status}
      currentRubro={rubro}
      rubros={rubros}
      stats={stats}
    />
  );
}