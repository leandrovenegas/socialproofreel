"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type VideoJob = {
  id: string;
  status: string;
  defectuoso: boolean;
  local_video_path: string | null;
  created_at: string;
  execution_time_seconds: number | null;
};

type Lead = {
  id: string;
  raw_data: {
    name: string;
    rating: number;
    reviews: number;
    url: string;
  };
  rubro: string;
  rubro_confirmado: boolean;
  contact_data: {
    phone: string | null;
    website: string | null;
  } | null;
  video: VideoJob | null;
};

type Rubro = { nombre: string };

export default function RubrosClient({
  leads,
  rubros,
  conteoPorRubro,
  rubroActivo,
}: {
  leads: Lead[];
  rubros: Rubro[];
  conteoPorRubro: Record<string, number>;
  rubroActivo: string | null;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [nuevoRubro, setNuevoRubro] = useState("");
  const [creandoRubro, setCreandoRubro] = useState(false);

  function cambiarRubro(rubro: string) {
    setSeleccionados(new Set());
    startTransition(() => {
      router.push(`/dashboard/rubros?rubro=${encodeURIComponent(rubro)}`);
    });
  }

  function toggleSeleccion(id: string) {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleTodos() {
    // Solo seleccionar leads sin video pendiente/rendering
    const elegibles = leads.filter(
      (l) => !l.video || ["completed", "failed"].includes(l.video.status)
    );
    if (seleccionados.size === elegibles.length) {
      setSeleccionados(new Set());
    } else {
      setSeleccionados(new Set(elegibles.map((l) => l.id)));
    }
  }

  async function enviarAQueue() {
    if (seleccionados.size === 0) return;
    setEnviando(true);

    const leadsSeleccionados = leads.filter((l) => seleccionados.has(l.id));
    const jobs = leadsSeleccionados.map((l) => ({
      raw_lead_id: l.id,
      business_name: l.raw_data.name,
      maps_url: l.raw_data.url,
      status: "pending",
    }));

    const { error } = await supabase.from("video_queue").insert(jobs);

    if (error) {
      setMensaje({ tipo: "error", texto: "Error al agregar a la cola" });
    } else {
      setMensaje({ tipo: "ok", texto: `${seleccionados.size} negocios enviados a render` });
      setSeleccionados(new Set());
      // Refrescar para ver el nuevo estado de video
      startTransition(() => router.refresh());
    }
    setEnviando(false);
    setTimeout(() => setMensaje(null), 3000);
  }

  async function crearRubro() {
    if (!nuevoRubro.trim()) return;
    setCreandoRubro(true);
    await supabase.from("rubros").insert({ nombre: nuevoRubro.trim() });
    setNuevoRubro("");
    setCreandoRubro(false);
    startTransition(() => router.refresh());
  }

  function getVideoEstado(video: VideoJob | null) {
    if (!video) return null;
    if (video.defectuoso) return { label: "Defectuoso", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" };
    switch (video.status) {
      case "pending": return { label: "En cola", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" };
      case "fetching_data": return { label: "Buscando info", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" };
      case "rendering": return { label: "Renderizando", color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" };
      case "completed": return { label: "Video listo ✓", color: "text-green-400", bg: "bg-green-500/10 border-green-500/20" };
      case "failed": return { label: "Falló", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" };
      default: return null;
    }
  }

  const elegibles = leads.filter(
    (l) => !l.video || ["completed", "failed"].includes(l.video.status)
  );

  return (
    <div className="min-h-screen bg-[#020617] text-[#ededed] flex">
      {/* Sidebar */}
      <aside className="w-60 border-r border-white/10 p-4 flex flex-col gap-1 shrink-0 overflow-y-auto">
        <p className="text-xs text-white/40 uppercase tracking-widest mb-3 font-mono">Rubros</p>

        {rubros.map((r) => (
          <button
            key={r.nombre}
            onClick={() => cambiarRubro(r.nombre)}
            className={`flex justify-between items-center px-3 py-2 rounded text-sm transition-colors ${
              rubroActivo === r.nombre
                ? "bg-white/10 text-white"
                : "text-white/50 hover:text-white hover:bg-white/5"
            }`}
          >
            <span className="truncate">{r.nombre}</span>
            <span className="text-xs text-white/30">{conteoPorRubro[r.nombre] ?? 0}</span>
          </button>
        ))}

        <div className="border-t border-white/10 mt-2 pt-3 flex flex-col gap-2">
          <input
            type="text"
            value={nuevoRubro}
            onChange={(e) => setNuevoRubro(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && crearRubro()}
            placeholder="Nuevo rubro..."
            className="bg-white/5 border border-white/10 rounded px-3 py-1.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
          />
          <button
            onClick={crearRubro}
            disabled={creandoRubro || !nuevoRubro.trim()}
            className="bg-white/10 hover:bg-white/20 disabled:opacity-30 px-3 py-1.5 rounded text-sm transition-colors"
          >
            {creandoRubro ? "Creando..." : "Crear rubro"}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold">{rubroActivo ?? "Rubros"}</h1>
            <p className="text-xs text-white/30 font-mono">{leads.length} negocios</p>
          </div>

          <div className="flex items-center gap-3">
            {mensaje && (
              <span className={`text-xs px-3 py-1.5 rounded border ${
                mensaje.tipo === "ok"
                  ? "bg-green-500/10 border-green-500/30 text-green-400"
                  : "bg-red-500/10 border-red-500/30 text-red-400"
              }`}>
                {mensaje.texto}
              </span>
            )}

            {seleccionados.size > 0 && (
              <button
                onClick={enviarAQueue}
                disabled={enviando}
                className="bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 px-4 py-1.5 rounded text-sm transition-colors disabled:opacity-50"
              >
                {enviando ? "Enviando..." : `🎬 Renderizar ${seleccionados.size} videos`}
              </button>
            )}
          </div>
        </div>

        {/* Tabla */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-white/30 border-b border-white/10 text-xs uppercase tracking-wider">
                <th className="pb-3 pr-4 w-8">
                  <input
                    type="checkbox"
                    checked={seleccionados.size === elegibles.length && elegibles.length > 0}
                    onChange={toggleTodos}
                    className="accent-cyan-500"
                  />
                </th>
                <th className="pb-3 pr-4">Negocio</th>
                <th className="pb-3 pr-4 w-20 text-center">Rating</th>
                <th className="pb-3 pr-4 w-24 text-center">Reseñas</th>
                <th className="pb-3 pr-4 w-32">Contacto</th>
                <th className="pb-3 w-36">Video</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {leads.map((lead) => {
                const videoEstado = getVideoEstado(lead.video);
                const enProceso = lead.video && ["pending", "fetching_data", "rendering"].includes(lead.video.status);

                return (
                  <tr
                    key={lead.id}
                    className={`transition-colors ${seleccionados.has(lead.id) ? "bg-white/5" : "hover:bg-white/3"}`}
                  >
                    <td className="py-3 pr-4">
                      <input
                        type="checkbox"
                        checked={seleccionados.has(lead.id)}
                        onChange={() => toggleSeleccion(lead.id)}
                        disabled={!!enProceso}
                        className="accent-cyan-500 disabled:opacity-30"
                      />
                    </td>

                    <td className="py-3 pr-4">
                      <a
                        href={lead.raw_data.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-cyan-400 transition-colors"
                      >
                        {lead.raw_data.name}
                      </a>
                    </td>

                    <td className="py-3 pr-4 text-center">
                      <span className="text-amber-400">★</span>{" "}
                      <span className="text-white/70">{lead.raw_data.rating}</span>
                    </td>

                    <td className="py-3 pr-4 text-center text-white/50">
                      {lead.raw_data.reviews}
                    </td>

                    <td className="py-3 pr-4">
                      {lead.contact_data?.phone ? (
                        <span className="text-xs text-white/40 font-mono">{lead.contact_data.phone}</span>
                      ) : (
                        <span className="text-xs text-white/20">—</span>
                      )}
                    </td>

                    <td className="py-3">
                      {videoEstado ? (
                        <div className="flex flex-col gap-1">
                          <span className={`text-xs px-2 py-0.5 rounded border inline-block w-fit ${videoEstado.bg} ${videoEstado.color}`}>
                            {videoEstado.label}
                          </span>
                          {lead.video?.local_video_path && (
                            <span className="text-xs text-white/20 font-mono truncate max-w-32" title={lead.video.local_video_path}>
                              {lead.video.local_video_path.split("/").pop()}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-white/20">Sin video</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {leads.length === 0 && (
            <div className="text-center text-white/30 py-16 text-sm">
              Selecciona un rubro del sidebar
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
