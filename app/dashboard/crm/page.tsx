import React from 'react';
import { supabase } from '@/lib/supabase/client';
import CrmClient from './CrmClient';

export const revalidate = 0; // Disable static rendering

const PAGE_SIZE = 50;

export default async function CrmPage(props: {
  searchParams: Promise<{ page?: string; rubro?: string }> | { page?: string; rubro?: string };
}) {
  // Safe resolution of searchParams (fully compatible with all Next.js versions)
  const resolvedSearchParams = await props.searchParams;
  const page = Math.max(1, parseInt(resolvedSearchParams.page || '1'));
  const rubro = resolvedSearchParams.rubro || 'all';

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  // 1. Fetch raw_leads with pagination and filters
  let query = supabase
    .from('raw_leads')
    .select('*, video_queue(status, defectuoso), outreach(*)', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (rubro !== 'all') {
    query = query.eq('rubro', rubro);
  }

  const { data: rawLeads, count, error } = await query.range(from, to);

  if (error) {
    console.error('Error fetching CRM leads:', error);
  }

  // 2. Fetch all unique rubros to populate filter dropdown
  const { data: rubroRows } = await supabase
    .from('raw_leads')
    .select('rubro')
    .not('rubro', 'is', null);

  const rubrosList = Array.from(
    new Set(rubroRows?.map((r) => r.rubro).filter(Boolean) || [])
  ).sort() as string[];

  // 3. Compute stats for general indicators
  // We can fetch status from all video_queue to show complete stats
  const { data: allQueue } = await supabase
    .from('video_queue')
    .select('status, defectuoso');

  const { data: allOutreach } = await supabase
    .from('outreach')
    .select('canal, estado, notas');

  const stats = {
    totalLeads: count || 0,
    videoReady: allQueue?.filter((q) => q.status === 'completed' && !q.defectuoso).length || 0,
    contacted: allOutreach?.filter((o) => o.canal === 'whatsapp' && o.estado === 'contactado').length || 0,
    landingsOpened: allOutreach?.filter((o) => o.canal === 'web').length || 0,
    closed: allOutreach?.filter((o) => o.estado === 'cerrado').length || 0,
  };

  return (
    <CrmClient
      initialLeads={rawLeads || []}
      totalCount={count || 0}
      currentPage={page}
      pageSize={PAGE_SIZE}
      currentRubro={rubro}
      rubros={rubrosList}
      stats={stats}
    />
  );
}
