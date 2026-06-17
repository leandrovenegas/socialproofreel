import { supabase } from "@/lib/supabase/client";
import RubrosClient from "./RubrosClient";

export const dynamic = 'force-dynamic';

export default async function RubrosPage({
  searchParams,
}: {
  searchParams: Promise<{ rubro?: string }>;
}) {
  const { rubro } = await searchParams;

  // Traer rubros para el sidebar
  const { data: rubros } = await supabase
    .from("rubros")
    .select("nombre")
    .order("nombre");

  // Conteo por rubro para el sidebar
  const { data: conteos } = await supabase
    .from("raw_leads")
    .select("rubro")
    .not("rubro", "is", null);

  const conteoPorRubro: Record<string, number> = {};
  for (const r of conteos ?? []) {
    if (r.rubro) conteoPorRubro[r.rubro] = (conteoPorRubro[r.rubro] ?? 0) + 1;
  }

  // Leads del rubro seleccionado (o primero disponible)
  const rubroActivo = rubro || rubros?.[0]?.nombre || null;

  let leads: any[] = [];
  if (rubroActivo) {
    let offset = 0;
    while (true) {
      const { data } = await supabase
        .from("raw_leads")
        .select("id, raw_data, rubro, rubro_confirmado, contact_data")
        .eq("rubro", rubroActivo)
        .range(offset, offset + 999);
      if (!data || data.length === 0) break;
      leads = leads.concat(data);
      if (data.length < 1000) break;
      offset += 1000;
    }

    // Enriquecer con estado de video_queue
    if (leads.length > 0) {
      const leadIds = leads.map((l) => l.id);
      const { data: jobs } = await supabase
        .from("video_queue")
        .select("id, raw_lead_id, status, defectuoso, local_video_path, created_at, execution_time_seconds")
        .in("raw_lead_id", leadIds)
        .order("created_at", { ascending: false });

      // Agrupar el job más reciente por lead
      const jobPorLead: Record<string, any> = {};
      for (const job of jobs ?? []) {
        if (!jobPorLead[job.raw_lead_id]) {
          jobPorLead[job.raw_lead_id] = job;
        }
      }

      leads = leads.map((l) => ({
        ...l,
        video: jobPorLead[l.id] ?? null,
      }));
    }
  }

  return (
    <RubrosClient
      leads={leads}
      rubros={rubros ?? []}
      conteoPorRubro={conteoPorRubro}
      rubroActivo={rubroActivo}
    />
  );
}
