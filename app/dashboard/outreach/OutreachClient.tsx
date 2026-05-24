"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Lead = {
  id: string;
  raw_data: {
    name: string;
    rating: number;
    reviews: number;
    url: string;
  };
  rubro: string;
  contact_data: {
    phone: string | null;
    phone_international: string | null;
    website: string | null;
  } | null;
  video_path: string | null;
  video_job_id: string | null;
};

type OutreachRecord = {
  id: string;
  lead_id: string;
  canal: "email" | "whatsapp" | "rrss";
  estado: string;
  notas: string | null;
};

const ESTADOS = ["pendiente", "contactado", "respondió", "cerrado", "no interesado"];

export default function OutreachClient({
  leads,
  outreachRecords: initialRecords,
}: {
  leads: Lead[];
  outreachRecords: OutreachRecord[];
}) {
  const [records, setRecords] = useState<OutreachRecord[]>(initialRecords);
  const [enriching, setEnriching] = useState<string | null>(null);
  const [localLeads, setLocalLeads] = useState<Lead[]>(leads);
  const [filtroRubro, setFiltroRubro] = useState<string>("todos");
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [notasModal, setNotasModal] = useState<{ leadId: string; recordId: string | null; notas: string } | null>(null);

  const rubros = [...new Set(leads.map((l) => l.rubro).filter(Boolean))];

  const leadsFiltrados = localLeads.filter((lead) => {
    const record = records.find((r) => r.lead_id === lead.id);
    const estado = record?.estado ?? "pendiente";

    const pasaRubro = filtroRubro === "todos" || lead.rubro === filtroRubro;
    const pasaEstado = filtroEstado === "todos" || estado === filtroEstado;
    return pasaRubro && pasaEstado;
  });

  async function enriquecer(leadId: string) {
    setEnriching(leadId);
    try {
      const res = await fetch(`/api/enrich-lead/${leadId}`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setLocalLeads((prev) =>
          prev.map((l) =>
            l.id === leadId ? { ...l, contact_data: data.contact_data } : l
          )
        );
      }
    } catch (e) {
      console.error(e);
    }
    setEnriching(null);
  }

  async function actualizarEstado(leadId: string, canal: OutreachRecord["canal"], estado: string) {
    const existing = records.find((r) => r.lead_id === leadId);

    if (existing) {
      const { error } = await supabase
        .from("outreach")
        .update({ canal, estado })
        .eq("id", existing.id);

      if (!error) {
        setRecords((prev) =>
          prev.map((r) => (r.id === existing.id ? { ...r, canal, estado } : r))
        );
      }
    } else {
      const { data, error } = await supabase
        .from("outreach")
        .insert({ lead_id: leadId, canal, estado })
        .select()
        .single();

      if (!error && data) {
        setRecords((prev) => [...prev, data as OutreachRecord]);
      }
    }
  }

  async function guardarNotas() {
    if (!notasModal) return;
    const { leadId, recordId, notas } = notasModal;

    if (recordId) {
      await supabase.from("outreach").update({ notas }).eq("id", recordId);
      setRecords((prev) =>
        prev.map((r) => (r.id === recordId ? { ...r, notas } : r))
      );
    } else {
      const { data } = await supabase
        .from("outreach")
        .insert({ lead_id: leadId, canal: "whatsapp", estado: "pendiente", notas })
        .select()
        .single();
      if (data) setRecords((prev) => [...prev, data as OutreachRecord]);
    }
    setNotasModal(null);
  }

  function whatsappUrl(phone: string | null, businessName: string) {
    if (!phone) return null;
    const number = phone.replace(/\D/g, "");
    const msg = encodeURIComponent(
      `Hola! Te contactamos desde SocialProofREEL. Generamos un video con las reseñas de ${businessName} en Google Maps. ¿Te gustaría verlo?`
    );
    return `https://wa.me/${number}?text=${msg}`;
  }

  return (
    <div className="min-h-screen bg-[#020617] text-[#ededed] flex">
      {/* Sidebar */}
      <aside className="w-56 border-r border-white/10 p-4 flex flex-col gap-1 shrink-0">
        <p className="text-xs text-white/40 uppercase tracking-widest mb-3 font-mono">Rubros</p>

        <button
          onClick={() => setFiltroRubro("todos")}
          className={`text-left px-3 py-2 rounded text-sm transition-colors ${filtroRubro === "todos" ? "bg-white/10 text-white" : "text-white/50 hover:text-white hover:bg-white/5"}`}
        >
          Todos
        </button>

        {rubros.map((r) => (
          <button
            key={r}
            onClick={() => setFiltroRubro(r)}
            className={`text-left px-3 py-2 rounded text-sm truncate transition-colors ${filtroRubro === r ? "bg-white/10 text-white" : "text-white/50 hover:text-white hover:bg-white/5"}`}
          >
            {r}
          </button>
        ))}

        <div className="border-t border-white/10 my-2" />

        <p className="text-xs text-white/40 uppercase tracking-widest mb-2 font-mono">Estado</p>
        {["todos", ...ESTADOS].map((e) => (
          <button
            key={e}
            onClick={() => setFiltroEstado(e)}
            className={`text-left px-3 py-2 rounded text-sm transition-colors ${filtroEstado === e ? "bg-white/10 text-white" : "text-white/50 hover:text-white hover:bg-white/5"}`}
          >
            {e}
          </button>
        ))}
      </aside>

      {/* Main */}
      <div className="flex-1 overflow-y-auto">
        {/* Modal notas */}
        {notasModal && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
            <div className="bg-[#1e1e1e] border border-white/10 rounded-xl p-6 w-96 flex flex-col gap-4">
              <h3 className="text-sm font-semibold">Notas de contacto</h3>
              <textarea
                value={notasModal.notas}
                onChange={(e) => setNotasModal({ ...notasModal, notas: e.target.value })}
                rows={4}
                placeholder="Observaciones, respuestas, seguimiento..."
                className="bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-white/30"
              />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setNotasModal(null)} className="px-4 py-1.5 rounded bg-white/5 text-sm text-white/50">Cancelar</button>
                <button onClick={guardarNotas} className="px-4 py-1.5 rounded bg-white/10 text-sm text-white">Guardar</button>
              </div>
            </div>
          </div>
        )}

        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Outreach</h1>
            <p className="text-xs text-white/30 font-mono">{leadsFiltrados.length} leads con video listo</p>
          </div>
        </div>

        <div className="p-6 flex flex-col gap-3">
          {leadsFiltrados.map((lead) => {
            const record = records.find((r) => r.lead_id === lead.id);
            const estado = record?.estado ?? "pendiente";
            const waUrl = whatsappUrl(lead.contact_data?.phone_international ?? lead.contact_data?.phone ?? null, lead.raw_data.name);

            return (
              <div
                key={lead.id}
                className="bg-white/3 border border-white/8 rounded-xl p-4 flex flex-col gap-3"
              >
                {/* Row 1: info */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-sm">{lead.raw_data.name}</p>
                    <p className="text-xs text-white/40 mt-0.5">{lead.rubro} · ★ {lead.raw_data.rating} · {lead.raw_data.reviews} reseñas</p>
                  </div>

                  {/* Estado badge */}
                  <select
                    value={estado}
                    onChange={(e) =>
                      actualizarEstado(lead.id, record?.canal ?? "whatsapp", e.target.value)
                    }
                    className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none shrink-0"
                  >
                    {ESTADOS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* Row 2: contacto */}
                <div className="flex items-center gap-3 flex-wrap">
                  {!lead.contact_data ? (
                    <button
                      onClick={() => enriquecer(lead.id)}
                      disabled={enriching === lead.id}
                      className="text-xs px-3 py-1.5 rounded border border-white/20 text-white/60 hover:text-white hover:border-white/40 transition-colors disabled:opacity-40"
                    >
                      {enriching === lead.id ? "Buscando..." : "🔍 Enriquecer contacto"}
                    </button>
                  ) : (
                    <>
                      {lead.contact_data.phone && (
                        <span className="text-xs text-white/50 font-mono">{lead.contact_data.phone}</span>
                      )}

                      {waUrl && (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => actualizarEstado(lead.id, "whatsapp", "contactado")}
                          className="text-xs px-3 py-1.5 rounded bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 transition-colors"
                        >
                          WhatsApp ↗
                        </a>
                      )}

                      {lead.contact_data.website && (
                        <a
                          href={lead.contact_data.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs px-3 py-1.5 rounded bg-white/5 border border-white/10 text-white/60 hover:text-white transition-colors"
                        >
                          Web ↗
                        </a>
                      )}

                      {!lead.contact_data.phone && !lead.contact_data.website && (
                        <span className="text-xs text-white/30 italic">Sin datos de contacto</span>
                      )}
                    </>
                  )}

                  <a
                    href={lead.raw_data.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-white/30 hover:text-white/60 transition-colors"
                  >
                    Google Maps ↗
                  </a>

                  <button
                    onClick={() =>
                      setNotasModal({
                        leadId: lead.id,
                        recordId: record?.id ?? null,
                        notas: record?.notas ?? "",
                      })
                    }
                    className="text-xs text-white/30 hover:text-white/60 transition-colors ml-auto"
                  >
                    {record?.notas ? "📝 Ver notas" : "+ Notas"}
                  </button>
                </div>

                {/* Video path */}
                {lead.video_path && (
                  <p className="text-xs text-white/20 font-mono truncate">
                    {lead.video_path.split("/").pop()}
                  </p>
                )}
              </div>
            );
          })}

          {leadsFiltrados.length === 0 && (
            <div className="text-center text-white/30 py-16 text-sm">
              No hay leads con video listo en este filtro.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
