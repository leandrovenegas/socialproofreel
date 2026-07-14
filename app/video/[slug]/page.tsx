import React from 'react';
import { supabase } from '@/lib/supabase/client';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import VideoLandingClient from './VideoLandingClient';

interface VideoPageProps {
  params: Promise<{ slug: string }>;
}

async function getLeadBySlug(slug: string) {
  const { data, error } = await supabase
    .from('raw_leads')
    .select('*, video_queue(status, defectuoso, bunny_url, id)')
    .eq('slug', slug)
    .single();

  if (error || !data) return null;
  return data;
}

export async function generateMetadata({ params }: VideoPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const lead = await getLeadBySlug(resolvedParams.slug);
  const businessName = lead?.raw_data?.name || 'Tu Negocio';

  return {
    title: `${businessName} — Video de Reseñas | SocialProofREEL`,
    description: `Mira el video de reseñas de ${businessName}. Tus mejores reseñas de Google transformadas en un video profesional.`,
    openGraph: {
      title: `${businessName} — Video de Reseñas`,
      description: `Las mejores reseñas de ${businessName} en un video profesional.`,
      type: 'video.other',
    },
  };
}

export const revalidate = 0;

export default async function VideoPage({ params }: VideoPageProps) {
  const resolvedParams = await params;
  const lead = await getLeadBySlug(resolvedParams.slug);

  if (!lead) {
    notFound();
  }

  const videoJob = (lead.video_queue || []).find(
    (q: { status: string; defectuoso: boolean; bunny_url?: string | null }) =>
      q.status === 'completed' && !q.defectuoso && q.bunny_url
  );

  const businessName = lead.raw_data?.name || 'Tu Negocio';
  const rating = lead.raw_data?.rating || 0;
  const reviews = lead.raw_data?.reviews || 0;
  const bunnyUrl = videoJob?.bunny_url || null;

  return (
    <VideoLandingClient
      businessName={businessName}
      rating={rating}
      reviews={reviews}
      bunnyUrl={bunnyUrl}
      slug={resolvedParams.slug}
      leadId={lead.id}
      contactData={lead.contact_data}
    />
  );
}
