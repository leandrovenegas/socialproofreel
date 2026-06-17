'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

interface QueueItem {
  id: string;
  business_name: string;
  maps_url?: string;
  status: string;
  rubro?: string;
  execution_time_seconds?: number;
  local_video_path?: string;
  error_message?: string;
  defectuoso?: boolean;
  defecto_nota?: string;
  created_at: string;
  updated_at?: string;
}

interface RawLeadItem {
  id: string;
  raw_data: {
    name?: string;
    rating?: number;
    url?: string;
    link?: string;
    maps_url?: string;
  };
  processed: boolean;
  rubro?: string;
}

interface Stats {
  total: number;
  pending: number;
  completed: number;
  failed: number;
  rendering: number;
}

interface QueueClientProps {
  initialQueue: QueueItem[];
  initialLeads: RawLeadItem[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  currentStatus: string;
  currentRubro: string;
  rubros: string[];
  stats: Stats;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const local = new Date(d.getTime() - 4 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(local.getUTCDate())}/${pad(local.getUTCMonth() + 1)}/${String(local.getUTCFullYear()).slice(2)} ${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}`;
}

const STATUS_OPTIONS = ['all', 'pending', 'fetching_data', 'rendering', 'completed', 'failed'];

export default function QueueClient({
  initialQueue,
  initialLeads,
  totalCount,
  currentPage,
  pageSize,
  currentStatus,
  currentRubro,
  rubros,
  stats,
}: QueueClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);
  const [defectoModal, setDefectoModal] = useState<{ id: string; nota: string } | null>(null);
  const [leads, setLeads] = useState<RawLeadItem[]>(initialLeads);
  const [queue, setQueue] = useState<QueueItem[]>(initialQueue);

  useEffect(() => {
    setQueue(initialQueue);
  }, [initialQueue]);

  useEffect(() => {
    setLeads(initialLeads);
  }, [initialLeads]);

  const totalPages = Math.ceil(totalCount / pageSize);

  const navigate = (params: { page?: number; status?: string; rubro?: string }) => {
    const p = new URLSearchParams();
    p.set('page', String(params.page ?? currentPage));
    p.set('status', params.status ?? currentStatus);
    p.set('rubro', params.rubro ?? currentRubro);
    startTransition(() => router.push(`/dashboard/queue?${p.toString()}`));
  };

  const handleSendToQueue = async (leadId: string, name: string, mapsUrl?: string) => {
    setIsSubmitting(leadId);
    try {
      const { data, error } = await supabase
        .from('video_queue')
        .insert({ business_name: name, maps_url: mapsUrl || null, status: 'pending' })
        .select();
      if (error) throw error;
      setLeads((prev) => prev.filter((l) => l.id !== leadId));
    } catch (err) {
      alert('Error: ' + (err as Error).message);
    } finally {
      setIsSubmitting(null);
    }
  };

  const handleReRender = async (id: string) => {
    await supabase
      .from('video_queue')
      .update({ status: 'pending', defectuoso: false, defecto_nota: null, error_message: null })
      .eq('id', id);
    setQueue((prev) => prev.map((item) =>
      item.id === id ? { ...item, status: 'pending', defectuoso: false } : item
    ));
  };

  const handleMarcarDefecto = async () => {
    if (!defectoModal) return;
    const { id, nota } = defectoModal;
    await supabase.from('video_queue').update({ defectuoso: true, defecto_nota: nota }).eq('id', id);
    setQueue((prev) => prev.map((item) =>
      item.id === id ? { ...item, defectuoso: true, defecto_nota: nota } : item
    ));
    setDefectoModal(null);
  };

  const handleQuitarDefecto = async (id: string) => {
    await supabase.from('video_queue').update({ defectuoso: false, defecto_nota: null }).eq('id', id);
    setQueue((prev) => prev.map((item) =>
      item.id === id ? { ...item, defectuoso: false, defecto_nota: undefined } : item
    ));
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { bg: string; color: string; text: string }> = {
      pending:      { bg: 'rgba(244,180,0,0.15)',   color: '#f4b400', text: '⏳ Pendiente' },
      fetching_data:{ bg: 'rgba(66,133,244,0.15)',  color: '#4285f4', text: '🔍 Buscando' },
      rendering:    { bg: 'rgba(194,24,91,0.15)',   color: '#c2185b', text: '🎬 Renderizando' },
      completed:    { bg: 'rgba(52,168,83,0.15)',   color: '#34a853', text: '✅ Completado' },
      failed:       { bg: 'rgba(234,67,53,0.15)',   color: '#ea4335', text: '❌ Fallido' },
    };
    const s = map[status] || { bg: '#333', color: '#999', text: status };
    return (
      <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, backgroundColor: s.bg, color: s.color, border: `1px solid ${s.color}33` }}>
        {s.text}
      </span>
    );
  };

  return (
    <div style={{ padding: '24px 40px', color: '#e8eaed', background: '#121212', minHeight: '100vh', fontFamily: "'Roboto', sans-serif" }}>

      {/* Modal defecto */}
      {defectoModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1e1e1e', border: '1px solid #444', borderRadius: '12px', padding: '24px', width: '420px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ margin: 0, color: '#ea4335', fontSize: '16px' }}>⚠️ Marcar como defectuoso</h3>
            <textarea
              value={defectoModal.nota}
              onChange={(e) => setDefectoModal({ ...defectoModal, nota: e.target.value })}
              placeholder="Describe el problema..."
              rows={3}
              style={{ background: '#2d2d2d', border: '1px solid #444', borderRadius: '8px', color: '#e8eaed', padding: '10px', fontSize: '13px', resize: 'vertical', outline: 'none' }}
            />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setDefectoModal(null)} style={{ background: '#333', border: 'none', color: '#9aa0a6', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px' }}>Cancelar</button>
              <button onClick={handleMarcarDefecto} style={{ background: '#ea4335', border: 'none', color: '#fff', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>Marcar</button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div style={{ borderBottom: '1px solid #333', paddingBottom: '20px', marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 500 }}>Cola de Renderizado</h1>
        <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#9aa0a6' }}>
          {totalCount} trabajos · Página {currentPage} de {totalPages}
        </p>
      </div>

      {/* STATS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Total', value: stats.total, color: '#8ab4f8' },
          { label: 'Pendientes', value: stats.pending, color: '#f4b400' },
          { label: 'Completados', value: stats.completed, color: '#34a853' },
          { label: 'Fallidos', value: stats.failed, color: '#ea4335' },
          { label: 'Renderizando', value: stats.rendering, color: '#c2185b' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: '#1e1e1e', border: '1px solid #333', borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 700, color }}>{value}</div>
            <div style={{ fontSize: '11px', color: '#9aa0a6', marginTop: '4px' }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'block', width: '100%' }}>

        {/* COLA */}
        <div style={{ background: '#1e1e1e', border: '1px solid #333', borderRadius: '14px', padding: '20px' }}>

          {/* FILTROS */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '16px', alignItems: 'center' }}>

            {/* Status filter */}
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {STATUS_OPTIONS.map((s) => (
                <button key={s} onClick={() => navigate({ status: s, page: 1 })} style={{
                  background: currentStatus === s ? '#303134' : 'none',
                  border: 'none', color: currentStatus === s ? '#8ab4f8' : '#9aa0a6',
                  borderRadius: '6px', padding: '6px 10px', fontSize: '11px', fontWeight: 500, cursor: 'pointer',
                }}>
                  {s === 'all' ? 'Todos' : s === 'fetching_data' ? 'Buscando' : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>

            {/* Rubro filter */}
            <select
              value={currentRubro}
              onChange={(e) => navigate({ rubro: e.target.value, page: 1 })}
              style={{ background: '#2d2d2d', border: '1px solid #444', color: '#e8eaed', borderRadius: '8px', padding: '6px 10px', fontSize: '12px', outline: 'none', cursor: 'pointer' }}
            >
              <option value="all">Todos los rubros</option>
              {rubros.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>

          </div>

          {/* TABLE */}
          <div style={{ overflowX: 'auto', opacity: isPending ? 0.5 : 1, transition: 'opacity 0.2s' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ color: '#9aa0a6', borderBottom: '1px solid #333', textAlign: 'left' }}>
                  <th style={{ padding: '10px 14px', fontWeight: 500 }}>Negocio</th>
                  <th style={{ padding: '10px 14px', fontWeight: 500 }}>Rubro</th>
                  <th style={{ padding: '10px 14px', fontWeight: 500 }}>Estado</th>
                  <th style={{ padding: '10px 14px', fontWeight: 500 }}>Tiempo</th>
                  <th style={{ padding: '10px 14px', fontWeight: 500 }}>Fecha</th>
                  <th style={{ padding: '10px 14px', fontWeight: 500 }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((item) => (
                  <tr key={item.id} style={{
                    borderBottom: '1px solid #2a2a2a',
                    background: item.defectuoso ? 'rgba(234,67,53,0.04)' : 'none',
                  }}>
                    <td style={{ padding: '14px' }}>
                      <div style={{ fontWeight: 500, color: '#e8eaed', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {item.business_name}
                        {item.defectuoso && <span style={{ fontSize: '10px', color: '#ea4335', background: 'rgba(234,67,53,0.15)', borderRadius: '4px', padding: '2px 6px' }}>⚠️ defecto</span>}
                      </div>
                      {item.maps_url && (
                        <a href={item.maps_url} target="_blank" rel="noreferrer" style={{ fontSize: '11px', color: '#8ab4f8', textDecoration: 'none' }}>Ver Maps ↗</a>
                      )}
                    </td>
                    <td style={{ padding: '14px', color: '#9aa0a6', fontSize: '12px' }}>
                      {item.rubro || '—'}
                    </td>
                    <td style={{ padding: '14px' }}>{getStatusBadge(item.status)}</td>
                    <td style={{ padding: '14px', color: '#bdc1c6', fontSize: '12px' }}>
                      {item.execution_time_seconds ? `${item.execution_time_seconds}s` : '—'}
                    </td>
                    <td style={{ padding: '14px', color: '#9aa0a6', fontSize: '11px', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                      {formatDate(item.created_at)}
                    </td>
                    <td style={{ padding: '14px' }}>
                      {item.status === 'completed' && !item.defectuoso && (
                        <button onClick={() => setDefectoModal({ id: item.id, nota: '' })}
                          style={{ background: 'rgba(234,67,53,0.1)', border: '1px solid rgba(234,67,53,0.3)', color: '#ea4335', borderRadius: '6px', padding: '4px 8px', fontSize: '11px', cursor: 'pointer' }}>
                          ⚠️ Defecto
                        </button>
                      )}
                      {item.status === 'completed' && item.defectuoso && (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => handleQuitarDefecto(item.id)} style={{ background: '#2d2d2d', border: '1px solid #444', color: '#9aa0a6', borderRadius: '6px', padding: '4px 8px', fontSize: '11px', cursor: 'pointer' }}>Quitar</button>
                          <button onClick={() => handleReRender(item.id)} style={{ background: 'rgba(66,133,244,0.1)', border: '1px solid rgba(66,133,244,0.3)', color: '#8ab4f8', borderRadius: '6px', padding: '4px 8px', fontSize: '11px', cursor: 'pointer' }}>🔄</button>
                        </div>
                      )}
                      {item.status === 'failed' && (
                        <button onClick={() => handleReRender(item.id)}
                          style={{ background: 'rgba(66,133,244,0.1)', border: '1px solid rgba(66,133,244,0.3)', color: '#8ab4f8', borderRadius: '6px', padding: '4px 8px', fontSize: '11px', cursor: 'pointer' }}>
                          🔄 Re-render
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {queue.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#9aa0a6' }}>Sin resultados para este filtro.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINACIÓN */}
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
    </div>
  );
}
