'use client';

import React, { useState, useEffect, useTransition } from 'react';

interface MessageTemplate {
  id: string;
  label: string;
  text: string;
  stageTrigger?: number;
}

const DEFAULT_TEMPLATES: MessageTemplate[] = [
  {
    id: 't-1',
    label: 'Contacto Inicial (Etapa 1-2)',
    text: 'Hola! Vi que tienes reseñas en Google y te generé un video gratis con ellas para []. ¿Lo quieres ver?',
    stageTrigger: 2
  },
  {
    id: 't-2',
    label: 'Seguimiento Video (Etapa 3-4)',
    text: 'Hola! ¿Pudiste ver el video? Lo hice especialmente para ( ). Con esto puedes conseguir más clientes mostrando tus reseñas en redes.',
    stageTrigger: 4
  },
  {
    id: 't-3',
    label: 'Oferta Comercial (Etapa 5-6)',
    text: 'Hola! Para que puedas publicarlo y empezar a usarlo en [], el sistema completo tiene un valor de $X. ¿Te interesa?',
    stageTrigger: 6
  },
  {
    id: 't-4',
    label: 'Mensaje 2 (Video)',
    text: 'Aquí está: https://leandrovenegas.cl/video/{slug} gratis. Y si tienes otros videos grabados sin editar, en 24-48h te los dejo listos. saludos. ',
    stageTrigger: 3
  }
];

