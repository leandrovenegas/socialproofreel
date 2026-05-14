import { supabase } from "@/lib/supabaseClient";
import { useState, useEffect } from "react";

// Types for settings
type Settings = {
  id: string;
  primary_color: string;
  font_family: string;
  blur_level: number;
};

// Server action to fetch settings
export async function fetchSettings() {
  const { data, error } = await supabase
    .from("settings")
    .select("*")
    .limit(1)
    .single();

  if (error) {
    console.error("Error fetching settings:", error);
    throw error;
  }
  return data;
}

// Server action to update settings
export async function updateSettings(settings: Settings) {
  const { data, error } = await supabase
    .from("settings")
    .update({
      primary_color: settings.primary_color,
      font_family: settings.font_family,
      blur_level: settings.blur_level,
    })
    .eq("id", settings.id);

  if (error) {
    console.error("Error updating settings:", error);
    throw error;
  }
  return data;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch settings on mount
  useEffect(() => {
    async function loadSettings() {
      try {
        const data = await fetchSettings();
        setSettings(data);
      } catch (err) {
        setError("Failed to load settings");
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!settings) return <div>No settings found</div>;

  // Handle form submit
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const updatedSettings = {
      ...settings,
      primary_color: formData.get("primary_color") as string,
      font_family: formData.get("font_family") as string,
      blur_level: Number(formData.get("blur_level")),
    };

    try {
      await updateSettings(updatedSettings);
      setSettings(updatedSettings);
      // Optionally show a success message
    } catch (err) {
      setError("Failed to update settings");
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Primary Color</label>
          <input
            type="color"
            value={settings.primary_color}
            onChange={(e) => {
              setSettings((prev) => ({ ...prev, primary_color: e.target.value }));
            }}
            className="w-16 h-16 p-0 border-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Font Family</label>
          <select
            value={settings.font_family}
            onChange={(e) => {
              setSettings((prev) => ({ ...prev, font_family: e.target.value }));
            }}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="system-ui, sans-serif">System UI</option>
            <option value="'Inter', sans-serif">Inter</option>
            <option value="'Georgia', serif">Georgia</option>
            <option value="'Courier New', monospace">Courier New</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Blur Level</label>
          <input
            type="range"
            min="0"
            max="20"
            value={settings.blur_level}
            onChange={(e) => {
              setSettings((prev) => ({ ...prev, blur_level: Number(e.target.value) }));
            }}
            className="w-full"
          />
          <div className="flex justify-between text-sm">
            <span>0</span>
            <span>20</span>
          </div>
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        >
          Save Settings
        </button>
      </form>

      {/* CSS Preview Component */}
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">Preview</h2>
        <div
          className="w-64 h-[114px] border-2 border-dashed border-gray-300 rounded overflow-hidden relative"
          style={{
            backgroundColor: settings.primary_color,
            fontFamily: settings.font_family,
            filter: `blur(${settings.blur_level}px)`,
          }}
        >
          {/* This is a placeholder for the video preview */}
          <div className="absolute inset-0 flex items-center justify-center text-white text-center">
            Video Preview (9:16)
          </div>
        </div>
      </div>
    </div>
  );
}