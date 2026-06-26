'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { updateLeadStatus, updateLeadScore } from './actions';

interface RawLeadItem {
  id: string;
  raw_data: {
    name?: string;
    rating?: number;
    url?: string;
    phone?: string;
    reviews?: number;
  };
  processed: boolean;
  rubro?: string;
  slug?: string;
  contact_data?: {
    phone?: string | null;
    phone_international?: string | null;
    website?: string | null;
    email?: string | null;
  } | null;
  created_at: string;
  video_queue?: { status: string; defectuoso: boolean; bunny_url?: string | null }[];
  outreach?: { canal: string; estado: string; notas: string | null; created_at: string }[];
  score?: number;
  crm_status?: 'sin_contactar' | 'contactado' | 'descartado';
  pipeline_stage?: 'prospecto' | 'propuesta' | 'cierre' | 'ganado' | 'perdido';
}

interface Stats {
  totalLeads: number;
  videoReady: number;
  contacted: number;
  landingsOpened: number;
  closed: number;
}

interface CrmClientProps {
  initialLeads: RawLeadItem[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  currentRubro: string;
  rubros: string[];
  stats: Stats;
  viewType: 'sin_contactar' | 'pipeline' | 'descartados';
}

// Reusable WhatsApp Outreach Button Component (checks for phone, opens link or copies message)
interface WhatsAppOutreachButtonProps {
  leadId: string;
  phone: string | null | undefined;
  messageText: string;
  highest: number;
  onWhatsAppClick: (leadId: string, highestStage: number) => void;
}

function WhatsAppOutreachButton({ leadId, phone, messageText, highest, onWhatsAppClick }: WhatsAppOutreachButtonProps) {
  const [copied, setCopied] = useState(false);
  const hasPhone = !!phone && phone.trim() !== '';

  const copyMessageText = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(messageText)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch((err) => {
          console.error('Failed to copy text: ', err);
          fallbackCopy(messageText);
        });
    } else {
      fallbackCopy(messageText);
    }
  };

  const fallbackCopy = (text: string) => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.position = "fixed";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      if (successful) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.error('Fallback copy exception: ', err);
    }
  };

  if (hasPhone) {
    const cleanPhone = phone.replace(/\D/g, '');
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`;
    return (
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => onWhatsAppClick(leadId, highest)}
        style={{
          background: 'rgba(76, 175, 80, 0.1)',
          border: '1px solid rgba(76, 175, 80, 0.3)',
          color: '#4caf50',
          borderRadius: '6px',
          padding: '6px 12px',
          fontSize: '11px',
          textDecoration: 'none',
          fontWeight: 600,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(76, 175, 80, 0.2)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(76, 175, 80, 0.1)';
        }}
      >
        💬 Abrir WhatsApp ↗
      </a>
    );
  }

  return (
    <button
      onClick={copyMessageText}
      style={{
        background: copied ? 'rgba(52, 168, 83, 0.15)' : 'rgba(255, 255, 255, 0.05)',
        border: copied ? '1px solid #34a853' : '1px solid rgba(255, 255, 255, 0.15)',
        color: copied ? '#34a853' : '#e8eaed',
        borderRadius: '6px',
        padding: '6px 12px',
        fontSize: '11px',
        cursor: 'pointer',
        fontWeight: 600,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => {
        if (!copied) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
      }}
      onMouseLeave={(e) => {
        if (!copied) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
      }}
    >
      📋 {copied ? 'Copiado ✓' : 'Copiar mensaje'}
    </button>
  );
}

export default function CrmClient({
  initialLeads,
  totalCount,
  currentPage,
  pageSize,
  currentRubro,
  rubros,
  stats,
  viewType = 'sin_contactar',
}: CrmClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [leads, setLeads] = useState<RawLeadItem[]>(initialLeads);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filterVideo, setFilterVideo] = useState<'all' | 'ready' | 'pending'>((searchParams.get('filterVideo') as any) || 'all');

  useEffect(() => {
    setLeads(initialLeads);
  }, [initialLeads]);

  const totalPages = Math.ceil(totalCount / pageSize);

  const navigate = (params: { page?: number; rubro?: string }) => {
    const p = new URLSearchParams();
    p.set('page', String(params.page ?? currentPage));
    p.set('rubro', params.rubro ?? currentRubro);
    startTransition(() => router.push(`${pathname}?${p.toString()}`));
  };

  const copyLandingUrl = (slug: string | undefined, id: string) => {
    if (!slug) return;
    const url = `leandrovenegas.cl/video/${slug}`;
    
    // Defensive clipboard copy with fallback
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url)
        .then(() => {
          setCopiedId(id);
          setTimeout(() => setCopiedId(null), 2000);
        })
        .catch((err) => {
          console.error('Failed to copy text using navigator.clipboard: ', err);
        });
    } else {
      // Legacy / Non-secure context fallback
      try {
        const textArea = document.createElement("textarea");
        textArea.value = url;
        // Avoid scrolling to bottom
        textArea.style.top = "0";
        textArea.style.left = "0";
        textArea.style.position = "fixed";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        if (successful) {
          setCopiedId(id);
          setTimeout(() => setCopiedId(null), 2000);
        } else {
          console.warn('Fallback copy failed');
        }
      } catch (err) {
        console.error('Fallback copy exception: ', err);
      }
    }
  };

  // Helper to determine the pipeline state
  const getPipelineStatus = (lead: RawLeadItem) => {
    const jobs = lead.video_queue || [];
    const outreach = lead.outreach || [];

    const videoReady = jobs.some((j) => j.status === 'completed' && !j.defectuoso);
    const waSent = outreach.some((o) => o.canal === 'whatsapp' && o.estado === 'contactado');
    const landingOpened = outreach.some((o) => o.canal === 'web');
    const emailLeft = outreach.some((o) => o.canal === 'email');
    const clickedWa = outreach.some((o) => o.notas && o.notas.toLowerCase().includes('clic'));
    const closed = outreach.some((o) => o.estado === 'cerrado');

    const steps = [videoReady, waSent, landingOpened, emailLeft, clickedWa, closed];
    
    let highest = 0;
    for (let i = 0; i < steps.length; i++) {
      if (steps[i]) {
        highest = i + 1;
      }
    }

    return { steps, highest };
  };

  const handleWhatsAppClick = async (leadId: string, highestStage: number) => {
    // Register outreach event when whatsapp is clicked (whatsapp contactado)
    if (highestStage < 2) {
      const { data, error } = await supabase
        .from('outreach')
        .insert({ lead_id: leadId, canal: 'whatsapp', estado: 'contactado' })
        .select()
        .single();
      if (!error && data) {
        // If we are in the inbox, moving them to pipeline makes sense immediately
        if (viewType === 'sin_contactar') {
          handleUpdateStatus(leadId, 'contactado', 'prospecto');
        } else {
          // Optimistically update locally
          setLeads((prev) =>
            prev.map((l) =>
              l.id === leadId
                ? {
                    ...l,
                    outreach: [...(l.outreach || []), data],
                  }
                : l
            )
          );
        }
      }
    }
  };

  const handleScoreChange = async (leadId: string, newScore: number) => {
    if (isNaN(newScore)) return;
    const validatedScore = Math.max(1, Math.min(100, newScore));

    // Update locally and immediately re-sort DESC
    setLeads((prev) => {
      const updated = prev.map((l) =>
        l.id === leadId ? { ...l, score: validatedScore } : l
      );
      return updated.sort((a, b) => (b.score ?? 50) - (a.score ?? 50));
    });

    try {
      await updateLeadScore(leadId, validatedScore);
    } catch (error) {
      console.error('Error updating lead score:', error);
    }
  };

  const handleUpdateStatus = async (leadId: string, status: string, stage?: string) => {
    // Remove lead from local view
    setLeads((prev) => prev.filter((l) => l.id !== leadId));

    const updateData: any = { crm_status: status };
    if (stage !== undefined) {
      updateData.pipeline_stage = stage;
    } else if (status === 'sin_contactar') {
      // Restoration defaults: reset score to 50 and clear stage
      updateData.score = 50;
      updateData.pipeline_stage = null;
    }

    try {
      await updateLeadStatus(leadId, status, stage);
    } catch (error) {
      console.error(`Error updating lead crm_status to ${status}:`, error);
    }
  };

  const handleStageChange = async (leadId: string, newStage: string) => {
    // Update locally
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, pipeline_stage: newStage as any } : l))
    );

    try {
      await updateLeadStatus(leadId, undefined as any, newStage); // Pass undefined for crm_status if we only update stage
    } catch (error) {
      console.error('Error updating pipeline stage:', error);
    }
  };

  const stepLabels = [
    'Video listo',
    'WhatsApp enviado',
    'Landing abierta',
    'Email dejado',
    'Clic WhatsApp',
    'Cerrado',
  ];

  // Filter leads dynamically on client side
  const filteredLeads = leads.filter((lead) => {
    const { steps } = getPipelineStatus(lead);
    const videoReady = steps[0];

    if (filterVideo === 'ready') return videoReady;
    if (filterVideo === 'pending') return !videoReady;
    return true;
  });

  return (
    <div style={{ padding: '24px 40px', color: '#e8eaed', background: '#121212', minHeight: '100vh', fontFamily: "'Roboto', sans-serif" }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333', paddingBottom: '20px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 500 }}>
            {viewType === 'sin_contactar' && 'CRM - Leads Sin Contactar'}
            {viewType === 'pipeline' && 'CRM - Pipeline de Contactados'}
            {viewType === 'descartados' && 'CRM - Archivo Muerto (Descartados)'}
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#9aa0a6' }}>
            {totalCount} prospectos en total · Página {currentPage} de {totalPages}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link
            href="/dashboard/queue"
            style={{ textDecoration: 'none', background: '#1e1e1e', border: '1px solid #333', color: '#e8eaed', padding: '10px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            🎬 Ver Cola de Renderizado
          </Link>
        </div>
      </div>

      {/* CRM NAVIGATION TABS */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #333', paddingBottom: '0px', marginBottom: '24px' }}>
        {[
          { label: '📥 Sin Contactar', path: '/dashboard/crm' },
          { label: '🤝 Pipeline de Contacto', path: '/dashboard/crm/pipeline' },
          { label: '🗑️ Descartados', path: '/dashboard/crm/descartados' },
        ].map((tab) => {
          const isActive = pathname === tab.path;
          return (
            <Link
              key={tab.path}
              href={tab.path}
              style={{
                textDecoration: 'none',
                padding: '12px 20px',
                borderBottom: isActive ? '3px solid #8ab4f8' : '3px solid transparent',
                color: isActive ? '#8ab4f8' : '#9aa0a6',
                fontWeight: isActive ? 600 : 500,
                fontSize: '14px',
                transition: 'all 0.2s',
              }}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* PIPELINE GENERAL STATS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Total Leads', value: stats.totalLeads, color: '#8ab4f8', icon: '👥' },
          { label: 'Videos Listos', value: stats.videoReady, color: '#34a853', icon: '✅' },
          { label: 'Contactados WA', value: stats.contacted, color: '#4285f4', icon: '💬' },
          { label: 'Landings Abiertas', value: stats.landingsOpened, color: '#f4b400', icon: '🌐' },
          { label: 'Clientes Cerrados', value: stats.closed, color: '#ea4335', icon: '🏆' },
        ].map(({ label, value, color, icon }) => (
          <div key={label} style={{ background: '#1e1e1e', border: '1px solid #333', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{ fontSize: '24px' }}>{icon}</span>
            <div>
              <div style={{ fontSize: '20px', fontWeight: 700, color }}>{value}</div>
              <div style={{ fontSize: '11px', color: '#9aa0a6', marginTop: '2px' }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* FILTER BAR */}
      <div style={{ display: 'flex', gap: '20px', background: '#1e1e1e', border: '1px solid #333', borderRadius: '12px', padding: '14px', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '13px', fontWeight: 500, color: '#9aa0a6' }}>Filtrar por Rubro:</span>
          <select
            value={currentRubro}
            onChange={(e) => navigate({ rubro: e.target.value, page: 1 })}
            style={{ background: '#2d2d2d', border: '1px solid #444', color: '#e8eaed', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', outline: 'none', cursor: 'pointer', minWidth: '200px' }}
          >
            <option value="all">Todos los Rubros</option>
            {rubros.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '13px', fontWeight: 500, color: '#9aa0a6' }}>Estado de Video:</span>
          <select
            value={filterVideo}
            onChange={(e) => setFilterVideo(e.target.value as any)}
            style={{ background: '#2d2d2d', border: '1px solid #444', color: '#e8eaed', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', outline: 'none', cursor: 'pointer', minWidth: '200px' }}
          >
            <option value="all">Todos los Videos</option>
            <option value="ready">Solo Videos Listos ✅</option>
            <option value="pending">Sin Video Listo ⏳</option>
          </select>
        </div>
        {isPending && <span style={{ fontSize: '12px', color: '#8ab4f8', animation: 'pulse 1.5s infinite' }}>Cargando...</span>}
      </div>

      {/* LEADS LIST */}
      <div style={{ background: '#1e1e1e', border: '1px solid #333', borderRadius: '14px', padding: '20px', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', opacity: isPending ? 0.6 : 1, transition: 'opacity 0.2s' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ color: '#9aa0a6', borderBottom: '1px solid #333', textAlign: 'left' }}>
                <th style={{ padding: '12px 14px', fontWeight: 500 }}>Negocio</th>
                <th style={{ padding: '12px 14px', fontWeight: 500 }}>Rubro / Calificación</th>
                <th style={{ padding: '12px 14px', fontWeight: 500, textAlign: 'center' }}>Score</th>
                {viewType === 'pipeline' && (
                  <th style={{ padding: '12px 14px', fontWeight: 500, textAlign: 'center' }}>Etapa Pipeline</th>
                )}
                <th style={{ padding: '12px 14px', fontWeight: 500, textAlign: 'center' }}>Flujo de Prospección (CRM Pipeline)</th>
                <th style={{ padding: '12px 14px', fontWeight: 500, textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead) => {
                const name = lead.raw_data.name || 'Sin nombre';
                const rating = lead.raw_data.rating || 0;
                const reviews = lead.raw_data.reviews || 0;
                const phoneInternational = lead.contact_data?.phone_international;
                const { steps, highest } = getPipelineStatus(lead);
                
                // Final unencoded message text using exact variables
                const messageText = `Hola, soy Leandro — especialista en video para negocios.
 
Vi el perfil de ${name} en Google y armé un video corto con las reseñas de sus clientes. Es gratis, listo para usar en redes.
 
👉 https://leandrovenegas.cl/video/${lead.slug || ''}
 
Estoy validando este tipo de videos y necesito casos reales. Por eso lo regalo.
 
Dime qué te parece.`;

                return (
                  <tr key={lead.id} style={{ borderBottom: '1px solid #2a2a2a' }} className="hover:bg-white/[0.02] transition-colors">
                    
                    {/* COL 1: Business Details */}
                    <td style={{ padding: '16px 14px', minWidth: '220px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <Link
                          href={`/dashboard/crm/${lead.id}?from=${viewType}&rubro=${encodeURIComponent(currentRubro)}&page=${currentPage}&filterVideo=${filterVideo}`}
                          style={{ fontWeight: 600, color: '#8ab4f8', textDecoration: 'none', fontSize: '14px' }}
                        >
                          {name} ↗
                        </Link>
                        {lead.slug && (
                          <span style={{ fontSize: '11px', color: '#9aa0a6', fontFamily: 'monospace' }}>
                            slug: {lead.slug}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* COL 2: Rubro & Stars */}
                    <td style={{ padding: '16px 14px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '12px', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '4px', alignSelf: 'start', border: '1px solid rgba(255,255,255,0.08)' }}>
                          {lead.rubro || 'Sin Rubro'}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ color: '#f4b400', fontSize: '14px' }}>★</span>
                          <span style={{ fontWeight: 500, color: '#e8eaed' }}>{rating}</span>
                          <span style={{ color: '#9aa0a6', fontSize: '11px' }}>({reviews} reseñas)</span>
                        </div>
                      </div>
                    </td>

                    {/* COL 3: Score (Inline numeric input unless discarded) */}
                    <td style={{ padding: '16px 14px', textAlign: 'center' }}>
                      {viewType === 'descartados' ? (
                        <span style={{ fontWeight: 600, fontSize: '14px', color: '#e8eaed' }}>
                          {lead.score ?? 50}
                        </span>
                      ) : (
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={lead.score ?? 50}
                          onChange={(e) => handleScoreChange(lead.id, parseInt(e.target.value))}
                          style={{
                            background: '#2d2d2d',
                            border: '1px solid #444',
                            color: '#e8eaed',
                            borderRadius: '6px',
                            padding: '6px 10px',
                            width: '65px',
                            textAlign: 'center',
                            outline: 'none',
                          }}
                        />
                      )}
                    </td>

                    {/* COL 4 (Conditional): Pipeline Stage Selector */}
                    {viewType === 'pipeline' && (
                      <td style={{ padding: '16px 14px', textAlign: 'center' }}>
                        <select
                          value={lead.pipeline_stage || 'prospecto'}
                          onChange={(e) => handleStageChange(lead.id, e.target.value)}
                          style={{
                            background: '#2d2d2d',
                            border: '1px solid #444',
                            color: '#e8eaed',
                            borderRadius: '8px',
                            padding: '8px 12px',
                            fontSize: '12px',
                            outline: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          <option value="prospecto">Prospecto 🤝</option>
                          <option value="propuesta">Propuesta 📄</option>
                          <option value="cierre">Cierre ⏳</option>
                          <option value="ganado">Ganado 🎉</option>
                          <option value="perdido">Perdido ❌</option>
                        </select>
                      </td>
                    )}

                    {/* COL 5: Visual Pipeline */}
                    <td style={{ padding: '16px 14px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyItems: 'center', gap: '4px' }}>
                          {steps.map((completed, index) => (
                            <React.Fragment key={index}>
                              <div
                                title={`${stepLabels[index]}: ${completed ? 'Completado' : 'Pendiente'}`}
                                style={{
                                  width: '26px',
                                  height: '26px',
                                  borderRadius: '50%',
                                  background: completed ? 'rgba(52,168,83,0.15)' : 'rgba(255,255,255,0.05)',
                                  border: `1.5px solid ${completed ? '#34a853' : 'rgba(255,255,255,0.15)'}`,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '11px',
                                  color: completed ? '#34a853' : '#9aa0a6',
                                  fontWeight: 700,
                                  cursor: 'help',
                                }}
                              >
                                {completed ? '✓' : index + 1}
                              </div>
                              {index < steps.length - 1 && (
                                <div
                                  style={{
                                    width: '16px',
                                    height: '2px',
                                    background: steps[index + 1] ? '#34a853' : 'rgba(255,255,255,0.1)',
                                  }}
                                />
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                        <span style={{ fontSize: '10.5px', color: '#9aa0a6', fontWeight: 500 }}>
                          Etapa actual: <span style={{ color: highest > 0 ? '#34a853' : '#ea4335', fontWeight: 600 }}>{highest > 0 ? stepLabels[highest - 1] : 'Ninguna'}</span>
                        </span>
                      </div>
                    </td>

                    {/* COL 6: Outreach Actions */}
                    <td style={{ padding: '16px 14px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        
                        {/* Status buttons based on viewType */}
                        {viewType === 'sin_contactar' && (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(lead.id, 'contactado', 'prospecto')}
                              style={{
                                background: 'rgba(52, 168, 83, 0.15)',
                                border: '1px solid rgba(52, 168, 83, 0.4)',
                                color: '#2bcc71',
                                borderRadius: '6px',
                                padding: '6px 12px',
                                fontSize: '11px',
                                cursor: 'pointer',
                                fontWeight: 600,
                                transition: 'all 0.2s',
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(52, 168, 83, 0.25)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(52, 168, 83, 0.15)'}
                            >
                              📞 Contactado
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(lead.id, 'descartado')}
                              style={{
                                background: 'rgba(234, 67, 53, 0.15)',
                                border: '1px solid rgba(234, 67, 53, 0.4)',
                                color: '#ea4335',
                                borderRadius: '6px',
                                padding: '6px 12px',
                                fontSize: '11px',
                                cursor: 'pointer',
                                fontWeight: 600,
                                transition: 'all 0.2s',
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(234, 67, 53, 0.25)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(234, 67, 53, 0.15)'}
                            >
                              🗑️ Descartar
                            </button>
                          </>
                        )}

                        {viewType === 'pipeline' && (
                          <button
                            onClick={() => handleUpdateStatus(lead.id, 'descartado')}
                            style={{
                              background: 'rgba(234, 67, 53, 0.15)',
                              border: '1px solid rgba(234, 67, 53, 0.4)',
                              color: '#ea4335',
                              borderRadius: '6px',
                              padding: '6px 12px',
                              fontSize: '11px',
                              cursor: 'pointer',
                              fontWeight: 600,
                              transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(234, 67, 53, 0.25)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(234, 67, 53, 0.15)'}
                          >
                            🗑️ Descartar
                          </button>
                        )}

                        {viewType === 'descartados' && (
                          <button
                            onClick={() => handleUpdateStatus(lead.id, 'sin_contactar')}
                            style={{
                              background: 'rgba(138, 180, 248, 0.15)',
                              border: '1px solid rgba(138, 180, 248, 0.4)',
                              color: '#8ab4f8',
                              borderRadius: '6px',
                              padding: '6px 12px',
                              fontSize: '11px',
                              cursor: 'pointer',
                              fontWeight: 600,
                              transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(138, 180, 248, 0.25)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(138, 180, 248, 0.15)'}
                          >
                            🔄 Restaurar
                          </button>
                        )}

                        {/* URL Copy Button */}
                        {lead.slug && (
                          <button
                            onClick={() => copyLandingUrl(lead.slug, lead.id)}
                            style={{
                              background: copiedId === lead.id ? 'rgba(52,168,83,0.15)' : '#2d2d2d',
                              border: `1px solid ${copiedId === lead.id ? '#34a853' : '#444'}`,
                              color: copiedId === lead.id ? '#34a853' : '#e8eaed',
                              borderRadius: '6px',
                              padding: '6px 12px',
                              fontSize: '11px',
                              cursor: 'pointer',
                              fontWeight: 500,
                              transition: 'all 0.2s',
                            }}
                          >
                            {copiedId === lead.id ? 'Copiado! 👍' : '🔗 Copiar Landing'}
                          </button>
                        )}

                        {/* WhatsApp Outreach Action */}
                        <WhatsAppOutreachButton
                          leadId={lead.id}
                          phone={phoneInternational}
                          messageText={messageText}
                          highest={highest}
                          onWhatsAppClick={handleWhatsAppClick}
                        />

                        {/* Video MP4 Button from Bunny.net */}
                        {lead.video_queue && lead.video_queue.find(q => q.status === 'completed' && !q.defectuoso)?.bunny_url && (
                          <a
                            href={lead.video_queue.find(q => q.status === 'completed' && !q.defectuoso)?.bunny_url || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              background: 'rgba(138, 180, 248, 0.1)',
                              border: '1px solid rgba(138, 180, 248, 0.3)',
                              color: '#8ab4f8',
                              borderRadius: '6px',
                              padding: '6px 12px',
                              fontSize: '11px',
                              textDecoration: 'none',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            📹 Ver Video ↗
                          </a>
                        )}

                        {/* GA4 Reporting Button */}
                        <a
                          href="https://analytics.google.com/"
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            background: 'rgba(244, 180, 0, 0.1)',
                            border: '1px solid rgba(244, 180, 0, 0.3)',
                            color: '#f4b400',
                            borderRadius: '6px',
                            padding: '6px 12px',
                            fontSize: '11px',
                            textDecoration: 'none',
                            fontWeight: 500,
                          }}
                        >
                          📈 GA4
                        </a>

                        {/* Google Maps Button */}
                        {lead.raw_data.url && (
                          <a
                            href={lead.raw_data.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              background: 'rgba(138, 180, 248, 0.1)',
                              border: '1px solid rgba(138, 180, 248, 0.3)',
                              color: '#8ab4f8',
                              borderRadius: '6px',
                              padding: '6px 12px',
                              fontSize: '11px',
                              textDecoration: 'none',
                              fontWeight: 500,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            📍 Google Maps
                          </a>
                        )}

                      </div>
                    </td>

                  </tr>
                );
              })}
              {filteredLeads.length === 0 && (
                <tr>
                  <td colSpan={viewType === 'pipeline' ? 6 : 5} style={{ padding: '40px', textAlign: 'center', color: '#9aa0a6' }}>
                    Sin prospectos para este filtro o rubro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #2a2a2a' }}>
          <span style={{ fontSize: '12px', color: '#9aa0a6' }}>
            Mostrando {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, totalCount)} de {totalCount}
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              disabled={currentPage <= 1 || isPending}
              onClick={() => navigate({ page: currentPage - 1 })}
              style={{ background: '#2d2d2d', border: '1px solid #444', color: currentPage <= 1 ? '#555' : '#e8eaed', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', cursor: currentPage <= 1 ? 'not-allowed' : 'pointer' }}
            >
              ← Anterior
            </button>
            <span style={{ padding: '8px 16px', fontSize: '13px', color: '#9aa0a6' }}>
              {currentPage} / {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages || isPending}
              onClick={() => navigate({ page: currentPage + 1 })}
              style={{ background: '#2d2d2d', border: '1px solid #444', color: currentPage >= totalPages ? '#555' : '#e8eaed', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer' }}
            >
              Siguiente →
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
