'use client';

import React, { useState, useTransition, useEffect } from 'react';
import Link from 'next/link';
import { saveQueue, saveGeneralTemplates } from './actions';

interface LeadItem {
  id: string;
  name: string;
  phone: string;
  score?: number;
  hasOverride?: boolean;
  rubro?: string;
}

interface QueueClientProps {
  initialAvailable: LeadItem[];
  initialQueue: LeadItem[];
  initialGeneralTemplate: string;
  initialGeneralTemplate2: string;
}

export default function QueueClient({ initialAvailable, initialQueue, initialGeneralTemplate, initialGeneralTemplate2 }: QueueClientProps) {
  const [available, setAvailable] = useState<LeadItem[]>(initialAvailable);
  const [queue, setQueue] = useState<LeadItem[]>(initialQueue);
  const [generalTemplate, setGeneralTemplate] = useState(initialGeneralTemplate);
  const [generalTemplate2, setGeneralTemplate2] = useState(initialGeneralTemplate2);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isPending, startTransition] = useTransition();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ── Filters State ──────────────────────────────────────────────────
  const [filterRubro, setFilterRubro] = useState('all');
  const [filterCountry, setFilterCountry] = useState('all');
  const [filterPhoneType, setFilterPhoneType] = useState('all');
  const [filterScoreRange, setFilterScoreRange] = useState('all');

  // ── Pagination State ───────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  // Extract unique rubros present in the available leads list
  const rubrosOptions = Array.from(new Set(available.map(x => x.rubro).filter(Boolean))).sort() as string[];

  // Heuristic for country detection by international prefix
  const getCountry = (phoneStr: string) => {
    const clean = (phoneStr || '').replace(/\D/g, '');
    if (clean.startsWith('56')) return 'chile';
    if (clean.startsWith('34')) return 'espana';
    if (clean.startsWith('54')) return 'argentina';
    if (clean.startsWith('52')) return 'mexico';
    if (clean.startsWith('57')) return 'colombia';
    if (clean.startsWith('1')) return 'usa_canada';
    if (!clean) return 'none';
    return 'other';
  };

  // Heuristic for mobile vs landline detection by prefix
  const getPhoneType = (phoneStr: string) => {
    const clean = (phoneStr || '').replace(/\D/g, '');
    if (!clean) return 'none';
    
    // Chile
    if (clean.startsWith('56')) {
      const local = clean.slice(2);
      return local.startsWith('9') ? 'mobile' : 'landline';
    }
    // Spain
    if (clean.startsWith('34')) {
      const local = clean.slice(2);
      return (local.startsWith('6') || local.startsWith('7')) ? 'mobile' : 'landline';
    }
    // General prefix checks for raw numbers (mobile numbers commonly start with 9, 8, 7, 6)
    const firstDigit = clean.startsWith('+') ? clean.charAt(1) : clean.charAt(0);
    if (['9', '8', '7', '6'].includes(firstDigit)) {
      return 'mobile';
    }
    return 'landline';
  };

  // Reset pagination to page 1 whenever any filter parameter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterRubro, filterCountry, filterPhoneType, filterScoreRange]);

  // Apply filters in sequence
  const filteredAvailable = available.filter(lead => {
    // 1. Search Query (Name match)
    if (searchQuery && !lead.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    // 2. Rubro (Industry)
    if (filterRubro !== 'all' && lead.rubro !== filterRubro) {
      return false;
    }
    // 3. Country prefix
    if (filterCountry !== 'all') {
      const country = getCountry(lead.phone);
      if (filterCountry === 'none' && country !== 'none') return false;
      if (filterCountry !== 'none' && country !== filterCountry) return false;
    }
    // 4. Phone Type
    if (filterPhoneType !== 'all') {
      const type = getPhoneType(lead.phone);
      if (filterPhoneType === 'none' && type !== 'none') return false;
      if (filterPhoneType !== 'none' && type !== filterPhoneType) return false;
    }
    // 5. Score range
    if (filterScoreRange !== 'all') {
      const score = lead.score || 50;
      if (filterScoreRange === 'high' && score < 80) return false;
      if (filterScoreRange === 'medium' && (score < 50 || score >= 80)) return false;
      if (filterScoreRange === 'low' && score >= 50) return false;
    }
    return true;
  });

  // Calculate paginated results
  const totalPages = Math.ceil(filteredAvailable.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedAvailable = filteredAvailable.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // ── Save General Templates ─────────────────────────────────────────
  const handleSaveTemplate = async () => {
    setSavingTemplate(true);
    setMessage(null);
    try {
      await saveGeneralTemplates(generalTemplate, generalTemplate2);
      setMessage({ type: 'success', text: '¡Ambas plantillas generales de la cola guardadas correctamente!' });
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      console.error('Error saving general templates:', err);
      setMessage({ type: 'error', text: `Error al guardar las plantillas: ${err.message || err}` });
    } finally {
      setSavingTemplate(false);
    }
  };

  // ── Drag & Drop between lists ──────────────────────────────────────
  const handleDragStartFromAvailable = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDropToQueue = (e: React.DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    if (!id) return;

    // Check if the item is in available list (prevent duplicate drop of queue items)
    const item = available.find(x => x.id === id);
    if (!item) return;

    // Move to queue
    setQueue(prev => [...prev, item]);
    setAvailable(prev => prev.filter(x => x.id !== id));
    // Clear from selection if checkmarked
    setSelectedIds(prev => {
      const copy = new Set(prev);
      copy.delete(id);
      return copy;
    });
  };

  // ── Drag & Drop Sorting inside Queue list ───────────────────────────
  const handleQueueDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleQueueDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newQueue = [...queue];
    const [draggedItem] = newQueue.splice(draggedIndex, 1);
    newQueue.splice(index, 0, draggedItem);
    setQueue(newQueue);
    setDraggedIndex(index);
  };

  const handleQueueDragEnd = () => {
    setDraggedIndex(null);
  };

  // ── Bulk Actions ───────────────────────────────────────────────────
  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const copy = new Set(prev);
      if (copy.has(id)) {
        copy.delete(id);
      } else {
        copy.add(id);
      }
      return copy;
    });
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(paginatedAvailable.map(x => x.id)));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleAddSelected = () => {
    if (selectedIds.size === 0) return;

    const itemsToAdd = available.filter(x => selectedIds.has(x.id));
    setQueue(prev => [...prev, ...itemsToAdd]);
    setAvailable(prev => prev.filter(x => !selectedIds.has(x.id)));
    setSelectedIds(new Set());
  };

  // ── Single Item Actions ────────────────────────────────────────────
  const handleRemoveFromQueue = (id: string) => {
    const item = queue.find(x => x.id === id);
    if (!item) return;

    // Move back to available list
    setAvailable(prev => [...prev, item].sort((a, b) => (b.score || 50) - (a.score || 50)));
    setQueue(prev => prev.filter(x => x.id !== id));
  };

  const handleClearQueue = () => {
    if (queue.length === 0) return;
    if (!confirm('¿Estás seguro de que deseas vaciar toda la cola de envíos?')) return;

    setAvailable(prev => [...prev, ...queue].sort((a, b) => (b.score || 50) - (a.score || 50)));
    setQueue([]);
  };

  // ── Persistence ────────────────────────────────────────────────────
  const handleSaveQueue = () => {
    setMessage(null);
    const leadIds = queue.map(x => x.id);

    startTransition(async () => {
      try {
        await saveQueue(leadIds);
        setMessage({ type: 'success', text: '¡Cola de envíos guardada correctamente en Supabase!' });
        setTimeout(() => setMessage(null), 5000);
      } catch (err: any) {
        console.error('Error saving queue:', err);
        setMessage({ type: 'error', text: `Error al guardar la cola: ${err.message || err}` });
      }
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
          <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 500 }}>
            📋 Cola de Envío WhatsApp
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {queue.length > 0 && (
            <button
              onClick={handleClearQueue}
              style={{
                background: 'rgba(217, 48, 37, 0.1)',
                border: '1px solid rgba(217, 48, 37, 0.3)',
                color: '#f28b82',
                borderRadius: '8px',
                padding: '10px 18px',
                fontSize: '13.5px',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              🗑️ Vaciar Cola
            </button>
          )}
          <button
            onClick={handleSaveQueue}
            disabled={isPending}
            style={{
              background: isPending ? '#444' : '#1a73e8',
              border: 'none',
              color: '#fff',
              borderRadius: '8px',
              padding: '10px 24px',
              fontSize: '13.5px',
              cursor: isPending ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              boxShadow: '0 2px 6px rgba(26, 115, 232, 0.15)',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => { if (!isPending) e.currentTarget.style.background = '#1557b0'; }}
            onMouseLeave={(e) => { if (!isPending) e.currentTarget.style.background = '#1a73e8'; }}
          >
            {isPending ? 'Guardando...' : '💾 Guardar Orden de la Cola'}
          </button>
        </div>
      </div>

      {/* FEEDBACK MESSAGES */}
      {message && (
        <div style={{
          background: message.type === 'success' ? 'rgba(129, 201, 149, 0.1)' : 'rgba(217, 48, 37, 0.1)',
          border: `1px solid ${message.type === 'success' ? '#81c995' : '#d93025'}`,
          color: message.type === 'success' ? '#81c995' : '#f28b82',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '24px',
          fontSize: '14.5px'
        }}>
          {message.type === 'success' ? '✅' : '⚠️'} {message.text}
        </div>
      )}

      {/* DUAL GENERAL TEMPLATES CONFIGURATION */}
      <div style={{ background: '#1e1e1e', border: '1px solid #333', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
        <h2 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 500, color: '#e8eaed' }}>
          💬 Plantillas de Mensaje General por Defecto (Cola)
        </h2>
        <p style={{ margin: '0 0 16px 0', fontSize: '12.5px', color: '#9aa0a6' }}>
          Se enviarán estos dos mensajes en secuencia. Usa <strong>[]</strong> o <strong>()</strong> para el nombre de negocio, y <strong>{'{slug}'}</strong> para la URL de video del lead.
        </p>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'flex-start' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#9aa0a6', marginBottom: '6px', fontWeight: 600 }}>
              Mensaje 1 (Caption de la Imagen / Primer Envío)
            </label>
            <textarea
              value={generalTemplate}
              onChange={(e) => setGeneralTemplate(e.target.value)}
              placeholder="Hola [], soy Leandro..."
              rows={3}
              style={{ width: '100%', background: '#121212', border: '1px solid #444', borderRadius: '8px', color: '#e8eaed', padding: '10px 12px', fontSize: '13.5px', outline: 'none', resize: 'vertical', fontFamily: 'sans-serif' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#9aa0a6', marginBottom: '6px', fontWeight: 600 }}>
              Mensaje 2 (Texto Separado / Segundo Envío)
            </label>
            <textarea
              value={generalTemplate2}
              onChange={(e) => setGeneralTemplate2(e.target.value)}
              placeholder="🎬 Aquí está: https://leandrovenegas.cl/video/{slug}..."
              rows={3}
              style={{ width: '100%', background: '#121212', border: '1px solid #444', borderRadius: '8px', color: '#e8eaed', padding: '10px 12px', fontSize: '13.5px', outline: 'none', resize: 'vertical', fontFamily: 'sans-serif' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
          <button
            onClick={handleSaveTemplate}
            disabled={savingTemplate}
            style={{
              background: 'rgba(138, 180, 248, 0.1)',
              border: '1px solid rgba(138, 180, 248, 0.25)',
              color: '#8ab4f8',
              borderRadius: '8px',
              padding: '10px 20px',
              fontSize: '13.5px',
              cursor: savingTemplate ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => { if (!savingTemplate) e.currentTarget.style.background = 'rgba(138, 180, 248, 0.18)'; }}
            onMouseLeave={(e) => { if (!savingTemplate) e.currentTarget.style.background = 'rgba(138, 180, 248, 0.1)'; }}
          >
            {savingTemplate ? 'Guardando...' : '💾 Guardar Ambas Plantillas'}
          </button>
        </div>
      </div>

      {/* TWO COLUMNS LAYOUT */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
        
        {/* COLUMN LEFT: AVAILABLE LEADS */}
        <div style={{ background: '#1e1e1e', border: '1px solid #333', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 430px)', minHeight: '550px' }}>
          
          <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 500, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>📂 Prospectos Disponibles ({filteredAvailable.length})</span>
          </h2>

          {/* Search box */}
          <div style={{ marginBottom: '14px' }}>
            <input
              type="text"
              placeholder="🔍 Buscar por nombre de negocio..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                background: '#121212',
                border: '1px solid #444',
                borderRadius: '8px',
                color: '#e8eaed',
                fontSize: '13.5px',
                outline: 'none',
              }}
            />
          </div>

          {/* Combinable Filters Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#9aa0a6', marginBottom: '4px' }}>Rubro</label>
              <select
                value={filterRubro}
                onChange={(e) => setFilterRubro(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', background: '#121212', border: '1px solid #444', borderRadius: '6px', color: '#e8eaed', fontSize: '13px', outline: 'none', cursor: 'pointer' }}
              >
                <option value="all">Todos los rubros</option>
                {rubrosOptions.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#9aa0a6', marginBottom: '4px' }}>País</label>
              <select
                value={filterCountry}
                onChange={(e) => setFilterCountry(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', background: '#121212', border: '1px solid #444', borderRadius: '6px', color: '#e8eaed', fontSize: '13px', outline: 'none', cursor: 'pointer' }}
              >
                <option value="all">Todos los países</option>
                <option value="chile">Chile (+56)</option>
                <option value="espana">España (+34)</option>
                <option value="argentina">Argentina (+54)</option>
                <option value="mexico">México (+52)</option>
                <option value="colombia">Colombia (+57)</option>
                <option value="usa_canada">USA/Canadá (+1)</option>
                <option value="other">Otros prefijos</option>
                <option value="none">Sin teléfono</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#9aa0a6', marginBottom: '4px' }}>Tipo de Teléfono</label>
              <select
                value={filterPhoneType}
                onChange={(e) => setFilterPhoneType(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', background: '#121212', border: '1px solid #444', borderRadius: '6px', color: '#e8eaed', fontSize: '13px', outline: 'none', cursor: 'pointer' }}
              >
                <option value="all">Todos los tipos</option>
                <option value="mobile">Celular / Móvil</option>
                <option value="landline">Teléfono Fijo</option>
                <option value="none">Sin teléfono</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#9aa0a6', marginBottom: '4px' }}>Score</label>
              <select
                value={filterScoreRange}
                onChange={(e) => setFilterScoreRange(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', background: '#121212', border: '1px solid #444', borderRadius: '6px', color: '#e8eaed', fontSize: '13px', outline: 'none', cursor: 'pointer' }}
              >
                <option value="all">Todos los scores</option>
                <option value="high">Alto (&gt;= 80)</option>
                <option value="medium">Medio (50 - 79)</option>
                <option value="low">Bajo (&lt; 50)</option>
              </select>
            </div>
          </div>

          {/* Bulk actions tools */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', fontSize: '12.5px' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={handleSelectAll} style={{ background: 'none', border: 'none', color: '#8ab4f8', cursor: 'pointer', padding: 0 }}>Seleccionar Todos en Página</button>
              <span style={{ color: '#444' }}>|</span>
              <button onClick={handleDeselectAll} style={{ background: 'none', border: 'none', color: '#9aa0a6', cursor: 'pointer', padding: 0 }}>Desmarcar Todos</button>
            </div>
            {selectedIds.size > 0 && (
              <button
                onClick={handleAddSelected}
                style={{
                  background: 'rgba(138, 180, 248, 0.1)',
                  border: '1px solid rgba(138, 180, 248, 0.2)',
                  color: '#8ab4f8',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                ➕ Añadir seleccionados ({selectedIds.size})
              </button>
            )}
          </div>

          {/* Paginated List */}
          <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #292929', borderRadius: '8px', padding: '8px', background: '#171717' }}>
            {paginatedAvailable.length === 0 ? (
              <div style={{ color: '#666', textAlign: 'center', padding: '40px 20px', fontSize: '14px' }}>
                No hay prospectos que coincidan con los filtros aplicados.
              </div>
            ) : (
              paginatedAvailable.map((lead) => (
                <div
                  key={lead.id}
                  draggable
                  onDragStart={(e) => handleDragStartFromAvailable(e, lead.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px',
                    background: '#1e1e1e',
                    border: '1px solid #292929',
                    borderRadius: '8px',
                    marginBottom: '8px',
                    cursor: 'grab',
                    userSelect: 'none',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#252525'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#1e1e1e'}
                >
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedIds.has(lead.id)}
                    onChange={() => handleToggleSelect(lead.id)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />

                  {/* Drag Handle Icon */}
                  <span style={{ color: '#555', fontSize: '16px', cursor: 'grab' }}>☰</span>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontSize: '14px', color: '#e8eaed', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{lead.name}</span>
                      {lead.hasOverride && (
                        <span style={{ fontSize: '11px', color: '#fbc02d', cursor: 'help' }} title="Mensaje personalizado (override) configurado en su ficha">
                          ✏️
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: '#9aa0a6', marginTop: '2px', display: 'flex', gap: '8px' }}>
                      <span>📞 {lead.phone}</span>
                      {lead.rubro && <span style={{ color: '#666' }}>• {lead.rubro}</span>}
                    </div>
                  </div>

                  {/* Score */}
                  <span style={{ fontSize: '11px', color: '#8ab4f8', background: 'rgba(138, 180, 248, 0.1)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(138, 180, 248, 0.15)' }}>
                    ★ {lead.score}
                  </span>

                  {/* Quick Add Button */}
                  <button
                    onClick={() => {
                      setQueue(prev => [...prev, lead]);
                      setAvailable(prev => prev.filter(x => x.id !== lead.id));
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#4caf50',
                      cursor: 'pointer',
                      fontSize: '18px',
                      padding: '4px',
                    }}
                    title="Añadir a la cola"
                  >
                    ＋
                  </button>

                </div>
              ))
            )}
          </div>

          {/* PAGINATION CONTROLS */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #292929', fontSize: '13px' }}>
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              style={{
                background: currentPage === 1 ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: currentPage === 1 ? '#555' : '#8ab4f8',
                borderRadius: '6px',
                padding: '6px 12px',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                fontWeight: 500
              }}
            >
              ◀ Anterior
            </button>
            
            <span style={{ color: '#9aa0a6' }}>
              Página {currentPage} de {totalPages} ({filteredAvailable.length} prospectos)
            </span>

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              style={{
                background: currentPage === totalPages ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: currentPage === totalPages ? '#555' : '#8ab4f8',
                borderRadius: '6px',
                padding: '6px 12px',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                fontWeight: 500
              }}
            >
              Siguiente ▶
            </button>
          </div>

        </div>

        {/* COLUMN RIGHT: OUTREACH QUEUE */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDropToQueue}
          style={{
            background: '#1e1e1e',
            border: '1px solid #333',
            borderRadius: '12px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            height: 'calc(100vh - 430px)',
            minHeight: '550px',
            boxShadow: 'inset 0 0 20px rgba(0,0,0,0.1)'
          }}
        >
          
          <h2 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 500, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>📋 Cola de Envíos de WhatsApp</span>
            <span style={{ fontSize: '13px', color: '#81c995', background: 'rgba(129, 201, 149, 0.1)', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
              {queue.length} programados
            </span>
          </h2>
          
          <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#9aa0a6' }}>
            Arrastra elementos aquí para programarlos. El bot consumirá de arriba hacia abajo (Posición 1 en adelante).
          </p>

          {/* List */}
          <div style={{ flex: 1, overflowY: 'auto', border: '2px dashed #333', borderRadius: '8px', padding: '8px', background: '#151515', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {queue.length === 0 ? (
              <div style={{ color: '#555', textAlign: 'center', padding: '60px 20px', fontSize: '14.5px', fontStyle: 'italic', margin: 'auto' }}>
                🏃‍♂️ La cola está vacía.<br/>
                Arrastra prospectos desde la izquierda o usa los checkboxes para programar los envíos.
              </div>
            ) : (
              queue.map((lead, index) => (
                <div
                  key={lead.id}
                  draggable
                  onDragStart={() => handleQueueDragStart(index)}
                  onDragOver={(e) => handleQueueDragOver(e, index)}
                  onDragEnd={handleQueueDragEnd}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px',
                    background: draggedIndex === index ? 'rgba(59, 130, 246, 0.1)' : '#1e1e1e',
                    border: draggedIndex === index ? '1px dashed #3b82f6' : '1px solid #292929',
                    borderRadius: '8px',
                    cursor: 'ns-resize',
                    userSelect: 'none',
                    transition: 'background 0.15s, border-color 0.15s',
                    opacity: draggedIndex === index ? 0.6 : 1,
                  }}
                  onMouseEnter={(e) => { if (draggedIndex !== index) e.currentTarget.style.background = '#252525'; }}
                  onMouseLeave={(e) => { if (draggedIndex !== index) e.currentTarget.style.background = '#1e1e1e'; }}
                >
                  
                  {/* Position Badge */}
                  <span style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'rgba(129, 201, 149, 0.15)',
                    border: '1px solid rgba(129, 201, 149, 0.25)',
                    color: '#81c995',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {index + 1}
                  </span>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: '#e8eaed', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{lead.name}</span>
                      {lead.hasOverride && (
                        <span style={{ fontSize: '11px', color: '#fbc02d', cursor: 'help' }} title="Mensaje personalizado (override) configurado en su ficha">
                          ✏️
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: '#9aa0a6', marginTop: '2px', display: 'flex', gap: '8px' }}>
                      <span>📞 {lead.phone}</span>
                      {lead.rubro && <span style={{ color: '#666' }}>• {lead.rubro}</span>}
                    </div>
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={() => handleRemoveFromQueue(lead.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#f28b82',
                      cursor: 'pointer',
                      fontSize: '16px',
                      padding: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '50%',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(242, 139, 130, 0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                    title="Quitar de la cola"
                  >
                    ✕
                  </button>

                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
