import { supabase } from "@/lib/supabase/client";
import SettingsClient from "./SettingsClient";
import { Settings } from "@/lib/types";

export default async function SettingsPage() {
  // Ideally, use a server client. For now using the existing client.
  // In a real app, you should handle authentication and get the user's specific settings.
  const { data, error } = await supabase
    .from("settings")
    .select("*")
    .limit(1)
    .single();

  // Provide a fallback if no settings exist in DB yet
  const initialSettings: Settings = data || {
    id: "default-id",
    created_at: new Date().toISOString(),
    primary_color: "#3B82F6",
    font_family: "'Inter', sans-serif",
    blur_level: 8,
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight">Canvas Settings</h1>
        <p className="text-slate-400 mt-2 text-lg">Configure your brand assets and visual canvas preferences.</p>
      </div>

      <SettingsClient initialSettings={initialSettings} />
    </div>
  );
}
