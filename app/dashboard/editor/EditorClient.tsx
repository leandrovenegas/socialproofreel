'use client';

import React, { useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase/client';
import type { ComponentItem, VideoTemplateConfig, EffectsConfig, BusinessNameConfig } from '@/components/remotion/VideoTemplate';

const PlayerComponent = dynamic(
  () => import('./PlayerPreview'),
  {
    ssr: false,
    loading: () => (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#5f6368', fontSize: '14px' }}>
        Cargando previsualizador…
      </div>
    ),
  }
);

const DEFAULT_ORDER: ComponentItem[] = [
  { id: 'avatar', label: 'Avatar', visible: true },
  { id: 'stars', label: 'Estrellas', visible: true },
  { id: 'review_text', label: 'Texto de Reseña', visible: true },
  { id: 'reviewer_name', label: 'Nombre del Autor', visible: true },
];

const DEFAULT_EFFECTS: EffectsConfig = {
  fade_in_duration: 20,
  card_slide_distance: 60,
  card_damping: 14,
  stars_initial_scale: 0.3,
  stars_damping: 10,
  stagger_delay: 5,
};

const DEFAULT_BUSINESS: BusinessNameConfig = {
  visible: true,
  show_rating: true,
  text_size: 52,
  rating_text_size: 32,
};

export default function EditorClient() {
  const [config, setConfig] = useState<VideoTemplateConfig>({
    primary_color: '#4285F4',
    blur_level: 10,
    font_family: "'Roboto', sans-serif",
    layout: 'Center',
    avatar_size: 140,
    review_text_size: 34,
    reviewer_name_size: 30,
    component_order: DEFAULT_ORDER,
    business_name: DEFAULT_BUSINESS,
    effects: DEFAULT_EFFECTS,
  });

  const [templateName, setTemplateName] = useState('Plantilla Google Reviews');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'design' | 'effects'>('design');

  // ── Drag state ──
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const set = <K extends keyof VideoTemplateConfig>(key: K, value: VideoTemplateConfig[K]) => {
    setConfig((p) => ({ ...p, [key]: value }));
  };

  const setEffect = <K extends keyof EffectsConfig>(key: K, value: EffectsConfig[K]) => {
    setConfig((p) => ({ ...p, effects: { ...p.effects, [key]: value } }));
  };

  const setBiz = <K extends keyof BusinessNameConfig>(key: K, value: BusinessNameConfig[K]) => {
    setConfig((p) => ({ ...p, business_name: { ...p.business_name, [key]: value } }));
  };

  const toggleVis = (id: string) => {
    setConfig((p) => ({
      ...p,
      component_order: p.component_order.map((c) => (c.id === id ? { ...c, visible: !c.visible } : c)),
    }));
  };

  const handleDragStart = (i: number) => { dragItem.current = i; };
  const handleDragEnter = (i: number) => { dragOverItem.current = i; };
  const handleDragEnd = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    const arr = [...config.component_order];
    const moved = arr.splice(dragItem.current, 1)[0];
    arr.splice(dragOverItem.current, 0, moved);
    set('component_order', arr);
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      const { error } = await supabase.from('settings').upsert({
        id: '00000000-0000-0000-0000-000000000001',
        primary_color: config.primary_color,
        font_family: config.font_family,
        blur_level: config.blur_level,
        config: config,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      setMessage({ type: 'success', text: '✅ Guardado. El Worker usará esta configuración.' });
    } catch (e: any) {
      console.error(e);
      setMessage({ type: 'error', text: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  /* ═══════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════ */
  return (
    <div style={{ display: 'flex', height: '100%', fontFamily: "'Roboto', system-ui, sans-serif" }}>

      {/* ════════ SIDEBAR ════════ */}
      <div style={{
        width: '410px', minWidth: '410px',
        background: '#1e1e1e', borderRight: '1px solid #333',
        display: 'flex', flexDirection: 'column', height: '100%',
      }}>
        {/* Header */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #333', background: '#252525' }}>
          <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 500, color: '#e8eaed' }}>Editor de Plantilla</h2>
          <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#9aa0a6' }}>Cambios en tiempo real</p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #333' }}>
          {(['design', 'effects'] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              flex: 1, padding: '12px', background: 'none', border: 'none',
              borderBottom: activeTab === tab ? '2px solid #8ab4f8' : '2px solid transparent',
              color: activeTab === tab ? '#8ab4f8' : '#9aa0a6',
              fontWeight: 500, fontSize: '13px', cursor: 'pointer', transition: 'all 0.15s',
            }}>
              {tab === 'design' ? '🎨 Diseño' : '✨ Efectos'}
            </button>
          ))}
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {activeTab === 'design' && (
            <>
              {/* Template name */}
              <Section title="Nombre de Plantilla" icon="📝">
                <input type="text" value={templateName} onChange={(e) => setTemplateName(e.target.value)} style={inputStyle} />
              </Section>

              {/* ── COMPONENT STACK ── */}
              <Section title="Orden de Componentes (Tarjeta)" icon="🧩">
                <p style={{ fontSize: '11px', color: '#9aa0a6', margin: '0 0 6px' }}>Arrastra para reordenar · 👁 para ocultar</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {config.component_order.map((item, index) => (
                    <div key={item.id} draggable onDragStart={() => handleDragStart(index)}
                      onDragEnter={() => handleDragEnter(index)} onDragEnd={handleDragEnd}
                      onDragOver={(e) => e.preventDefault()}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '10px 12px', background: item.visible ? '#2d2d2d' : '#1a1a1a',
                        borderRadius: '8px', cursor: 'grab', border: '1px solid #3c3c3c',
                        opacity: item.visible ? 1 : 0.45, transition: 'all 0.15s', userSelect: 'none',
                      }}>
                      <span style={{ color: '#666', fontSize: '14px' }}>⠿</span>
                      <span style={{ flex: 1, fontSize: '13px', color: item.visible ? '#e8eaed' : '#666', fontWeight: 500 }}>
                        {item.label}
                      </span>
                      <button onClick={(e) => { e.stopPropagation(); toggleVis(item.id); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', padding: '2px 4px', opacity: item.visible ? 1 : 0.35 }}
                        title={item.visible ? 'Ocultar' : 'Mostrar'}>
                        👁
                      </button>
                    </div>
                  ))}
                </div>
              </Section>

              {/* ── BUSINESS NAME (outside card) ── */}
              <Section title="Nombre del Local (fuera de tarjeta)" icon="🏪">
                <ToggleRow label="Mostrar nombre" checked={config.business_name.visible} onChange={(v) => setBiz('visible', v)} />
                <ToggleRow label="Mostrar puntaje (★ en Google)" checked={config.business_name.show_rating} onChange={(v) => setBiz('show_rating', v)} />
                <Slider label={`Tamaño nombre: ${config.business_name.text_size}px`} min={24} max={80}
                  value={config.business_name.text_size} onChange={(v) => setBiz('text_size', v)} accent="#EA4335" />
                <Slider label={`Tamaño puntaje: ${config.business_name.rating_text_size}px`} min={16} max={50}
                  value={config.business_name.rating_text_size} onChange={(v) => setBiz('rating_text_size', v)} accent="#FBBC04" />
              </Section>

              {/* ── SIZES ── */}
              <Section title="Tamaños (dentro de tarjeta)" icon="📐">
                <Slider label={`Avatar: ${config.avatar_size}%`} min={60} max={200}
                  value={config.avatar_size} onChange={(v) => set('avatar_size', v)} accent="#4285F4" />
                <Slider label={`Texto Reseña: ${config.review_text_size}px`} min={18} max={60}
                  value={config.review_text_size} onChange={(v) => set('review_text_size', v)} accent="#34A853" />
                <Slider label={`Nombre Autor: ${config.reviewer_name_size}px`} min={16} max={50}
                  value={config.reviewer_name_size} onChange={(v) => set('reviewer_name_size', v)} accent="#FBBC04" />
              </Section>

              {/* ── COLORS ── */}
              <Section title="Color de Acento" icon="🎨">
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {['#4285F4', '#34A853', '#EA4335', '#FBBC04', '#8E24AA', '#00ACC1', '#FF7043'].map((c) => (
                    <button key={c} onClick={() => set('primary_color', c)} style={{
                      width: '34px', height: '34px', borderRadius: '50%',
                      border: config.primary_color === c ? '3px solid white' : '2px solid #555',
                      background: c, cursor: 'pointer', transition: 'transform 0.15s',
                      transform: config.primary_color === c ? 'scale(1.15)' : 'scale(1)',
                      boxShadow: config.primary_color === c ? `0 0 12px ${c}66` : 'none',
                    }} />
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '8px' }}>
                  <input type="color" value={config.primary_color} onChange={(e) => set('primary_color', e.target.value)}
                    style={{ width: '34px', height: '34px', border: 'none', borderRadius: '8px', cursor: 'pointer', background: 'transparent', padding: 0 }} />
                  <input type="text" value={config.primary_color} onChange={(e) => set('primary_color', e.target.value)}
                    style={{ ...inputStyle, fontFamily: 'monospace', flex: 1 }} />
                </div>
              </Section>

              {/* ── LAYOUT ── */}
              <Section title="Posición Vertical" icon="↕️">
                <div style={{ display: 'flex', gap: '6px' }}>
                  {(['Top', 'Center', 'Bottom'] as const).map((pos) => (
                    <button key={pos} onClick={() => set('layout', pos)} style={{
                      flex: 1, padding: '10px', borderRadius: '8px',
                      border: config.layout === pos ? '2px solid #8ab4f8' : '1px solid #444',
                      background: config.layout === pos ? '#4285F422' : '#2d2d2d',
                      color: config.layout === pos ? '#8ab4f8' : '#9aa0a6',
                      cursor: 'pointer', fontWeight: 500, fontSize: '12px', transition: 'all 0.15s',
                    }}>
                      {pos === 'Top' ? '↑ Arriba' : pos === 'Center' ? '⬤ Centro' : '↓ Abajo'}
                    </button>
                  ))}
                </div>
              </Section>

              {/* ── BLUR ── */}
              <Section title="Desenfoque de Fondo" icon="🌫️">
                <Slider label={`${config.blur_level}px`} min={0} max={30}
                  value={config.blur_level} onChange={(v) => set('blur_level', v)} accent="#8E24AA" />
              </Section>

              {/* ── FONT ── */}
              <Section title="Tipografía" icon="🔤">
                <select value={config.font_family} onChange={(e) => set('font_family', e.target.value)} style={inputStyle}>
                  <option value="'Roboto', sans-serif">Roboto</option>
                  <option value="sans-serif">System Sans Serif</option>
                  <option value="serif">Serif</option>
                  <option value="'Inter', sans-serif">Inter</option>
                  <option value="'Georgia', serif">Georgia</option>
                </select>
              </Section>
            </>
          )}

          {activeTab === 'effects' && (
            <>
              <Section title="Entrada General" icon="🎬">
                <Slider label={`Duración Fade-in: ${config.effects.fade_in_duration} frames`}
                  min={1} max={60} value={config.effects.fade_in_duration}
                  onChange={(v) => setEffect('fade_in_duration', v)} accent="#4285F4" />
                <p style={hintStyle}>Velocidad con la que aparece la escena. Más frames = más lento.</p>
              </Section>

              <Section title="Deslizamiento de Tarjeta" icon="📦">
                <Slider label={`Distancia: ${config.effects.card_slide_distance}px`}
                  min={0} max={200} value={config.effects.card_slide_distance}
                  onChange={(v) => setEffect('card_slide_distance', v)} accent="#34A853" />
                <Slider label={`Amortiguación: ${config.effects.card_damping}`}
                  min={5} max={30} value={config.effects.card_damping}
                  onChange={(v) => setEffect('card_damping', v)} accent="#34A853" />
                <p style={hintStyle}>Distancia = cuánto se desplaza. Amortiguación = cuán rápido frena (mayor = menos rebote).</p>
              </Section>

              <Section title="Animación de Estrellas" icon="⭐">
                <Slider label={`Escala inicial: ${(config.effects.stars_initial_scale * 100).toFixed(0)}%`}
                  min={0} max={100} value={Math.round(config.effects.stars_initial_scale * 100)}
                  onChange={(v) => setEffect('stars_initial_scale', v / 100)} accent="#FBBC04" />
                <Slider label={`Amortiguación: ${config.effects.stars_damping}`}
                  min={5} max={30} value={config.effects.stars_damping}
                  onChange={(v) => setEffect('stars_damping', v)} accent="#FBBC04" />
                <p style={hintStyle}>Las estrellas crecen desde la escala inicial hasta el 100%. Menor escala = efecto más dramático.</p>
              </Section>

              <Section title="Secuencia entre Componentes" icon="⏱️">
                <Slider label={`Retraso entre elementos: ${config.effects.stagger_delay} frames`}
                  min={0} max={20} value={config.effects.stagger_delay}
                  onChange={(v) => setEffect('stagger_delay', v)} accent="#EA4335" />
                <p style={hintStyle}>Cuántos frames de diferencia hay entre la aparición de cada componente. 0 = todos a la vez.</p>
              </Section>

              {/* Reset button */}
              <button onClick={() => set('effects', DEFAULT_EFFECTS)} style={{
                padding: '10px', background: '#2d2d2d', border: '1px solid #444',
                borderRadius: '8px', color: '#9aa0a6', fontSize: '12px', cursor: 'pointer',
                transition: 'all 0.15s', textAlign: 'center',
              }}>
                🔄 Restaurar efectos por defecto
              </button>
            </>
          )}
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
          <button onClick={handleSave} disabled={isSaving} style={{
            width: '100%', padding: '12px',
            background: isSaving ? '#333' : '#4285F4',
            color: isSaving ? '#666' : '#fff', border: 'none', borderRadius: '8px',
            fontWeight: 500, fontSize: '14px',
            cursor: isSaving ? 'not-allowed' : 'pointer', transition: 'all 0.15s',
            boxShadow: isSaving ? 'none' : '0 1px 3px rgba(0,0,0,0.3)',
          }}>
            {isSaving ? 'Guardando…' : '💾 Guardar Configuración'}
          </button>
        </div>
      </div>

      {/* ════════ PLAYER AREA ════════ */}
      <div style={{
        flex: 1, background: '#121212',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px', overflow: 'hidden', position: 'relative',
      }}>
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.05, pointerEvents: 'none',
          backgroundImage: 'radial-gradient(#888 1px, transparent 1px)', backgroundSize: '20px 20px',
        }} />
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

/* ═══════ Shared Components ═══════ */

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

function Slider({ label, min, max, value, onChange, accent }: {
  label: string; min: number; max: number; value: number; onChange: (v: number) => void; accent: string;
}) {
  return (
    <div>
      <span style={{ fontSize: '12px', color: '#9aa0a6', display: 'block', marginBottom: '4px' }}>{label}</span>
      <input type="range" min={min} max={max} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: accent }} />
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
      <span style={{ fontSize: '13px', color: '#e8eaed' }}>{label}</span>
      <button onClick={() => onChange(!checked)} style={{
        width: '40px', height: '22px', borderRadius: '11px',
        background: checked ? '#4285F4' : '#555', border: 'none', cursor: 'pointer',
        position: 'relative', transition: 'background 0.2s',
      }}>
        <div style={{
          width: '16px', height: '16px', borderRadius: '50%', background: 'white',
          position: 'absolute', top: '3px',
          left: checked ? '21px' : '3px', transition: 'left 0.2s',
        }} />
      </button>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#2d2d2d', border: '1px solid #444',
  borderRadius: '8px', padding: '10px 12px', color: '#e8eaed',
  fontSize: '13px', outline: 'none',
};

const hintStyle: React.CSSProperties = {
  fontSize: '11px', color: '#666', margin: '4px 0 0', lineHeight: 1.4, fontStyle: 'italic',
};
