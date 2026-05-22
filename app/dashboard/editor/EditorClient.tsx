'use client';

import React, { useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase/client';
import type { ComponentItem, VideoTemplateConfig } from '@/components/remotion/VideoTemplate';

const PlayerComponent = dynamic(
  () => import('./PlayerPreview'),
  {
    ssr: false,
    loading: () => (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#5f6368', fontSize: '14px' }}>
        Cargando previsualizador...
      </div>
    ),
  }
);

const DEFAULT_ORDER: ComponentItem[] = [
  { id: 'avatar', label: 'Avatar', visible: true },
  { id: 'stars', label: 'Estrellas', visible: true },
  { id: 'review_text', label: 'Texto de Reseña', visible: true },
  { id: 'reviewer_name', label: 'Nombre del Autor', visible: true },
  { id: 'business_name', label: 'Nombre del Local', visible: true },
];

export default function EditorClient() {
  const [config, setConfig] = useState<VideoTemplateConfig>({
    primary_color: '#4285F4',
    blur_level: 10,
    font_family: "'Roboto', sans-serif",
    layout: 'Center',
    avatar_size: 140,
    review_text_size: 34,
    reviewer_name_size: 30,
    business_name_size: 52,
    component_order: DEFAULT_ORDER,
  });

  const [templateName, setTemplateName] = useState('Plantilla Google Reviews');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Drag state
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const handleChange = <K extends keyof VideoTemplateConfig>(key: K, value: VideoTemplateConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const toggleVisibility = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      component_order: prev.component_order.map((c) =>
        c.id === id ? { ...c, visible: !c.visible } : c
      ),
    }));
  };

  const handleDragStart = (index: number) => {
    dragItem.current = index;
  };

  const handleDragEnter = (index: number) => {
    dragOverItem.current = index;
  };

  const handleDragEnd = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    const newOrder = [...config.component_order];
    const draggedItem = newOrder[dragItem.current];
    newOrder.splice(dragItem.current, 1);
    newOrder.splice(dragOverItem.current, 0, draggedItem);
    setConfig((prev) => ({ ...prev, component_order: newOrder }));
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      const { error } = await supabase
        .from('settings')
        .upsert({
          id: '00000000-0000-0000-0000-000000000001',
          primary_color: config.primary_color,
          font_family: config.font_family,
          blur_level: config.blur_level,
          config: config,
          updated_at: new Date().toISOString(),
        });
      if (error) throw error;
      setMessage({ type: 'success', text: '✅ Guardado. El Worker usará esta configuración.' });
    } catch (error: any) {
      console.error(error);
      setMessage({ type: 'error', text: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100%', fontFamily: "'Roboto', 'Google Sans', system-ui, sans-serif" }}>

      {/* ════════ SIDEBAR ════════ */}
      <div style={{
        width: '400px', minWidth: '400px',
        background: '#1e1e1e',
        borderRight: '1px solid #333',
        display: 'flex', flexDirection: 'column',
        height: '100%', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #333', background: '#252525' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 500, color: '#e8eaed' }}>Editor de Plantilla</h2>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#9aa0a6' }}>Los cambios se reflejan en tiempo real</p>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '24px', flex: 1 }}>

          {/* Template name */}
          <Section title="Nombre de Plantilla" icon="📝">
            <input type="text" value={templateName} onChange={(e) => setTemplateName(e.target.value)} style={inputStyle} />
          </Section>

          {/* ── COMPONENT STACK ── */}
          <Section title="Orden de Componentes" icon="🧩">
            <p style={{ fontSize: '11px', color: '#9aa0a6', margin: '0 0 8px' }}>Arrastra para reordenar · Clic en 👁 para ocultar</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {config.component_order.map((item, index) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragEnter={() => handleDragEnter(index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '10px 12px',
                    background: item.visible ? '#2d2d2d' : '#1a1a1a',
                    borderRadius: '8px',
                    cursor: 'grab',
                    border: '1px solid #3c3c3c',
                    opacity: item.visible ? 1 : 0.5,
                    transition: 'all 0.15s ease',
                    userSelect: 'none',
                  }}
                >
                  {/* Drag handle */}
                  <span style={{ color: '#666', fontSize: '14px', cursor: 'grab' }}>⠿</span>

                  {/* Label */}
                  <span style={{ flex: 1, fontSize: '13px', color: item.visible ? '#e8eaed' : '#666', fontWeight: 500 }}>
                    {item.label}
                  </span>

                  {/* Visibility toggle */}
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleVisibility(item.id); }}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: '16px', padding: '2px 4px',
                      opacity: item.visible ? 1 : 0.4,
                      transition: 'opacity 0.15s',
                    }}
                    title={item.visible ? 'Ocultar' : 'Mostrar'}
                  >
                    👁
                  </button>
                </div>
              ))}
            </div>
          </Section>

          {/* ── SIZES ── */}
          <Section title="Tamaños" icon="📐">
            <SliderField
              label={`Avatar: ${config.avatar_size}%`}
              min={60} max={200} value={config.avatar_size}
              onChange={(v) => handleChange('avatar_size', v)}
              accent="#4285F4"
            />
            <SliderField
              label={`Texto Reseña: ${config.review_text_size}px`}
              min={18} max={60} value={config.review_text_size}
              onChange={(v) => handleChange('review_text_size', v)}
              accent="#34A853"
            />
            <SliderField
              label={`Nombre Autor: ${config.reviewer_name_size}px`}
              min={16} max={50} value={config.reviewer_name_size}
              onChange={(v) => handleChange('reviewer_name_size', v)}
              accent="#FBBC04"
            />
            <SliderField
              label={`Nombre Local: ${config.business_name_size}px`}
              min={24} max={80} value={config.business_name_size}
              onChange={(v) => handleChange('business_name_size', v)}
              accent="#EA4335"
            />
          </Section>

          {/* ── COLORS ── */}
          <Section title="Color de Acento" icon="🎨">
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {['#4285F4', '#34A853', '#EA4335', '#FBBC04', '#8E24AA', '#00ACC1', '#FF7043'].map((color) => (
                <button
                  key={color}
                  onClick={() => handleChange('primary_color', color)}
                  style={{
                    width: '36px', height: '36px', borderRadius: '50%', border: config.primary_color === color ? '3px solid white' : '2px solid #555',
                    background: color, cursor: 'pointer', transition: 'transform 0.15s',
                    transform: config.primary_color === color ? 'scale(1.15)' : 'scale(1)',
                    boxShadow: config.primary_color === color ? `0 0 12px ${color}66` : 'none',
                  }}
                />
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '8px' }}>
              <input type="color" value={config.primary_color} onChange={(e) => handleChange('primary_color', e.target.value)}
                style={{ width: '36px', height: '36px', border: 'none', borderRadius: '8px', cursor: 'pointer', background: 'transparent', padding: 0 }} />
              <input type="text" value={config.primary_color} onChange={(e) => handleChange('primary_color', e.target.value)}
                style={{ ...inputStyle, fontFamily: 'monospace', flex: 1 }} />
            </div>
          </Section>

          {/* ── LAYOUT ── */}
          <Section title="Posición" icon="↕️">
            <div style={{ display: 'flex', gap: '6px' }}>
              {(['Top', 'Center', 'Bottom'] as const).map((pos) => (
                <button key={pos} onClick={() => handleChange('layout', pos)}
                  style={{
                    flex: 1, padding: '10px', borderRadius: '8px',
                    border: config.layout === pos ? '2px solid #4285F4' : '1px solid #444',
                    background: config.layout === pos ? '#4285F422' : '#2d2d2d',
                    color: config.layout === pos ? '#8ab4f8' : '#9aa0a6',
                    cursor: 'pointer', fontWeight: 500, fontSize: '12px', transition: 'all 0.15s',
                  }}
                >
                  {pos === 'Top' ? '↑ Arriba' : pos === 'Center' ? '⬤ Centro' : '↓ Abajo'}
                </button>
              ))}
            </div>
          </Section>

          {/* ── EFFECTS ── */}
          <Section title="Desenfoque de Fondo" icon="✨">
            <SliderField
              label={`${config.blur_level}px`}
              min={0} max={30} value={config.blur_level}
              onChange={(v) => handleChange('blur_level', v)}
              accent="#8E24AA"
            />
          </Section>

          {/* ── FONT ── */}
          <Section title="Tipografía" icon="🔤">
            <select value={config.font_family} onChange={(e) => handleChange('font_family', e.target.value)} style={inputStyle}>
              <option value="'Roboto', sans-serif">Roboto</option>
              <option value="'Google Sans', sans-serif">Google Sans</option>
              <option value="sans-serif">System Sans Serif</option>
              <option value="serif">Serif</option>
              <option value="'Inter', sans-serif">Inter</option>
              <option value="'Georgia', serif">Georgia</option>
            </select>
          </Section>
        </div>

        {/* ── SAVE BUTTON ── */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #333', background: '#1a1a1a' }}>
          {message && (
            <div style={{
              marginBottom: '10px', padding: '10px 12px', borderRadius: '8px', fontSize: '12px',
              background: message.type === 'success' ? '#1b3a2a' : '#3a1b1b',
              color: message.type === 'success' ? '#81c995' : '#f28b82',
              border: `1px solid ${message.type === 'success' ? '#2d6a4f' : '#6a2d2d'}`,
            }}>
              {message.text}
            </div>
          )}
          <button onClick={handleSave} disabled={isSaving}
            style={{
              width: '100%', padding: '12px',
              background: isSaving ? '#333' : '#4285F4',
              color: isSaving ? '#666' : '#fff', border: 'none', borderRadius: '8px',
              fontWeight: 500, fontSize: '14px',
              cursor: isSaving ? 'not-allowed' : 'pointer', transition: 'all 0.15s',
              boxShadow: isSaving ? 'none' : '0 1px 3px rgba(0,0,0,0.3)',
            }}
          >
            {isSaving ? 'Guardando...' : '💾 Guardar Configuración'}
          </button>
        </div>
      </div>

      {/* ════════ PLAYER AREA ════════ */}
      <div style={{
        flex: 1, background: '#121212',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px', overflow: 'hidden', position: 'relative',
      }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.05, pointerEvents: 'none',
          backgroundImage: 'radial-gradient(#888 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
        <div style={{
          position: 'relative', height: 'calc(100vh - 100px)',
          aspectRatio: '9/16', maxWidth: '100%',
          borderRadius: '12px', overflow: 'hidden',
          boxShadow: '0 4px 24px rgba(0,0,0,0.6)', border: '1px solid #333',
        }}>
          <PlayerComponent config={config} />
        </div>
      </div>
    </div>
  );
}

/* ═══════ Helper Components ═══════ */

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 style={{ fontSize: '13px', fontWeight: 500, color: '#e8eaed', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span>{icon}</span> {title}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>{children}</div>
    </div>
  );
}

function SliderField({ label, min, max, value, onChange, accent }: {
  label: string; min: number; max: number; value: number; onChange: (v: number) => void; accent: string;
}) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '12px', color: '#9aa0a6' }}>{label}</span>
      </div>
      <input type="range" min={min} max={max} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: accent }} />
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#2d2d2d', border: '1px solid #444',
  borderRadius: '8px', padding: '10px 12px', color: '#e8eaed',
  fontSize: '13px', outline: 'none',
};
