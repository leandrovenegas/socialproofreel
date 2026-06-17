import React from 'react';
import { supabase } from '@/lib/supabase/client';
import LeadDetail from './LeadDetail';

export const revalidate = 0;

export default async function LeadDetailPage(props: {
  params: Promise<{ leadId: string }>;
}) {
  // Safe resolution of params (fully compatible with all Next.js versions)
  const resolvedParams = await props.params;
  const leadId = resolvedParams.leadId;

  // 1. Fetch raw lead details joined with video_queue and outreach
  const { data: lead, error } = await supabase
    .from('raw_leads')
    .select('*, video_queue(*), outreach(*)')
    .eq('id', leadId)
    .single();

  if (error || !lead) {
    console.error('Error fetching lead details:', error);
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#e8eaed', background: '#121212', minHeight: '100vh' }}>
        <h2 style={{ color: '#ea4335' }}>❌ Lead No Encontrado</h2>
        <p style={{ color: '#9aa0a6', marginTop: '10px' }}>No pudimos encontrar el prospecto con ID: {leadId}</p>
        <a href="/dashboard/crm" style={{ color: '#8ab4f8', textDecoration: 'none', display: 'inline-block', marginTop: '20px' }}>
          Volver al CRM
        </a>
      </div>
    );
  }

  // Sort outreach records chronologically by date
  const outreachRecords = (lead.outreach || []).sort(
    (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return (
    <LeadDetail
      lead={lead}
      initialOutreach={outreachRecords}
    />
  );
}
