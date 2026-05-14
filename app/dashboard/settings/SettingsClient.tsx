'use client';

import { TemplateProvider } from './TemplateContext';
import EditorSidebar from './EditorSidebar';
import VideoPreview from './VideoPreview';
import { Settings, TemplateConfig } from '@/lib/types';

interface SettingsClientProps {
  initialSettings: Settings;
}

export default function SettingsClient({ initialSettings }: SettingsClientProps) {
  // Convert old flat settings to the new TemplateConfig structure if needed
  // or use the stored config if it exists
  const initialConfig: TemplateConfig = initialSettings.config || {
    typography: {
      family: initialSettings.font_family || "'Inter', sans-serif",
      size: 24,
      weight: 'bold',
    },
    colors: {
      primary: initialSettings.primary_color || '#3B82F6',
      secondary: '#1E293B',
      overlay_opacity: 0.4,
    },
    layout: {
      alignment: 'bottom',
    },
    effects: {
      blur: initialSettings.blur_level || 8,
      overlay_darkness: 0.6,
    },
  };

  return (
    <TemplateProvider initialConfig={initialConfig}>
      <div className="flex h-[calc(100vh-12rem)] bg-[#020617] rounded-2xl border border-white/5 shadow-2xl overflow-hidden">
        {/* Sidebar Controls */}
        <EditorSidebar settingsId={initialSettings.id} />

        {/* Main Canvas Area */}
        <main className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 relative overflow-auto custom-scrollbar">
            <VideoPreview />
          </div>
          
          {/* Bottom Info Bar */}
          <div className="p-4 border-t border-white/5 bg-slate-950/50 flex justify-between items-center px-8">
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] text-slate-400 font-medium">WYSIWYG Mode Active</span>
              </div>
            </div>
            <span className="text-[10px] text-slate-500">Press 'Save Template' to apply changes to all generated videos</span>
          </div>
        </main>
      </div>
    </TemplateProvider>
  );
}
