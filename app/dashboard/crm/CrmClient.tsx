'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

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
  video_queue?: { status: string; defectuoso: boolean }[];
  outreach?: { canal: string; estado: string; notas: string | null; created_at: string }[];
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
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${String(d.getUTCFullYear()).slice(2)}`;
}

export default function CrmClient({
  initialLeads,
  totalCount,
  currentPage,
  pageSize,
  currentRubro,
  rubros,
  stats,
}: CrmClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [leads, setLeads] = useState<RawLeadItem[]>(initialLeads);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    setLeads(initialLeads);
  }, [initialLeads]);

  const totalPages = Math.ceil(totalCount / pageSize);

  const navigate = (params: { page?: number; rubro?: string }) => {
    const p = new URLSearchParams();
    p.set('page', String(params.page ?? currentPage));
    p.set('rubro', params.rubro ?? currentRubro);
    startTransition(() => router.push(`/dashboard/crm?${p.toString()}`));
  };

  const copyLandingUrl = (slug: string | undefined, id: string) => {
    if (!slug) return;
    const url = `leandrovenegas.cl/video/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
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

  const getWhatsAppUrlAndMessage = (lead: RawLeadItem, highestStage: number) => {
    const phone = lead.contact_data?.phone_international || lead.contact_data?.phone || lead.raw_data?.phone || '';
    if (!phone) return { url: null, message: '' };

    const cleanPhone = phone.replace(/\D/g, '');
    const businessName = lead.raw_data.name || 'tu negocio';

    let message = '';
    if (highestStage <= 2) {
      message = `Hola! Vi que tienes reseñas en Google y te generé un video gratis con ellas. ¿Lo quieres ver?`;
    } else if (highestStage <= 4) {
      message = `Hola! ¿Pudiste ver el video? Lo hice especialmente para ${businessName}. Con esto puedes conseguir más clientes mostrando tus reseñas en redes.`;
    } else {
      message = `Hola! Para que puedas publicarlo y empezar a usarlo, el sistema completo tiene un valor de $X. ¿Te interesa?`;
    }

    return {
      url: `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`,
      message,
    };
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
  };

  const stepLabels = [
    'Video listo',
    'WhatsApp enviado',
    'Landing abierta',
    'Email dejado',
    'Clic WhatsApp',
    'Cerrado',
  ];

  return (
    <div style={{ padding: '24px 40px', color: '#e8eaed', background: '#121212', minHeight: '100vh', fontFamily: "'Roboto', sans-serif" }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333', paddingBottom: '20px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 500 }}>CRM de Leads</h1>
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
      <div style={{ display: 'flex', gap: '12px', background: '#1e1e1e', border: '1px solid #333', borderRadius: '12px', padding: '14px', marginBottom: '20px', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', fontWeight: 500, color: '#9aa0a6' }}>Filtrar por Rubro:</span>
        <select
          value={currentRubro}
          onChange={(e) => navigate({ rubro: e.target.value, page: 1 })}
          style={{ background: '#2d2d2d', border: '1px solid #444', color: '#e8eaed', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', outline: 'none', cursor: 'pointer', minWidth: '220px' }}
        >
          <option value="all">Todos los Rubros</option>
          {rubros.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
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
                <th style={{ padding: '12px 14px', fontWeight: 500, textAlign: 'center' }}>Flujo de Prospección (CRM Pipeline)</th>
                <th style={{ padding: '12px 14px', fontWeight: 500, textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => {
                const name = lead.raw_data.name || 'Sin nombre';
                const rating = lead.raw_data.rating || 0;
                const reviews = lead.raw_data.reviews || 0;
                const phone = lead.contact_data?.phone_international || lead.contact_data?.phone || lead.raw_data?.phone;
                const { steps, highest } = getPipelineStatus(lead);
                const { url: waUrl } = getWhatsAppUrlAndMessage(lead, highest);

                return (
                  <tr key={lead.id} style={{ borderBottom: '1px solid #2a2a2a' }} className="hover:bg-white/[0.02] transition-colors">
                    
                    {/* COL 1: Business Details */}
                    <td style={{ padding: '16px 14px', minWidth: '220px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <Link
                          href={`/dashboard/crm/${lead.id}`}
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

                    {/* COL 3: Visual Pipeline */}
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

                    {/* COL 4: Outreach Actions */}
                    <td style={{ padding: '16px 14px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        
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

                        {/* WhatsApp Pre-loaded Button */}
                        {phone ? (
                          waUrl ? (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => handleWhatsAppClick(lead.id, highest)}
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
                              }}
                            >
                              💬 WhatsApp ↗
                            </a>
                          ) : (
                            <span style={{ fontSize: '11px', color: '#ea4335' }}>WA No Disponible</span>
                          )
                        ) : (
                          <span style={{ fontSize: '11.5px', color: '#666', fontStyle: 'italic' }}>Sin teléfono</span>
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

                      </div>
                    </td>

                  </tr>
                );
              })}
              {leads.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: '#9aa0a6' }}>
                    Sin prospectos para este rubro.
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
