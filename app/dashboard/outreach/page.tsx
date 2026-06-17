import { supabase } from "@/lib/supabase/client";
import OutreachClient from "./OutreachClient";

export const dynamic = 'force-dynamic';

export default async function OutreachPage() {
  // 1. Primero traer los jobs completados con raw_lead_id
  const { data: completedJobs } = await supabase
    .from("video_queue")
    .select("id, raw_lead_id, local_video_path")
    .eq("status", "completed")
    .eq("defectuoso", false)
    .not("raw_lead_id", "is", null);

  const leadIdsConVideo = (completedJobs ?? []).map((j) => j.raw_lead_id);

  if (leadIdsConVideo.length === 0) {
    return <OutreachClient leads={[]} outreachRecords={[]} />;
  }

  // 2. Traer solo esos leads con rubro confirmado
  const { data: leads } = await supabase
    .from("raw_leads")
    .select("id, raw_data, rubro, contact_data")
    .eq("rubro_confirmado", true)
    .in("id", leadIdsConVideo);

  if (!leads || leads.length === 0) {
    return <OutreachClient leads={[]} outreachRecords={[]} />;
  }

  // 3. Mapear video a cada lead
  const jobPorLead: Record<string, any> = {};
  for (const job of completedJobs ?? []) {
    if (!jobPorLead[job.raw_lead_id]) {
      jobPorLead[job.raw_lead_id] = job;
    }
  }

  const leadsListos = leads.map((l) => ({
    ...l,
    video_path: jobPorLead[l.id]?.local_video_path ?? null,
    video_job_id: jobPorLead[l.id]?.id ?? null,
  }));

  // 4. Traer estados de outreach
  const { data: outreachData } = await supabase
    .from("outreach")
    .select("*")
    .in("lead_id", leadsListos.map((l) => l.id));

  return (
    <OutreachClient
      leads={leadsListos}
      outreachRecords={outreachData ?? []}
    />
  );
}