const replacePlaceholders = (text: string, companyName: string, slug?: string) => {
  return text
    .replace(/\[\s*\]/g, companyName)
    .replace(/\(\s*\)/g, companyName)
    .replace(/\{\s*slug\s*\}/gi, slug || '');
};
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { updateLeadContactData, updateLeadStatus, updateLeadMessageOverride } from '../actions';

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
    message_override?: string | null;
    message_override_2?: string | null;
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
  const searchParams = useSearchParams();
  const [outreachList, setOutreachList] = useState<OutreachRecord[]>(initialOutreach);
  const [isPending, startTransition] = useTransition();
  const [urlCopied, setUrlCopied] = useState(false);

  const copyLandingUrl = () => {
    if (!lead.slug) return;
    const url = `https://leandrovenegas.cl/video/${lead.slug}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url)
        .then(() => {
          setUrlCopied(true);
          setTimeout(() => setUrlCopied(false), 2000);
        })
        .catch((err) => console.error('Failed to copy text: ', err));
    } else {
      try {
        const textArea = document.createElement("textarea");
        textArea.value = url;
        textArea.style.position = "fixed";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setUrlCopied(true);
        setTimeout(() => setUrlCopied(false), 2000);
      } catch (err) {
        console.error('Fallback copy exception: ', err);
      }
    }
  };

  const getBackLink = () => {
    const from = searchParams.get('from');
    let link = '/dashboard/crm';
    if (from === 'pipeline') link = '/dashboard/crm/pipeline';
    if (from === 'descartados') link = '/dashboard/crm/descartados';

    const params = new URLSearchParams();
    const rubro = searchParams.get('rubro');
    const page = searchParams.get('page');
    const filterVideo = searchParams.get('filterVideo');

    if (rubro) params.set('rubro', rubro);
    if (page) params.set('page', page);
    if (filterVideo) params.set('filterVideo', filterVideo);

    const query = params.toString();
    return query ? `${link}?${query}` : link;
  };

  // Contact data states
  const [contactData, setContactData] = useState(lead.contact_data || null);
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [editPhone, setEditPhone] = useState(lead.contact_data?.phone_international || lead.contact_data?.phone || lead.raw_data?.phone || '');
  const [editWebsite, setEditWebsite] = useState(lead.contact_data?.website || '');
  const [editEmail, setEditEmail] = useState(lead.contact_data?.email || '');
  const [savingContact, setSavingContact] = useState(false);

  // Find the primary outreach record (usually the latest one, or first WhatsApp one) to update notes and states
  const mainRecord = outreachList[outreachList.length - 1] || null;

  const [notes, setNotes] = useState<string>('');
  const [savingNotes, setSavingNotes] = useState<boolean>(false);
  const [currentEstado, setCurrentEstado] = useState<string>(mainRecord?.estado || 'pendiente');
  const [messageOverride, setMessageOverride] = useState<string>(lead.message_override || '');
  const [messageOverride2, setMessageOverride2] = useState<string>(lead.message_override_2 || '');
  const [savingOverride, setSavingOverride] = useState<boolean>(false);

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
  const phone = contactData?.phone_international || contactData?.phone || lead.raw_data?.phone || null;
  const website = contactData?.website || null;
  const email = contactData?.email || null;

  // Template States
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [customMessage, setCustomMessage] = useState<string>('');
  const [isManagingTemplates, setIsManagingTemplates] = useState<boolean>(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  
  const [formLabel, setFormLabel] = useState<string>('');
  const [formText, setFormText] = useState<string>('');

  // Save templates to DB and localStorage
  const saveTemplatesToDbAndStorage = async (updated: MessageTemplate[]) => {
    setTemplates(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('crm_message_templates', JSON.stringify(updated));
    }

    try {
      // Fetch current settings config
      const { data: settingsData } = await supabase
        .from('settings')
        .select('*')
        .eq('id', '00000000-0000-0000-0000-000000000001')
        .single();
      
      const currentConfig = settingsData?.config || {};
      const updatedConfig = {
        ...currentConfig,
        crm_templates: updated
      };

      await supabase
        .from('settings')
        .upsert({
          id: '00000000-0000-0000-0000-000000000001',
          primary_color: settingsData?.primary_color || '#FBBC04',
          font_family: settingsData?.font_family || "'Roboto', sans-serif",
          blur_level: settingsData?.blur_level || 10,
          config: updatedConfig,
          updated_at: new Date().toISOString()
        });
    } catch (err) {
      console.error('Error saving templates to database settings:', err);
    }
  };

  // Load templates on mount or lead changes
  useEffect(() => {
    const loadTemplatesAndSelect = async () => {
      let loadedTemplates: MessageTemplate[] = [];

      // 1. Try to load from Supabase database settings
      try {
        const { data, error } = await supabase
          .from('settings')
          .select('config')
          .eq('id', '00000000-0000-0000-0000-000000000001')
          .single();
        
        if (data?.config && Array.isArray((data.config as any).crm_templates)) {
          loadedTemplates = (data.config as any).crm_templates;
        }
      } catch (err) {
        console.error('Error fetching templates from DB:', err);
      }

      // 2. Fallback to localStorage if database fetch failed or returned nothing
      if (!loadedTemplates || loadedTemplates.length === 0) {
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('crm_message_templates');
          if (stored) {
            try {
              loadedTemplates = JSON.parse(stored);
            } catch (e) {
              console.error('Error parsing templates from localStorage', e);
            }
          }
        }
      }

      // 3. Fallback to DEFAULT_TEMPLATES if both failed
      if (!loadedTemplates || loadedTemplates.length === 0) {
        loadedTemplates = DEFAULT_TEMPLATES;
        if (typeof window !== 'undefined') {
          localStorage.setItem('crm_message_templates', JSON.stringify(DEFAULT_TEMPLATES));
        }
      }

      setTemplates(loadedTemplates);

      // Auto-select template based on highestStage
      const bestMatch = loadedTemplates.find(t => t.stageTrigger && highestStage <= t.stageTrigger) 
        || loadedTemplates[0];
      if (bestMatch) {
        setSelectedTemplateId(bestMatch.id);
        setCustomMessage(replacePlaceholders(bestMatch.text, name, lead.slug));
      }
    };

    loadTemplatesAndSelect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.id]);

  const handleSelectTemplate = (id: string) => {
    setSelectedTemplateId(id);
    const tmpl = templates.find(t => t.id === id);
    if (tmpl) {
      setCustomMessage(replacePlaceholders(tmpl.text, name, lead.slug));
    }
  };

  const handleMessageChange = (val: string) => {
    setCustomMessage(val);
  };

  const handleDeleteTemplate = async (id: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar esta plantilla?')) {
      const updated = templates.filter(t => t.id !== id);
      await saveTemplatesToDbAndStorage(updated);
      if (selectedTemplateId === id) {
        const next = updated[0];
        if (next) {
          setSelectedTemplateId(next.id);
          setCustomMessage(replacePlaceholders(next.text, name, lead.slug));
        } else {
          setSelectedTemplateId('');
          setCustomMessage('');
        }
      }
    }
  };

  const handleStartEdit = (tmpl: MessageTemplate) => {
    setEditingTemplate(tmpl);
    setFormLabel(tmpl.label);
    setFormText(tmpl.text);
  };

  const handleStartAdd = () => {
    setEditingTemplate({ id: '', label: '', text: '' });
    setFormLabel('');
    setFormText('');
  };

  const handleSaveTemplateForm = async () => {
    if (!formLabel.trim() || !formText.trim()) {
      alert('Por favor completa todos los campos.');
      return;
    }

    let updated: MessageTemplate[];
    if (editingTemplate && editingTemplate.id !== '') {
      updated = templates.map(t => 
        t.id === editingTemplate.id 
          ? { ...t, label: formLabel, text: formText } 
          : t
      );
    } else {
      const newTmpl: MessageTemplate = {
        id: 't-' + Date.now(),
        label: formLabel,
        text: formText
      };
      updated = [...templates, newTmpl];
    }

    await saveTemplatesToDbAndStorage(updated);
    
    if (editingTemplate && selectedTemplateId === editingTemplate.id) {
      setCustomMessage(replacePlaceholders(formText, name, lead.slug));
    } else if (!editingTemplate || editingTemplate.id === '') {
      const lastAdded = updated[updated.length - 1];
      if (lastAdded) {
        setSelectedTemplateId(lastAdded.id);
        setCustomMessage(replacePlaceholders(lastAdded.text, name, lead.slug));
      }
    }

    setEditingTemplate(null);
    setFormLabel('');
    setFormText('');
  };

  const waUrl = phone
    ? `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(customMessage)}`
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
      // Update raw_leads so it moves to pipeline using server action to bypass RLS
      await updateLeadStatus(lead.id, 'contactado', 'prospecto').catch(console.error);
    } else if (error) {
      alert('Error registrando WhatsApp: ' + error.message);
    }
  };

  const handleSaveNotes = async () => {
    if (!notes.trim()) return; // Don't save empty notes

    setSavingNotes(true);
    try {
      // Create new outreach record for notes
      const { data, error } = await supabase
        .from('outreach')
        .insert({
          lead_id: lead.id,
          canal: 'whatsapp', // Defaulting to whatsapp or keeping it generic based on schema
          estado: currentEstado,
          notas: notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setOutreachList((prev) => [...prev, data as OutreachRecord]);
        setNotes(''); // Clear notes after saving
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

  const handleSaveContact = async () => {
    setSavingContact(true);
    try {
      const updatedContactData = {
        ...(contactData || {}),
        phone: editPhone || null,
        phone_international: editPhone || null,
        website: editWebsite || null,
        email: editEmail || null,
      };

      // Using Server Action to bypass RLS on raw_leads table
      await updateLeadContactData(lead.id, updatedContactData);

      setContactData(updatedContactData);
      setIsEditingContact(false);
      alert('Datos de contacto actualizados correctamente.');
    } catch (err) {
      alert('Error al guardar datos de contacto: ' + (err as Error).message);
    } finally {
      setSavingContact(false);
    }
  };

  const handleCancelContact = () => {
    setEditPhone(phone || '');
    setEditWebsite(website || '');
    setEditEmail(email || '');
    setIsEditingContact(false);
  };

  return (
    <div style={{ padding: '24px 40px', color: '#e8eaed', background: '#121212', minHeight: '100vh', fontFamily: "'Roboto', sans-serif" }}>
      
      {/* NAVIGATION */}
      <div style={{ marginBottom: '24px' }}>
        <Link href={getBackLink()} style={{ color: '#8ab4f8', textDecoration: 'none', fontSize: '13px', fontWeight: 500 }}>
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
            <>
              <a
                href={`https://leandrovenegas.cl/video/${lead.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ background: '#4285f4', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                🌐 Ver Landing Page ↗
              </a>
              <button
                onClick={copyLandingUrl}
                style={{
                  background: urlCopied ? 'rgba(52,168,83,0.15)' : '#2d2d2d',
                  border: `1px solid ${urlCopied ? '#34a853' : '#444'}`,
                  color: urlCopied ? '#34a853' : '#e8eaed',
                  borderRadius: '8px',
                  padding: '10px 18px',
                  fontSize: '13px',
                  cursor: 'pointer',
                  fontWeight: 500,
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {urlCopied ? '✓ Copiado' : '🔗 Copiar URL'}
              </button>
            </>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333', paddingBottom: '10px', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 500 }}>
                Datos de Contacto
              </h3>
              {!isEditingContact && (
                <button
                  onClick={() => {
                    // Sync inputs with current state before editing
                    setEditPhone(phone || '');
                    setEditWebsite(website || '');
                    setEditEmail(email || '');
                    setIsEditingContact(true);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#8ab4f8',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(138, 180, 248, 0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  ✏️ Editar
                </button>
              )}
            </div>
            
            {isEditingContact ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ color: '#9aa0a6', display: 'block', marginBottom: '4px', fontSize: '11px' }}>Teléfono</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="Ej: +56912345678"
                    style={{
                      width: '100%',
                      background: '#2d2d2d',
                      border: '1px solid #444',
                      color: '#e8eaed',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <label style={{ color: '#9aa0a6', display: 'block', marginBottom: '4px', fontSize: '11px' }}>Sitio Web</label>
                  <input
                    type="url"
                    value={editWebsite}
                    onChange={(e) => setEditWebsite(e.target.value)}
                    placeholder="Ej: https://mi-sitio.com"
                    style={{
                      width: '100%',
                      background: '#2d2d2d',
                      border: '1px solid #444',
                      color: '#e8eaed',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <label style={{ color: '#9aa0a6', display: 'block', marginBottom: '4px', fontSize: '11px' }}>Email</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="Ej: contacto@negocio.com"
                    style={{
                      width: '100%',
                      background: '#2d2d2d',
                      border: '1px solid #444',
                      color: '#e8eaed',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  <button
                    onClick={handleSaveContact}
                    disabled={savingContact}
                    style={{
                      flex: 1,
                      background: '#34a853',
                      border: 'none',
                      color: 'white',
                      fontWeight: 600,
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                    }}
                  >
                    {savingContact ? 'Guardando...' : '💾 Guardar'}
                  </button>
                  <button
                    onClick={handleCancelContact}
                    disabled={savingContact}
                    style={{
                      background: '#2d2d2d',
                      border: '1px solid #444',
                      color: '#e8eaed',
                      fontWeight: 500,
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
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
            )}
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

            {/* MENSAJE PERSONALIZADO OUTREACH (OVERRIDE) */}
            <div style={{ marginBottom: '20px', borderTop: '1px solid #333', paddingTop: '15px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#e8eaed', marginBottom: '8px', fontWeight: 600 }}>
                💬 Mensajes Outreach Personalizados (Cola)
              </label>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#9aa0a6', marginBottom: '4px' }}>
                    Mensaje 1 (Caption de la Imagen)
                  </label>
                  <textarea
                    value={messageOverride}
                    onChange={(e) => setMessageOverride(e.target.value)}
                    placeholder="Hola [nombre], este mensaje personalizado sobrescribirá el caption..."
                    rows={2}
                    style={{ width: '100%', background: '#2d2d2d', border: '1px solid #444', borderRadius: '8px', color: '#e8eaed', padding: '8px 10px', fontSize: '12.5px', resize: 'vertical', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#9aa0a6', marginBottom: '4px' }}>
                    Mensaje 2 (Texto Separado)
                  </label>
                  <textarea
                    value={messageOverride2}
                    onChange={(e) => setMessageOverride2(e.target.value)}
                    placeholder="🎬 Aquí está: https://leandrovenegas.cl/video/{slug}..."
                    rows={2}
                    style={{ width: '100%', background: '#2d2d2d', border: '1px solid #444', borderRadius: '8px', color: '#e8eaed', padding: '8px 10px', fontSize: '12.5px', resize: 'vertical', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  onClick={async () => {
                    setSavingOverride(true);
                    try {
                      await updateLeadMessageOverride(lead.id, messageOverride.trim() || null, messageOverride2.trim() || null);
                      alert('Mensajes personalizados guardados correctamente.');
                    } catch (e: any) {
                      alert('Error al guardar mensajes: ' + e.message);
                    } finally {
                      setSavingOverride(false);
                    }
                  }}
                  disabled={savingOverride}
                  style={{ background: 'rgba(138, 180, 248, 0.1)', border: '1px solid rgba(138, 180, 248, 0.25)', color: '#8ab4f8', borderRadius: '6px', padding: '8px 16px', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}
                >
                  {savingOverride ? 'Guardando...' : '💾 Guardar Mensajes'}
                </button>
                {(messageOverride || messageOverride2) && (
                  <button
                    onClick={async () => {
                      if(confirm('¿Eliminar mensajes personalizados? Usará la plantilla general.')) {
                        setMessageOverride('');
                        setMessageOverride2('');
                        await updateLeadMessageOverride(lead.id, null, null);
                      }
                    }}
                    style={{ background: 'none', border: 'none', color: '#f28b82', cursor: 'pointer', fontSize: '12px' }}
                  >
                    Eliminar
                  </button>
                )}
              </div>
            </div>

            {/* QUICK OUTREACH ACTIONS */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#9aa0a6', marginBottom: '6px' }}>Acciones de Contacto Rápido</label>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' }}>
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

              {/* WHATSAPP MESSAGE PREVIEW & TEMPLATES */}
              {phone && (
                <div style={{ marginTop: '14px', background: '#2d2d2d', border: '1px solid #3c3c3c', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  
                  {/* Selector & Settings Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                      <span style={{ fontSize: '11px', color: '#9aa0a6', fontWeight: 500, whiteSpace: 'nowrap' }}>
                        Plantilla:
                      </span>
                      <select
                        value={selectedTemplateId}
                        onChange={(e) => handleSelectTemplate(e.target.value)}
                        style={{
                          flex: 1,
                          background: '#1e1e1e',
                          border: '1px solid #444',
                          color: '#e8eaed',
                          borderRadius: '6px',
                          padding: '4px 8px',
                          fontSize: '12px',
                          outline: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        {templates.map((tmpl) => (
                          <option key={tmpl.id} value={tmpl.id}>
                            {tmpl.label}
                          </option>
                        ))}
                        {templates.length === 0 && (
                          <option value="">(Sin plantillas)</option>
                        )}
                      </select>
                    </div>

                    <button
                      onClick={() => setIsManagingTemplates(!isManagingTemplates)}
                      style={{
                        background: isManagingTemplates ? '#333' : 'transparent',
                        border: '1px solid #444',
                        color: '#8ab4f8',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '11px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                      }}
                    >
                      ⚙️ {isManagingTemplates ? 'Cerrar Ajustes' : 'Gestionar'}
                    </button>
                  </div>

                  {/* Template Management Panel */}
                  {isManagingTemplates && (
                    <div style={{ background: '#1e1e1e', border: '1px solid #444', borderRadius: '6px', padding: '10px' }}>
                      <span style={{ display: 'block', fontSize: '11px', color: '#8ab4f8', fontWeight: 600, marginBottom: '8px' }}>
                        Administrador de Plantillas
                      </span>
                      
                      {/* List */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px', maxHeight: '160px', overflowY: 'auto' }}>
                        {templates.map((tmpl) => (
                          <div key={tmpl.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#252525', padding: '6px 8px', borderRadius: '4px', border: '1px solid #333' }}>
                            <span style={{ fontSize: '11.5px', color: '#e8eaed', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>
                              {tmpl.label}
                            </span>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                onClick={() => handleStartEdit(tmpl)}
                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '11px', padding: '2px' }}
                                title="Editar"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleDeleteTemplate(tmpl.id)}
                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '11px', padding: '2px' }}
                                title="Eliminar"
                              >
                                ❌
                              </button>
                            </div>
                          </div>
                        ))}
                        {templates.length === 0 && (
                          <span style={{ fontSize: '11px', color: '#666', fontStyle: 'italic', padding: '4px 0' }}>
                            No hay plantillas personalizadas.
                          </span>
                        )}
                      </div>

                      {/* Add Button */}
                      {!editingTemplate && (
                        <button
                          onClick={handleStartAdd}
                          style={{
                            width: '100%',
                            background: '#2d2d2d',
                            border: '1px dashed #555',
                            color: '#bdc1c6',
                            borderRadius: '4px',
                            padding: '5px',
                            fontSize: '11px',
                            cursor: 'pointer',
                            textAlign: 'center'
                          }}
                        >
                          ➕ Agregar Plantilla
                        </button>
                      )}

                      {/* Add/Edit Form */}
                      {editingTemplate && (
                        <div style={{ marginTop: '8px', borderTop: '1px solid #333', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <span style={{ fontSize: '10.5px', color: '#9aa0a6', fontWeight: 600 }}>
                            {editingTemplate.id ? 'Editar Plantilla' : 'Nueva Plantilla'}
                          </span>
                          <div>
                            <input
                              type="text"
                              value={formLabel}
                              onChange={(e) => setFormLabel(e.target.value)}
                              placeholder="Nombre/Etapa (Ej: Primer Contacto)"
                              style={{
                                width: '100%',
                                background: '#252525',
                                border: '1px solid #444',
                                color: '#e8eaed',
                                borderRadius: '4px',
                                padding: '4px 8px',
                                fontSize: '11.5px',
                                outline: 'none'
                              }}
                            />
                          </div>
                          <div>
                            <textarea
                              value={formText}
                              onChange={(e) => setFormText(e.target.value)}
                              placeholder="Hola! Escribe tu mensaje aquí..."
                              rows={3}
                              style={{
                                width: '100%',
                                background: '#252525',
                                border: '1px solid #444',
                                color: '#e8eaed',
                                borderRadius: '4px',
                                padding: '6px 8px',
                                fontSize: '11.5px',
                                outline: 'none',
                                resize: 'vertical'
                              }}
                            />
                            <span style={{ fontSize: '9px', color: '#80868b', marginTop: '2px', display: 'block' }}>
                              Escribe <code>[]</code> o <code>( )</code> para reemplazar automáticamente con el nombre de la empresa.
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              onClick={handleSaveTemplateForm}
                              style={{
                                flex: 1,
                                background: '#34a853',
                                border: 'none',
                                color: 'white',
                                borderRadius: '4px',
                                padding: '4px 8px',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              💾 Guardar
                            </button>
                            <button
                              onClick={() => setEditingTemplate(null)}
                              style={{
                                background: '#2d2d2d',
                                border: '1px solid #444',
                                color: '#e8eaed',
                                borderRadius: '4px',
                                padding: '4px 8px',
                                fontSize: '11px',
                                cursor: 'pointer'
                              }}
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Textarea containing final message preview */}
                  <div>
                    <span style={{ display: 'block', fontSize: '11px', color: '#9aa0a6', marginBottom: '4px', fontWeight: 500 }}>
                      Mensaje pre-cargado (personalizable):
                    </span>
                    <textarea
                      value={customMessage}
                      onChange={(e) => handleMessageChange(e.target.value)}
                      rows={4}
                      style={{
                        width: '100%',
                        background: '#1e1e1e',
                        border: '1px solid #444',
                        borderRadius: '6px',
                        color: '#e8eaed',
                        padding: '8px 10px',
                        fontSize: '12px',
                        resize: 'vertical',
                        outline: 'none',
                        fontStyle: 'italic',
                        lineHeight: '1.4'
                      }}
                    />
                  </div>

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
