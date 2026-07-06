import React from 'react';
import fs from 'fs';
import path from 'path';
import { supabase } from '@/lib/supabase';
import { getGeneralTemplates } from './actions';
import QueueClient from './QueueClient';

export const revalidate = 0; // Disable static rendering

export default async function QueuePage() {
  const FRAMES_DIR = process.env.FRAMES_DIR || 'Z:/proyects/frame-extractor/frames';

  // 1. Fetch current outreach_queue
  const { data: queueItems, error: queueErr } = await supabase
    .from('outreach_queue')
    .select('lead_id, position, raw_leads(*)')
    .order('position', { ascending: true });

  // If table outreach_queue doesn't exist yet, render a friendly setup guide
  if (queueErr) {
    console.log('outreach_queue table query returned error (might not exist yet):', queueErr.message);
    return (
      <div style={{ padding: '40px', color: '#e8eaed', background: '#121212', minHeight: '100vh', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <div style={{ background: '#1e1e1e', border: '1px solid #333', borderRadius: '12px', padding: '32px', maxWidth: '600px', width: '100%' }}>
          <h2 style={{ color: '#ea4335', margin: '0 0 16px 0', fontSize: '22px' }}>
            ⚠️ Configuración de Supabase Requerida
          </h2>
          <p style={{ color: '#9aa0a6', fontSize: '14.5px', lineHeight: '1.6', margin: '0 0 20px 0' }}>
            Para habilitar la cola de envíos de WhatsApp, debes crear la tabla <strong>outreach_queue</strong> y las columnas necesarias ejecutando el siguiente script SQL en el editor de Supabase:
          </p>
          <pre style={{ background: '#121212', border: '1px solid #444', padding: '16px', borderRadius: '8px', overflowX: 'auto', textAlign: 'left', fontSize: '12px', color: '#81c995', margin: '0 0 24px 0' }}>
{`-- Crear tabla de la cola de outreach
CREATE TABLE IF NOT EXISTS public.outreach_queue (
    lead_id uuid PRIMARY KEY REFERENCES public.raw_leads(id) ON DELETE CASCADE,
    position integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.outreach_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir lectura pública de cola" ON public.outreach_queue FOR SELECT USING (true);
CREATE POLICY "Permitir escrituras y modificaciones públicas" ON public.outreach_queue FOR ALL USING (true) WITH CHECK (true);

-- Agregar columnas para mensajería personalizada
ALTER TABLE public.bot_config ADD COLUMN IF NOT EXISTS message_template text;
ALTER TABLE public.bot_config ADD COLUMN IF NOT EXISTS message_template_2 text;
ALTER TABLE public.raw_leads ADD COLUMN IF NOT EXISTS message_override text;
ALTER TABLE public.raw_leads ADD COLUMN IF NOT EXISTS message_override_2 text;`}
          </pre>
          <a
            href="/dashboard/crm"
            style={{
              display: 'inline-block',
              background: '#1a73e8',
              color: '#fff',
              padding: '10px 20px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 500
            }}
          >
            Volver al CRM
          </a>
        </div>
      </div>
    );
  }

  // 2. Fetch ALL matching raw_leads by looping in chunks of 1000 to completely remove any limits
  let allLeads: any[] = [];
  const limit = 1000;
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from('raw_leads')
      .select('*, video_queue(status, defectuoso)')
      .or('crm_status.eq.sin_contactar,crm_status.is.null')
      .order('score', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.log('Error fetching leads batch:', error.message);
      break;
    }

    if (!data || data.length === 0) {
      break;
    }

    allLeads = [...allLeads, ...data];
    if (data.length < limit) {
      break;
    }
    offset += limit;
  }

  console.log(`Fetched ${allLeads.length} total eligible leads from Supabase.`);

  // 3. Fetch general templates from bot_config
  let template1 = '';
  let template2 = '';
  try {
    const templates = await getGeneralTemplates();
    template1 = templates.template1;
    template2 = templates.template2;
  } catch (e) {
    console.log('Error loading general templates (bot_config table might need migration):', e);
  }

  // Map queue leads
  const currentQueue = (queueItems || [])
    .map((item: any) => {
      const lead = item.raw_leads;
      return lead ? {
        id: lead.id,
        name: lead.raw_data?.name || 'Lead sin nombre',
        phone: lead.contact_data?.phone_international || lead.contact_data?.phone || 'Sin teléfono',
        position: item.position,
        hasOverride: !!lead.message_override || !!lead.message_override_2,
        rubro: lead.rubro || '',
        score: lead.score || 50
      } : null;
    })
    .filter(Boolean);

  const queuedIds = new Set(currentQueue.map((q: any) => q.id));

  // 4. Filter available leads that have a frame (or completed video fallback) and are not already in the queue
  const availableLeads = availableLeadsFilter(allLeads, queuedIds, FRAMES_DIR);

  return (
    <QueueClient
      initialAvailable={availableLeads}
      initialQueue={currentQueue as any}
      initialGeneralTemplate={template1}
      initialGeneralTemplate2={template2}
    />
  );
}

function availableLeadsFilter(allLeads: any[], queuedIds: Set<string>, FRAMES_DIR: string) {
  return allLeads
    .filter((lead: any) => {
      // Check if already in queue
      if (queuedIds.has(lead.id)) return false;

      // Verify frame exists
      const framePath = path.join(FRAMES_DIR, `frame_${lead.id}.jpg`);
      const hasFrameFile = fs.existsSync(framePath);

      if (hasFrameFile) return true;

      // Fallback: has completed, non-defective video queue item
      const hasCompletedVideo = lead.video_queue?.some(
        (vq: any) => vq.status === 'completed' && !vq.defectuoso
      );

      return hasCompletedVideo;
    })
    .map((lead: any) => ({
      id: lead.id,
      name: lead.raw_data?.name || 'Lead sin nombre',
      phone: lead.contact_data?.phone_international || lead.contact_data?.phone || 'Sin teléfono',
      score: lead.score || 50,
      hasOverride: !!lead.message_override || !!lead.message_override_2,
      rubro: lead.rubro || ''
    }));
}
