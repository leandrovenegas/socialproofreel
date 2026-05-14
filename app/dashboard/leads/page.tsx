import { supabase } from "@/lib/supabase/client";
import { Lead } from "@/lib/types";
import LeadForm from "./LeadForm";
import TriggerButton from "./TriggerButton";

export const revalidate = 0; // Disable static rendering for this page

export default async function LeadsPage() {
  const { data: leads, error } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching leads:", error);
  }

  const leadsList = (leads as Lead[]) || [];

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Leads Database</h1>
          <p className="text-slate-400 mt-2 text-lg">Manage your collected testimonials and trigger video generation.</p>
        </div>
        
        <LeadForm />
      </div>

      <div className="bg-[#020617] border border-white/5 rounded-xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900/50 text-slate-400 border-b border-white/5">
              <tr>
                <th className="px-6 py-4 font-medium">Profile</th>
                <th className="px-6 py-4 font-medium">Contact</th>
                <th className="px-6 py-4 font-medium">Testimonial</th>
                <th className="px-6 py-4 font-medium">Added</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {leadsList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    No leads found. Add one to get started.
                  </td>
                </tr>
              ) : (
                leadsList.map((lead) => (
                  <tr key={lead.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {lead.avatar_url ? (
                          <img src={lead.avatar_url} alt={lead.name} className="w-10 h-10 rounded-full object-cover border border-white/10" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-slate-400 font-bold">
                            {lead.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-white">{lead.name}</div>
                          {lead.company && <div className="text-xs text-slate-400">{lead.company}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      {lead.email}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-slate-300 line-clamp-2 max-w-xs" title={lead.testimonial}>
                        {lead.testimonial || <span className="text-slate-600 italic">No testimonial provided</span>}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-slate-400 whitespace-nowrap">
                      {new Date(lead.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <TriggerButton leadId={lead.id} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
