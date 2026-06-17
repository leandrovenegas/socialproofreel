'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

interface VideoQueueItem {
  id: string;
  status: string;
  defectuoso: boolean;
  defecto_nota?: string | null;
  created_at: string;
  updated_at?: string;
}

interface OutreachRecord {
  id: string;
  lead_id: string;
  canal: 'whatsapp' | 'email' | 'web' | 'rrss';
  estado: string;
  notas: string | null;
  created_at: string;
}

interface LeadDetailProps {
  lead: {
    id: string;
    raw_data: {
      name?: string;
      rating?: number;
      url?: string;
      phone?: string;
      reviews?: number;
    };
    rubro?: string;
    slug?: string;
    contact_data?: {
      phone?: string | null;
      phone_international?: string | null;
      website?: string | null;
      email?: string | null;
    } | null;
    created_at: string;
    video_queue?: VideoQueueItem[];
  };
  initialOutreach: OutreachRecord[];
}

const ESTADOS = ['pendiente', 'contactado', 'respondió', 'cotizando', 'cerrado', 'no interesado'];

function formatDateTime(dateStr: string) {
  const d = new Date(dateStr);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${String(d.getUTCFullYear()).slice(2)} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

export default function LeadDetail({ lead, initialOutreach }: LeadDetailProps) {
  const [outreachList, setOutreachList] = useState<OutreachRecord[]>(initialOutreach);
  const [isPending, startTransition] = useTransition();

  // Find the primary outreach record (usually the latest one, or first WhatsApp one) to update notes and states
  const mainRecord = outreachList[outreachList.length - 1] || null;

  const [notes, setNotes] = useState<string>(mainRecord?.notas || '');
  const [savingNotes, setSavingNotes] = useState<boolean>(false);
  const [currentEstado, setCurrentEstado] = useState<string>(mainRecord?.estado || 'pendiente');

  // Compute stages for pipeline visualization
  const jobs = lead.video_queue || [];
  const completedJob = jobs.find((j) => j.status === 'completed' && !j.defectuoso);
  const waRecord = outreachList.find((o) => o.canal === 'whatsapp' && o.estado === 'contactado');
  const webRecord = outreachList.find((o) => o.canal === 'web');
  const emailRecord = outreachList.find((o) => o.canal === 'email');
  const clickRecord = outreachList.find((o) => o.notas && o.notas.toLowerCase().includes('clic'));
  const closedRecord = outreachList.find((o) => o.estado === 'cerrado');

  const stages = [
    { label: 'Video listo', completed: !!completedJob, date: completedJob?.updated_at || completedJob?.created_at || null },
    { label: 'WhatsApp enviado', completed: !!waRecord, date: waRecord?.created_at || null },
    { label: 'Landing abierta', completed: !!webRecord, date: webRecord?.created_at || null },
    { label: 'Email dejado', completed: !!emailRecord, date: emailRecord?.created_at || null },
    { label: 'Clic WhatsApp', completed: !!clickRecord, date: clickRecord?.created_at || null },
    { label: 'Cerrado', completed: !!closedRecord, date: closedRecord?.created_at || null },
  ];

  // Highest stage for WhatsApp message logic
  let highestStage = 0;
  for (let i = 0; i < stages.length; i++) {
    if (stages[i].completed) {
      highestStage = i + 1;
    }
  }

  const name = lead.raw_data.name || 'Sin nombre';
  const rating = lead.raw_data.rating || 0;
  const reviews = lead.raw_data.reviews || 0;
  const phone = lead.contact_data?.phone_international || lead.contact_data?.phone || lead.raw_data?.phone || null;
  const website = lead.contact_data?.website || null;
  const email = lead.contact_data?.email || null;

  const getWhatsAppMessage = () => {
    if (highestStage <= 2) {
      return `Hola! Vi que tienes reseñas en Google y te generé un video gratis con ellas. ¿Lo quieres ver?`;
    } else if (highestStage <= 4) {
      return `Hola! ¿Pudiste ver el video? Lo hice especialmente para ${name}. Con esto puedes conseguir más clientes mostrando tus reseñas en redes.`;
    } else {
      return `Hola! Para que puedas publicarlo y empezar a usarlo, el sistema completo tiene un valor de $X. ¿Te interesa?`;
    }
  };

  const waMessage = getWhatsAppMessage();
  const waUrl = phone
    ? `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(waMessage)}`
    : null;

  const handleWhatsAppEnviado = async () => {
    // 1. Insert an outreach record indicating WhatsApp is sent
    const { data, error } = await supabase
      .from('outreach')
      .insert({
        lead_id: lead.id,
        canal: 'whatsapp',
        estado: 'contactado',
        notas: notes || null,
      })
      .select()
      .single();

    if (!error && data) {
      setOutreachList((prev) => [...prev, data as OutreachRecord]);
      setCurrentEstado('contactado');
    } else if (error) {
      alert('Error registrando WhatsApp: ' + error.message);
    }
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      if (mainRecord) {
        // Update existing record notes
        const { error } = await supabase
          .from('outreach')
          .update({ notas: notes || null })
          .eq('id', mainRecord.id);

        if (error) throw error;
        setOutreachList((prev) =>
          prev.map((r) => (r.id === mainRecord.id ? { ...r, notas: notes || null } : r))
        );
      } else {
        // Create new outreach record for notes
        const { data, error } = await supabase
          .from('outreach')
          .insert({
            lead_id: lead.id,
            canal: 'whatsapp',
            estado: currentEstado,
            notas: notes || null,
          })
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setOutreachList((prev) => [...prev, data as OutreachRecord]);
        }
      }
      alert('Notas guardadas exitosamente.');
    } catch (err) {
      alert('Error guardando notas: ' + (err as Error).message);
    } finally {
      setSavingNotes(false);
    }
  };

  const handleEstadoChange = async (estado: string) => {
    setCurrentEstado(estado);
    if (mainRecord) {
      // Update existing record state
      const { error } = await supabase
        .from('outreach')
        .update({ estado })
        .eq('id', mainRecord.id);

      if (!error) {
        setOutreachList((prev) =>
          prev.map((r) => (r.id === mainRecord.id ? { ...r, estado } : r))
        );
      }
    } else {
      // Insert new outreach record
      const { data, error } = await supabase
        .from('outreach')
        .insert({
          lead_id: lead.id,
          canal: 'whatsapp',
          estado,
          notas: notes || null,
        })
        .select()
        .single();

      if (!error && data) {
        setOutreachList((prev) => [...prev, data as OutreachRecord]);
      }
    }
  };

  return (
    <div style={{ padding: '24px 40px', color: '#e8eaed', background: '#121212', minHeight: '100vh', fontFamily: "'Roboto', sans-serif" }}>
      
      {/* NAVIGATION */}
      <div style={{ marginBottom: '24px' }}>
        <Link href="/dashboard/crm" style={{ color: '#8ab4f8', textDecoration: 'none', fontSize: '13px', fontWeight: 500 }}>
          ← Volver al CRM de Leads
        </Link>
      </div>

      {/* LEAD PROFILE HEADER */}
      <div style={{ background: '#1e1e1e', border: '1px solid #333', borderRadius: '14px', padding: '24px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 600 }}>{name}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
            <span style={{ fontSize: '12px', background: 'rgba(255,255,255,0.06)', padding: '3px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)' }}>
              {lead.rubro || 'Sin Rubro'}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ color: '#f4b400', fontSize: '16px' }}>★</span>
              <strong style={{ fontSize: '15px' }}>{rating}</strong>
              <span style={{ color: '#9aa0a6', fontSize: '12px' }}>({reviews} reseñas en Google)</span>
            </div>
          </div>
        </div>

        {/* Action button cluster */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {lead.slug && (
            <a
              href={`https://leandrovenegas.cl/video/${lead.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ background: '#4285f4', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              🌐 Ver Landing Page ↗
            </a>
          )}
          {lead.raw_data.url && (
            <a
              href={lead.raw_data.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ background: '#2d2d2d', border: '1px solid #333', color: '#e8eaed', padding: '10px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, textDecoration: 'none' }}
            >
              🗺️ Google Maps ↗
            </a>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '24px', alignItems: 'start' }}>

        {/* LEFT COLUMN: Pipeline & Contact Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* PIPELINE VIEW */}
          <div style={{ background: '#1e1e1e', border: '1px solid #333', borderRadius: '14px', padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 500, borderBottom: '1px solid #333', paddingBottom: '10px' }}>
              Progreso del Prospecto (Pipeline)
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {stages.map((stage, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: stage.completed ? 'rgba(52,168,83,0.15)' : 'rgba(255,255,255,0.03)',
                      border: `1.5px solid ${stage.completed ? '#34a853' : 'rgba(255,255,255,0.15)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      color: stage.completed ? '#34a853' : '#9aa0a6',
                      fontWeight: 700,
                    }}>
                      {stage.completed ? '✓' : idx + 1}
                    </div>
                    {idx < stages.length - 1 && (
                      <div style={{ width: '2px', height: '24px', background: stages[idx + 1].completed ? '#34a853' : 'rgba(255,255,255,0.1)', marginTop: '4px' }} />
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: stage.completed ? '#e8eaed' : '#9aa0a6' }}>
                      {stage.label}
                    </div>
                    {stage.completed && stage.date && (
                      <div style={{ fontSize: '11px', color: '#34a853', marginTop: '2px' }}>
                        Completado el {formatDateTime(stage.date)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CONTACT INFO */}
          <div style={{ background: '#1e1e1e', border: '1px solid #333', borderRadius: '14px', padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 500, borderBottom: '1px solid #333', paddingBottom: '10px' }}>
              Datos de Contacto
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              <div>
                <span style={{ color: '#9aa0a6', display: 'block', marginBottom: '2px' }}>Teléfono</span>
                <strong>{phone || <span style={{ color: '#666', fontStyle: 'italic' }}>Sin teléfono registrado</span>}</strong>
              </div>
              <div>
                <span style={{ color: '#9aa0a6', display: 'block', marginBottom: '2px' }}>Sitio Web</span>
                {website ? (
                  <a href={website} target="_blank" rel="noopener noreferrer" style={{ color: '#8ab4f8', textDecoration: 'none', fontWeight: 500 }}>
                    {website} ↗
                  </a>
                ) : (
                  <span style={{ color: '#666', fontStyle: 'italic' }}>Sin sitio web</span>
                )}
              </div>
              <div>
                <span style={{ color: '#9aa0a6', display: 'block', marginBottom: '2px' }}>Email</span>
                <strong>{email || <span style={{ color: '#666', fontStyle: 'italic' }}>Sin email registrado</span>}</strong>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Interactive Panel & Logs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* INTERACTIVE CONTROLS */}
          <div style={{ background: '#1e1e1e', border: '1px solid #333', borderRadius: '14px', padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 500, borderBottom: '1px solid #333', paddingBottom: '10px' }}>
              Gestión Comercial
            </h3>

            {/* STATE SELECTOR */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#9aa0a6', marginBottom: '6px' }}>Estado Comercial</label>
              <select
                value={currentEstado}
                onChange={(e) => handleEstadoChange(e.target.value)}
                style={{ width: '100%', background: '#2d2d2d', border: '1px solid #444', color: '#e8eaed', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', outline: 'none', cursor: 'pointer' }}
              >
                {ESTADOS.map((est) => (
                  <option key={est} value={est}>
                    {est.charAt(0).toUpperCase() + est.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* NOTES AREA */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#9aa0a6', marginBottom: '6px' }}>Notas de Seguimiento</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Escribe observaciones de contacto, acuerdos, respuestas de Whatsapp..."
                rows={4}
                style={{ width: '100%', background: '#2d2d2d', border: '1px solid #444', borderRadius: '8px', color: '#e8eaed', padding: '10px 12px', fontSize: '13px', resize: 'vertical', outline: 'none' }}
              />
              <button
                onClick={handleSaveNotes}
                disabled={savingNotes}
                style={{ marginTop: '8px', background: '#333', border: '1.5px solid #444', color: '#e8eaed', borderRadius: '6px', padding: '8px 16px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {savingNotes ? 'Guardando...' : '💾 Guardar Notas'}
              </button>
            </div>

            {/* QUICK OUTREACH ACTIONS */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#9aa0a6', marginBottom: '6px' }}>Acciones de Contacto Rápido</label>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {waUrl ? (
                  <>
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={handleWhatsAppEnviado}
                      style={{
                        background: '#34a853',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '10px 18px',
                        fontSize: '13px',
                        fontWeight: 600,
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      💬 Enviar WhatsApp ↗
                    </a>
                  </>
                ) : (
                  <span style={{ fontSize: '12px', color: '#ea4335', fontStyle: 'italic' }}>
                    Registra un número de teléfono en la ficha del lead para habilitar el WhatsApp pre-cargado.
                  </span>
                )}
              </div>

              {/* WHATSAPP MESSAGE PREVIEW */}
              {phone && (
                <div style={{ marginTop: '14px', background: '#2d2d2d', border: '1px solid #3c3c3c', borderRadius: '8px', padding: '12px' }}>
                  <span style={{ display: 'block', fontSize: '11px', color: '#9aa0a6', marginBottom: '4px', fontWeight: 500 }}>
                    Mensaje pre-cargado (Etapa {highestStage || 'Inicial'}):
                  </span>
                  <p style={{ fontSize: '12px', color: '#e8eaed', margin: 0, fontStyle: 'italic' }}>
                    &ldquo;{waMessage}&rdquo;
                  </p>
                </div>
              )}
            </div>

          </div>

          {/* HISTORIAL OUTREACH */}
          <div style={{ background: '#1e1e1e', border: '1px solid #333', borderRadius: '14px', padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 500, borderBottom: '1px solid #333', paddingBottom: '10px' }}>
              Historial de Interacciones (Outreach Logs)
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {outreachList.map((rec, i) => (
                <div key={rec.id} style={{ background: '#2d2d2d', border: '1px solid #3c3c3c', borderRadius: '8px', padding: '12px', fontSize: '12.5px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 600, color: rec.canal === 'whatsapp' ? '#4caf50' : '#8ab4f8' }}>
                      {rec.canal === 'whatsapp' ? '💬 WhatsApp' : rec.canal === 'email' ? '📧 Email' : '🌐 Web'}
                    </span>
                    <span style={{ fontSize: '10.5px', color: '#9aa0a6', fontFamily: 'monospace' }}>
                      {formatDateTime(rec.created_at)}
                    </span>
                  </div>
                  <div>
                    Estado: <span style={{ color: '#f4b400', fontWeight: 600 }}>{rec.estado}</span>
                  </div>
                  {rec.notas && (
                    <div style={{ marginTop: '6px', color: '#bdc1c6', fontStyle: 'italic', borderLeft: '2px solid #555', paddingLeft: '8px' }}>
                      {rec.notas}
                    </div>
                  )}
                </div>
              ))}
              {outreachList.length === 0 && (
                <div style={{ padding: '20px', textAlign: 'center', color: '#666', border: '1px dashed #333', borderRadius: '8px', fontSize: '12px' }}>
                  Sin interacciones registradas. ¡Envía tu primera propuesta!
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
