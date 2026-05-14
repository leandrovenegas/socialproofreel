'use client';

import { useState, useTransition } from 'react';
import VideoPreview from './VideoPreview';
import { updateSettingsAction } from '@/app/actions/settings';
import { Settings } from '@/lib/types';

interface SettingsClientProps {
  initialSettings: Settings;
}

export default function SettingsClient({ initialSettings }: SettingsClientProps) {
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.append('id', settings.id);
    
    startTransition(async () => {
      setStatus(null);
      const result = await updateSettingsAction(null, formData);
      if (result.success) {
        setStatus({ type: 'success', message: 'Settings updated successfully.' });
      } else {
        setStatus({ type: 'error', message: result.error || 'Failed to update.' });
      }
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: name === 'blur_level' ? Number(value) : value
    }));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
      {/* Form Container */}
      <div className="p-6 bg-[#020617] rounded-xl border border-white/5 shadow-xl">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white">Visual Settings</h2>
          <p className="text-slate-400 text-sm mt-1">Customize the aesthetic of your generated videos.</p>
        </div>

        {status && (
          <div className={`p-3 rounded-lg mb-6 text-sm ${status.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
            {status.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Primary Color */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">Primary Color</label>
            <div className="flex items-center gap-4">
              <div 
                className="w-10 h-10 rounded-lg border border-white/10 shadow-inner overflow-hidden flex-shrink-0"
                style={{ backgroundColor: settings.primary_color }}
              >
                <input
                  type="color"
                  name="primary_color"
                  value={settings.primary_color}
                  onChange={handleChange}
                  className="opacity-0 w-full h-full cursor-pointer"
                />
              </div>
              <input
                type="text"
                name="primary_color"
                value={settings.primary_color}
                onChange={handleChange}
                className="flex-1 bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
                required
              />
            </div>
          </div>

          {/* Font Family */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">Font Family</label>
            <select
              name="font_family"
              value={settings.font_family}
              onChange={handleChange}
              className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none"
            >
              <option value="'Inter', sans-serif">Inter</option>
              <option value="'Geist', sans-serif">Geist</option>
              <option value="system-ui, sans-serif">System Default</option>
            </select>
          </div>

          {/* Blur Level */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="block text-sm font-medium text-slate-300">Blur Level</label>
              <span className="text-slate-400 text-sm">{settings.blur_level}px</span>
            </div>
            <input
              type="range"
              name="blur_level"
              min="0"
              max="20"
              step="1"
              value={settings.blur_level}
              onChange={handleChange}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-white text-black font-semibold py-2.5 px-4 rounded-lg hover:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Preview Container */}
      <div className="sticky top-6">
        <VideoPreview
          primaryColor={settings.primary_color}
          fontFamily={settings.font_family}
          blurLevel={settings.blur_level}
        />
      </div>
    </div>
  );
}
