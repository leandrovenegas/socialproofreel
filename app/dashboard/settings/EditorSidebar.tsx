'use client';

import { useTemplate } from './TemplateContext';
import { useTransition, useState } from 'react';
import { updateSettingsAction } from '@/app/actions/settings';

export default function EditorSidebar({ settingsId }: { settingsId: string }) {
  const { config, updateConfig } = useTemplate();
  const [isPending, startTransition] = useTransition();
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  const handleSave = () => {
    setSaveStatus('saving');
    startTransition(async () => {
      // Pack the config into FormData as a JSON string
      const formData = new FormData();
      formData.append('id', settingsId);
      formData.append('config', JSON.stringify(config));
      
      // We'll need to update the server action to handle this new structure
      const result = await updateSettingsAction(null, formData);
      
      if (result.success) {
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#020617] border-r border-white/5 w-80 shrink-0">
      <div className="p-6 border-b border-white/5 flex justify-between items-center">
        <h2 className="text-lg font-bold text-white tracking-tight">Editor</h2>
        <button
          onClick={handleSave}
          disabled={isPending}
          className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
            saveStatus === 'success' ? 'bg-emerald-500 text-white' :
            saveStatus === 'error' ? 'bg-red-500 text-white' :
            'bg-white text-black hover:bg-slate-200'
          } disabled:opacity-50`}
        >
          {saveStatus === 'saving' ? 'Saving...' : 
           saveStatus === 'success' ? 'Saved' : 
           saveStatus === 'error' ? 'Error' : 'Save Template'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
        {/* Typography */}
        <section className="space-y-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Typography</h3>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400">Font Family</label>
              <select 
                value={config.typography.family}
                onChange={(e) => updateConfig('typography', { family: e.target.value })}
                className="w-full bg-slate-900 border border-white/10 rounded-md px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="'Inter', sans-serif">Inter</option>
                <option value="'Playfair Display', serif">Playfair Display</option>
                <option value="'Geist', sans-serif">Geist</option>
                <option value="system-ui">System</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400">Size</label>
                <input 
                  type="number" 
                  value={config.typography.size}
                  onChange={(e) => updateConfig('typography', { size: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-white/10 rounded-md px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400">Weight</label>
                <select 
                  value={config.typography.weight}
                  onChange={(e) => updateConfig('typography', { weight: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-md px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="normal">Regular</option>
                  <option value="medium">Medium</option>
                  <option value="bold">Bold</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* Colors */}
        <section className="space-y-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Colors & Style</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs text-slate-400">Primary Color</label>
              <input 
                type="color" 
                value={config.colors.primary}
                onChange={(e) => updateConfig('colors', { primary: e.target.value })}
                className="w-8 h-8 rounded-full border-none bg-transparent cursor-pointer"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-xs text-slate-400">Secondary Color</label>
              <input 
                type="color" 
                value={config.colors.secondary}
                onChange={(e) => updateConfig('colors', { secondary: e.target.value })}
                className="w-8 h-8 rounded-full border-none bg-transparent cursor-pointer"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <label className="text-xs text-slate-400">Overlay Opacity</label>
                <span className="text-[10px] text-slate-500">{config.colors.overlay_opacity}</span>
              </div>
              <input 
                type="range" 
                min="0" max="1" step="0.1"
                value={config.colors.overlay_opacity}
                onChange={(e) => updateConfig('colors', { overlay_opacity: Number(e.target.value) })}
                className="w-full accent-blue-500"
              />
            </div>
          </div>
        </section>

        {/* Positioning */}
        <section className="space-y-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Positioning</h3>
          <div className="grid grid-cols-3 gap-2">
            {(['top', 'center', 'bottom'] as const).map((pos) => (
              <button
                key={pos}
                onClick={() => updateConfig('layout', { alignment: pos })}
                className={`py-2 text-[10px] font-bold rounded-md border transition-all ${
                  config.layout.alignment === pos 
                    ? 'bg-white text-black border-white' 
                    : 'bg-slate-900 text-slate-400 border-white/10 hover:border-white/20'
                }`}
              >
                {pos.toUpperCase()}
              </button>
            ))}
          </div>
        </section>

        {/* Effects */}
        <section className="space-y-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Visual Effects</h3>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <label className="text-xs text-slate-400">Background Blur</label>
                <span className="text-[10px] text-slate-500">{config.effects.blur}px</span>
              </div>
              <input 
                type="range" 
                min="0" max="20" step="1"
                value={config.effects.blur}
                onChange={(e) => updateConfig('effects', { blur: Number(e.target.value) })}
                className="w-full accent-blue-500"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <label className="text-xs text-slate-400">Darkness Overlay</label>
                <span className="text-[10px] text-slate-500">{config.effects.overlay_darkness}</span>
              </div>
              <input 
                type="range" 
                min="0" max="1" step="0.1"
                value={config.effects.overlay_darkness}
                onChange={(e) => updateConfig('effects', { overlay_darkness: Number(e.target.value) })}
                className="w-full accent-blue-500"
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
