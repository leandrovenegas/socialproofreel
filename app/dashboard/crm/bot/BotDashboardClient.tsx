'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { getBotStatus, getBotStatsAndHistory, toggleScheduler, requestBotRestart, OutreachHistoryItem } from './actions';

interface BotStatus {
  online: boolean;
  enabled: boolean;
  last_ping: string | null;
  next_slot: string;
  slots_remaining: number;
}

interface BotStats {
  sentToday: OutreachHistoryItem[];
  replies: OutreachHistoryItem[];
  pendingLeads: number;
}

interface BotDashboardClientProps {
  initialStatus: BotStatus;
  initialStats: BotStats;
}

export default function BotDashboardClient({ initialStatus, initialStats }: BotDashboardClientProps) {
  const [status, setStatus] = useState<BotStatus>(initialStatus);
  const [stats, setStats] = useState<BotStats>(initialStats);
  const [isPending, startTransition] = useTransition();
  const [refreshing, setRefreshing] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Function to fetch latest data from the server
  const refreshData = async () => {
    setRefreshing(true);
    setErrorMessage(null);
    try {
      const [newStatus, newStats] = await Promise.all([
        getBotStatus(),
        getBotStatsAndHistory(),
      ]);
      setStatus(newStatus);
      setStats(newStats);
    } catch (err: any) {
      console.error('Error refreshing bot dashboard:', err);
      setErrorMessage('No se pudieron recargar los datos del bot.');
    } finally {
      setRefreshing(false);
    }
  };

  // Set up auto-polling every 10 seconds to monitor status in real-time
  useEffect(() => {
    const interval = setInterval(() => {
      refreshData();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleScheduler = async () => {
    const nextVal = !status.enabled;
    // Optimistic update
    setStatus(prev => ({ ...prev, enabled: nextVal }));
    setErrorMessage(null);

    startTransition(async () => {
      try {
        await toggleScheduler(nextVal);
        await refreshData();
      } catch (err: any) {
        // Rollback on error
        setStatus(prev => ({ ...prev, enabled: !nextVal }));
        setErrorMessage(`Error al cambiar el scheduler: ${err.message || err}`);
      }
    });
  };

  const handleRestartBot = async () => {
    if (!confirm('¿Estás seguro de que deseas reiniciar el proceso del bot de WhatsApp? El proceso se detendrá y PM2 lo iniciará nuevamente en unos segundos.')) {
      return;
    }

    setRestarting(true);
    setErrorMessage(null);

    try {
      await requestBotRestart();
      // Wait 8 seconds to give PM2 and Baileys time to reload, then refresh status
      setTimeout(async () => {
        await refreshData();
        setRestarting(false);
      }, 8000);
    } catch (err: any) {
      setRestarting(false);
      setErrorMessage(`Error al solicitar el reinicio: ${err.message || err}`);
    }
  };

  // Helpers to format time
  const formatTime = (isoString: string | null) => {
    if (!isoString) return 'Nunca';
    const date = new Date(isoString);
    return date.toLocaleTimeString('es-CL', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDateTime = (isoString: string | null) => {
    if (!isoString) return 'Nunca';
    const date = new Date(isoString);
    return date.toLocaleString('es-CL', {
      hour12: false,
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div style={{ padding: '24px 40px', color: '#e8eaed', background: '#121212', minHeight: '100vh', fontFamily: "'Roboto', sans-serif" }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333', paddingBottom: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link
            href="/dashboard/crm"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#8ab4f8',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '13px',
              textDecoration: 'none',
              fontWeight: 500,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
          >
            ← Volver al CRM
          </Link>
          <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span>🤖 WhatsApp Bot Control Panel</span>
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {refreshing && <span style={{ fontSize: '13px', color: '#888' }}>Sincronizando...</span>}
          <button
            onClick={refreshData}
            disabled={refreshing}
            style={{
              background: refreshing ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: refreshing ? '#666' : '#e8eaed',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '13px',
              cursor: refreshing ? 'not-allowed' : 'pointer',
              fontWeight: 500,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            🔄 Recargar
          </button>
        </div>
      </div>

      {/* ERROR NOTICE */}
      {errorMessage && (
        <div style={{ background: 'rgba(217, 48, 37, 0.1)', border: '1px solid #d93025', color: '#f28b82', padding: '12px 16px', borderRadius: '8px', marginBottom: '24px', fontSize: '14px' }}>
          ⚠️ {errorMessage}
        </div>
      )}

      {/* STATS CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        
        {/* CARD 1: STATUS */}
        <div style={{ background: '#1e1e1e', border: '1px solid #333', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#9aa0a6', fontSize: '13px', fontWeight: 500 }}>Estado del Proceso</span>
            <span style={{ fontSize: '20px' }}>🔌</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', color: status.online ? '#81c995' : '#f28b82' }}>
            <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: status.online ? '#81c995' : '#f28b82' }}></span>
            {status.online ? 'Online' : 'Offline'}
          </div>
          <span style={{ color: '#9aa0a6', fontSize: '12px' }}>
            Ping: {formatTime(status.last_ping)}
          </span>
        </div>

        {/* CARD 2: SCHEDULER */}
        <div style={{ background: '#1e1e1e', border: '1px solid #333', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#9aa0a6', fontSize: '13px', fontWeight: 500 }}>Scheduler Automático</span>
            <span style={{ fontSize: '20px' }}>⏰</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 600, color: status.enabled ? '#8ab4f8' : '#e8eaed' }}>
            {status.enabled ? 'Activo' : 'Pausado'}
          </div>
          <span style={{ color: '#9aa0a6', fontSize: '12px' }}>
            Configuración en base de datos
          </span>
        </div>

        {/* CARD 3: NEXT SLOT */}
        <div style={{ background: '#1e1e1e', border: '1px solid #333', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#9aa0a6', fontSize: '13px', fontWeight: 500 }}>Próximo Envío (Slot)</span>
            <span style={{ fontSize: '20px' }}>📬</span>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 600, color: '#e8eaed', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {status.next_slot}
          </div>
          <span style={{ color: '#9aa0a6', fontSize: '12px' }}>
            Slots restantes hoy: <strong style={{ color: '#e8eaed' }}>{status.slots_remaining}</strong>
          </span>
        </div>

        {/* CARD 4: STATS */}
        <div style={{ background: '#1e1e1e', border: '1px solid #333', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#9aa0a6', fontSize: '13px', fontWeight: 500 }}>Envíos Hoy / Pendientes</span>
            <span style={{ fontSize: '20px' }}>📊</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 600, color: '#e8eaed' }}>
            {stats.sentToday.length} / 40
          </div>
          <span style={{ color: '#9aa0a6', fontSize: '12px' }}>
            Leads pendientes: <strong style={{ color: '#e8eaed' }}>{stats.pendingLeads}</strong>
          </span>
        </div>

      </div>

      {/* CONTROLS SECTION */}
      <div style={{ background: '#1e1e1e', border: '1px solid #333', borderRadius: '12px', padding: '24px', marginBottom: '32px' }}>
        <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 500, color: '#e8eaed' }}>Acciones y Controles del Bot</h2>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '40px', alignItems: 'center' }}>
          
          {/* TOGGLE SCHEDULER */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
              <button
                type="button"
                onClick={handleToggleScheduler}
                disabled={isPending}
                style={{
                  width: '56px',
                  height: '28px',
                  borderRadius: '15px',
                  background: status.enabled ? '#3b82f6' : '#444',
                  border: 'none',
                  position: 'relative',
                  cursor: isPending ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s',
                  padding: 0
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: '3px',
                    left: status.enabled ? '31px' : '4px',
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    background: '#fff',
                    transition: 'left 0.2s',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }}
                />
              </button>
              <div>
                <div style={{ fontWeight: 500, fontSize: '15px' }}>Habilitar Envíos Automáticos</div>
                <div style={{ fontSize: '12px', color: '#9aa0a6' }}>Permite enviar de acuerdo a la ventana de slots (09:00 - 19:00)</div>
              </div>
            </label>
          </div>

          {/* RESTART BOT BUTTON */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderLeft: '1px solid #333', paddingLeft: '40px' }}>
            <button
              onClick={handleRestartBot}
              disabled={restarting}
              style={{
                background: restarting ? 'rgba(217, 48, 37, 0.05)' : 'rgba(217, 48, 37, 0.1)',
                border: '1px solid rgba(217, 48, 37, 0.3)',
                color: restarting ? '#666' : '#f28b82',
                borderRadius: '8px',
                padding: '10px 20px',
                fontSize: '14px',
                cursor: restarting ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => { if(!restarting) e.currentTarget.style.background = 'rgba(217, 48, 37, 0.2)' }}
              onMouseLeave={(e) => { if(!restarting) e.currentTarget.style.background = 'rgba(217, 48, 37, 0.1)' }}
            >
              🔄 {restarting ? 'Reiniciando Bot...' : 'Reiniciar Proceso Bot'}
            </button>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 500 }}>Fuerza un reinicio de PM2</div>
              <div style={{ fontSize: '11px', color: '#9aa0a6' }}>Solicita la desconexión y reconexión de Baileys</div>
            </div>
          </div>

        </div>
      </div>

      {/* TABLES GRIDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '32px' }}>
        
        {/* LEFT COLUMN: SENT HISTORY */}
        <div style={{ background: '#1e1e1e', border: '1px solid #333', borderRadius: '12px', padding: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 500, color: '#e8eaed', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📬 Envíos Realizados Hoy</span>
            <span style={{ fontSize: '12px', background: 'rgba(255, 255, 255, 0.05)', color: '#888', padding: '2px 8px', borderRadius: '12px' }}>
              {stats.sentToday.length} envíos
            </span>
          </h3>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #333' }}>
                  <th style={{ padding: '12px 8px', color: '#9aa0a6', fontWeight: 500 }}>Lead / Empresa</th>
                  <th style={{ padding: '12px 8px', color: '#9aa0a6', fontWeight: 500 }}>Hora Envío</th>
                  <th style={{ padding: '12px 8px', color: '#9aa0a6', fontWeight: 500, textAlign: 'right' }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {stats.sentToday.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ padding: '24px 8px', color: '#666', textAlign: 'center' }}>
                      No se han realizado envíos hoy.
                    </td>
                  </tr>
                ) : (
                  stats.sentToday.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #222', transition: 'background 0.15s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.01)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '12px 8px', fontWeight: 500 }}>
                        <Link
                          href={`/dashboard/crm/${item.lead_id}`}
                          style={{ color: '#8ab4f8', textDecoration: 'none' }}
                        >
                          {item.raw_leads?.raw_data?.name || 'Lead Desconocido'}
                        </Link>
                      </td>
                      <td style={{ padding: '12px 8px', color: '#9aa0a6' }}>
                        {formatDateTime(item.created_at)}
                      </td>
                      <td style={{ padding: '12px 8px', color: '#81c995', fontWeight: 600, textAlign: 'right' }}>
                        ✓ Contactado
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT COLUMN: REPLIES RECEIVED */}
        <div style={{ background: '#1e1e1e', border: '1px solid #333', borderRadius: '12px', padding: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 500, color: '#e8eaed', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📥 Últimas Respuestas Recibidas</span>
            <span style={{ fontSize: '12px', background: 'rgba(255, 255, 255, 0.05)', color: '#888', padding: '2px 8px', borderRadius: '12px' }}>
              Últimas 30
            </span>
          </h3>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #333' }}>
                  <th style={{ padding: '12px 8px', color: '#9aa0a6', fontWeight: 500, width: '35%' }}>Lead / Empresa</th>
                  <th style={{ padding: '12px 8px', color: '#9aa0a6', fontWeight: 500, width: '45%' }}>Mensaje Recibido</th>
                  <th style={{ padding: '12px 8px', color: '#9aa0a6', fontWeight: 500, width: '20%', textAlign: 'right' }}>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {stats.replies.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ padding: '24px 8px', color: '#666', textAlign: 'center' }}>
                      No se han recibido respuestas aún.
                    </td>
                  </tr>
                ) : (
                  stats.replies.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #222', transition: 'background 0.15s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.01)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '12px 8px', fontWeight: 500, verticalAlign: 'top' }}>
                        <Link
                          href={`/dashboard/crm/${item.lead_id}`}
                          style={{ color: '#8ab4f8', textDecoration: 'none' }}
                        >
                          {item.raw_leads?.raw_data?.name || 'Lead Desconocido'}
                        </Link>
                      </td>
                      <td style={{ padding: '12px 8px', color: '#e8eaed', fontStyle: 'italic', wordBreak: 'break-word', whiteSpace: 'pre-wrap', verticalAlign: 'top' }}>
                        "{item.notas || '[mensaje vacío]'}"
                      </td>
                      <td style={{ padding: '12px 8px', color: '#9aa0a6', fontSize: '12.5px', textAlign: 'right', verticalAlign: 'top' }}>
                        {formatDateTime(item.created_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
}
