'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

interface QueueItem {
  id: string;
  business_name: string;
  maps_url?: string;
  status: string;
  execution_time_seconds?: number;
  local_video_path?: string;
  error_message?: string;
  created_at: string;
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
}

interface QueueClientProps {
  initialQueue: QueueItem[];
  initialLeads: RawLeadItem[];
}

export default function QueueClient({ initialQueue, initialLeads }: QueueClientProps) {
  const [queue, setQueue] = useState<QueueItem[]>(initialQueue);
  const [leads, setLeads] = useState<RawLeadItem[]>(initialLeads);
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);
  const [showDockerHelp, setShowDockerHelp] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Fetch updated queue status periodically
  useEffect(() => {
    const fetchQueueAndLeads = async () => {
      try {
        const { data: queueData } = await supabase
          .from('video_queue')
          .select('*')
          .order('created_at', { ascending: false });

        if (queueData) {
          setQueue(queueData);
        }

        const { data: leadsData } = await supabase
          .from('raw_leads')
          .select('id, raw_data, processed')
          .eq('processed', false)
          .limit(10);

        if (leadsData) {
          setLeads(leadsData);
        }
      } catch (err) {
        console.error('Error fetching queue status:', err);
      }
    };

    // Poll every 3 seconds for fast updates
    const interval = setInterval(fetchQueueAndLeads, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleSendToQueue = async (leadId: string, name: string, mapsUrl?: string) => {
    setIsSubmitting(leadId);
    try {
      // 1. Insert into video_queue
      const { data, error } = await supabase
        .from('video_queue')
        .insert({
          business_name: name,
          maps_url: mapsUrl || null,
          status: 'pending',
        })
        .select();

      if (error) throw error;

      // 2. Optionally update local state immediately
      if (data && data[0]) {
        setQueue((prev) => [data[0] as QueueItem, ...prev]);
      }

      // 3. Mark the raw lead as processed locally so it drops from the test list
      setLeads((prev) => prev.filter((l) => l.id !== leadId));
    } catch (err) {
      console.error('Error sending lead to queue:', err);
      alert('Error al enviar a la cola: ' + (err as Error).message);
    } finally {
      setIsSubmitting(null);
    }
  };

  const getStatusBadge = (status: string) => {
    let bg = '#555';
    let color = '#fff';
    let text = status;

    switch (status) {
      case 'pending':
        bg = 'rgba(244, 180, 0, 0.15)';
        color = '#f4b400';
        text = '⏳ Pendiente';
        break;
      case 'fetching_data':
        bg = 'rgba(66, 133, 244, 0.15)';
        color = '#4285f4';
        text = '🔍 Buscando Info';
        break;
      case 'rendering':
        bg = 'rgba(142, 36, 170, 0.15)';
        color = '#c2185b';
        text = '🎬 Renderizando';
        break;
      case 'completed':
        bg = 'rgba(52, 168, 83, 0.15)';
        color = '#34a853';
        text = '✅ Completado';
        break;
      case 'failed':
        bg = 'rgba(234, 67, 53, 0.15)';
        color = '#ea4335';
        text = '❌ Fallido';
        break;
    }

    return (
      <span style={{
        padding: '6px 12px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: 600,
        backgroundColor: bg,
        color: color,
        border: `1px solid ${color}33`,
        display: 'inline-flex',
        alignItems: 'center',
      }}>
        {text}
      </span>
    );
  };

  const filteredQueue = filterStatus === 'all' 
    ? queue 
    : queue.filter(item => item.status === filterStatus);

  return (
    <div style={{
      padding: '24px 40px',
      color: '#e8eaed',
      background: '#121212',
      minHeight: '100vh',
      fontFamily: "'Roboto', sans-serif",
    }}>
      {/* HEADER SECTION */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #333',
        paddingBottom: '20px',
        marginBottom: '30px',
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 500, color: '#f5f5f5' }}>Cola de Renderizado de Video</h1>
          <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#9aa0a6' }}>Monitorea el procesamiento de tus videos en tiempo real</p>
        </div>
        <button
          onClick={() => setShowDockerHelp(!showDockerHelp)}
          style={{
            background: '#2d2d2d',
            border: '1px solid #444',
            color: '#8ab4f8',
            borderRadius: '8px',
            padding: '10px 16px',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {showDockerHelp ? ' ocultar Instrucciones Worker' : '🛠️ Ver Estado / Iniciar Worker'}
        </button>
      </div>

      {/* DOCKER WORKER HELP */}
      {showDockerHelp && (
        <div style={{
          background: '#1e1e1e',
          border: '1px solid #333',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '30px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
        }}>
          <h3 style={{ margin: '0 0 10px', fontSize: '15px', color: '#8ab4f8' }}>Configurar y ejecutar el Worker de renderizado</h3>
          <p style={{ margin: '0 0 15px', fontSize: '13px', color: '#bdc1c6', lineHeight: 1.5 }}>
            El frontend agrega tareas con estado <strong>Pendiente</strong> a Supabase. Para que se procesen, el daemon en Python debe estar ejecutándose en tu servidor Ubuntu.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <span style={{ fontSize: '12px', color: '#9aa0a6', fontWeight: 'bold' }}>1. Conéctate a tu servidor via SSH:</span>
              <pre style={{
                background: '#2d2d2d', padding: '10px 14px', borderRadius: '6px', fontSize: '12px',
                fontFamily: 'monospace', color: '#f1f3f4', overflowX: 'auto', margin: '4px 0 10px'
              }}>
                ssh vicente@192.168.1.18
              </pre>
            </div>
            <div>
              <span style={{ fontSize: '12px', color: '#9aa0a6', fontWeight: 'bold' }}>2. Inicia el Daemon del Worker (Docker):</span>
              <pre style={{
                background: '#2d2d2d', padding: '10px 14px', borderRadius: '6px', fontSize: '12px',
                fontFamily: 'monospace', color: '#f1f3f4', overflowX: 'auto', margin: '4px 0 10px'
              }}>
                cd ~/proyects/SocialProofREEL-Worker && docker run -d --name socialproof-daemon -v "$(pwd):/app" --env-file .env socialproof-worker python sync_agent.py
              </pre>
            </div>
            <div>
              <span style={{ fontSize: '12px', color: '#9aa0a6', fontWeight: 'bold' }}>3. Ver los logs de render en tiempo real:</span>
              <pre style={{
                background: '#2d2d2d', padding: '10px 14px', borderRadius: '6px', fontSize: '12px',
                fontFamily: 'monospace', color: '#f1f3f4', overflowX: 'auto', margin: '4px 0 0'
              }}>
                docker logs -f socialproof-daemon
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTAINER */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '30px', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: QUEUE LIST */}
        <div style={{
          background: '#1e1e1e',
          border: '1px solid #333',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
          }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 500, color: '#f5f5f5' }}>Tareas en la Cola</h2>
            <div style={{ display: 'flex', gap: '6px' }}>
              {['all', 'pending', 'fetching_data', 'rendering', 'completed', 'failed'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  style={{
                    background: filterStatus === status ? '#303134' : 'none',
                    border: 'none',
                    color: filterStatus === status ? '#8ab4f8' : '#9aa0a6',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {status === 'all' ? 'Todos' : status}
                </button>
              ))}
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ color: '#9aa0a6', borderBottom: '1px solid #333', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 500 }}>ID Tarea</th>
                  <th style={{ padding: '12px 16px', fontWeight: 500 }}>Negocio</th>
                  <th style={{ padding: '12px 16px', fontWeight: 500 }}>Estado</th>
                  <th style={{ padding: '12px 16px', fontWeight: 500 }}>Ejecución</th>
                  <th style={{ padding: '12px 16px', fontWeight: 500 }}>Acciones / Detalles</th>
                </tr>
              </thead>
              <tbody>
                {filteredQueue.map((item) => (
                  <tr key={item.id} style={{
                    borderBottom: '1px solid #2a2a2a',
                    background: item.status === 'completed' ? 'rgba(52, 168, 83, 0.02)' : 
                               item.status === 'failed' ? 'rgba(234, 67, 53, 0.02)' : 'none',
                    transition: 'background 0.2s',
                  }}>
                    {/* ID */}
                    <td style={{ padding: '16px', color: '#9aa0a6', fontFamily: 'monospace', fontSize: '11px' }}>
                      {item.id.slice(0, 8)}…
                    </td>
                    
                    {/* Business Name */}
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontWeight: 500, color: '#e8eaed' }}>{item.business_name}</div>
                      {item.maps_url && (
                        <a href={item.maps_url} target="_blank" rel="noreferrer" style={{ fontSize: '11px', color: '#8ab4f8', textDecoration: 'none', display: 'block', marginTop: '2px' }}>
                          Ver en Google Maps ↗
                        </a>
                      )}
                    </td>

                    {/* Status */}
                    <td style={{ padding: '16px' }}>
                      {getStatusBadge(item.status)}
                    </td>

                    {/* Execution details */}
                    <td style={{ padding: '16px', color: '#bdc1c6' }}>
                      {item.execution_time_seconds 
                        ? `${item.execution_time_seconds}s` 
                        : item.status === 'completed' || item.status === 'failed' ? '-' : 'En proceso…'}
                    </td>

                    {/* Actions / Local Path */}
                    <td style={{ padding: '16px' }}>
                      {item.status === 'completed' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontSize: '11px', color: '#34a853', fontWeight: 500 }}>✓ Listo</span>
                          <span style={{ fontSize: '10px', color: '#9aa0a6', fontFamily: 'monospace', wordBreak: 'break-all' }} title={item.local_video_path}>
                            {item.local_video_path?.split('\\').pop() || item.local_video_path?.split('/').pop() || 'video.mp4'}
                          </span>
                        </div>
                      )}

                      {item.status === 'failed' && item.error_message && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontSize: '11px', color: '#ea4335', fontWeight: 500 }}>Fallo de ejecución</span>
                          <details style={{ fontSize: '11px', color: '#9aa0a6' }}>
                            <summary style={{ cursor: 'pointer', color: '#8ab4f8' }}>Ver log de error</summary>
                            <pre style={{
                              background: '#3a1b1b', border: '1px solid #6a2d2d', borderRadius: '4px',
                              padding: '8px', marginTop: '4px', color: '#f28b82', whiteSpace: 'pre-wrap',
                              fontFamily: 'monospace', maxHeight: '150px', overflowY: 'auto'
                            }}>
                              {item.error_message}
                            </pre>
                          </details>
                        </div>
                      )}

                      {['pending', 'fetching_data', 'rendering'].includes(item.status) && (
                        <span style={{ fontSize: '12px', color: '#9aa0a6', fontStyle: 'italic' }}>
                          Procesando por worker…
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredQueue.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#9aa0a6' }}>
                      No hay tareas en esta categoría.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT COLUMN: RAW LEADS (Muestras de prueba) */}
        <div style={{
          background: '#1e1e1e',
          border: '1px solid #333',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}>
          <h2 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 500, color: '#f5f5f5' }}>Leads Disponibles</h2>
          <p style={{ margin: '0 0 20px', fontSize: '12px', color: '#9aa0a6', lineHeight: 1.4 }}>
            Leads importados de la calle. Haz clic para mandarlos a renderizar con la configuración guardada del Editor.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {leads.map((lead) => {
              const name = lead.raw_data.name || 'Sin nombre';
              const rating = lead.raw_data.rating || 0;
              const mapsUrl = lead.raw_data.url || lead.raw_data.link || lead.raw_data.maps_url;
              const isProcessingThis = isSubmitting === lead.id;

              return (
                <div key={lead.id} style={{
                  background: '#2d2d2d',
                  border: '1px solid #3c3c3c',
                  borderRadius: '10px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}>
                  <div>
                    <strong style={{ display: 'block', fontSize: '13px', color: '#e8eaed' }}>{name}</strong>
                    <span style={{ fontSize: '12px', color: '#f4b400' }}>{'★'.repeat(Math.round(rating)) || 'Sin Rating'}</span>
                  </div>

                  <button
                    disabled={isProcessingThis || isSubmitting !== null}
                    onClick={() => handleSendToQueue(lead.id, name, mapsUrl)}
                    style={{
                      width: '100%',
                      background: isProcessingThis ? '#444' : '#4285f4',
                      color: isProcessingThis ? '#888' : 'white',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: isProcessingThis || isSubmitting !== null ? 'not-allowed' : 'pointer',
                      transition: 'all 0.15s',
                      textAlign: 'center',
                    }}
                  >
                    {isProcessingThis ? 'Enviando…' : 'Mandar a Render ➔'}
                  </button>
                </div>
              );
            })}

            {leads.length === 0 && (
              <div style={{
                padding: '24px',
                textAlign: 'center',
                color: '#666',
                border: '1px dashed #333',
                borderRadius: '8px'
              }}>
                No hay leads sin procesar.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
