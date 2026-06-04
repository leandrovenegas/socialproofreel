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
    .select('*, video_queue!inner(status, defectuoso, bunny_url), outreach(*)', { count: 'exact' })
    .eq('video_queue.status', 'completed')
    .eq('video_queue.defectuoso', false)
    .not('video_queue.bunny_url', 'is', null)
    .order('created_at', { ascending: false });

  if (rubro !== 'all') {
    query = query.eq('rubro', rubro);
  }

  const { data: rawLeads, count, error } = await query.range(from, to);

  if (error) {
    console.error('Error fetching CRM leads:', error);
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
