'use client';

import { useTemplate } from './TemplateContext';

export default function VideoPreview() {
  const { config } = useTemplate();

  // Map alignment to flex classes
  const alignmentClasses = {
    top: 'justify-start pt-12',
    center: 'justify-center',
    bottom: 'justify-end pb-12',
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 w-full h-full bg-slate-950/50">
      {/* 9:16 Phone Frame */}
      <div className="relative w-[320px] h-[568px] rounded-[3rem] overflow-hidden border-[10px] border-slate-900 shadow-2xl bg-black">
        
        {/* Background Video (Muted, Loop) */}
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          style={{ 
            filter: `blur(${config.effects.blur}px)`,
            transform: 'scale(1.1)' // Scale slightly to avoid blur edges
          }}
          src="https://assets.mixkit.co/videos/preview/mixkit-abstract-motion-of-colors-34372-large.mp4"
        />

        {/* Dark Overlay for contrast */}
        <div 
          className="absolute inset-0 z-10 transition-opacity duration-300"
          style={{ backgroundColor: `rgba(0,0,0,${config.effects.overlay_darkness})` }}
        />

        {/* Main Content Overlay */}
        <div className={`absolute inset-0 z-20 p-8 flex flex-col ${alignmentClasses[config.layout.alignment]}`}>
          
          <div 
            className="space-y-4 transition-all duration-500"
            style={{ 
              fontFamily: config.typography.family,
              fontWeight: config.typography.weight
            }}
          >
            {/* Badge / Pill */}
            <div 
              className="inline-block px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest text-white shadow-lg backdrop-blur-md"
              style={{ 
                backgroundColor: `${config.colors.secondary}CC`,
                border: `1px solid ${config.colors.primary}33`
              }}
            >
              Customer Testimonial
            </div>

            {/* Testimonial Text */}
            <h2 
              className="leading-tight text-white drop-shadow-xl"
              style={{ 
                fontSize: `${config.typography.size}px`,
                color: config.colors.primary 
              }}
            >
              "This platform completely changed how we handle our social proof. The automation is seamless and the results are premium!"
            </h2>

            {/* User Info */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-700 to-slate-500 border border-white/20" />
              <div>
                <p className="text-sm font-bold text-white">Alex Rivera</p>
                <p className="text-[10px] text-slate-400">CEO at HexClave</p>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Border Glow (Optional flair) */}
        <div 
          className="absolute inset-0 pointer-events-none z-30"
          style={{ 
            boxShadow: `inset 0 0 60px ${config.colors.primary}22`
          }}
        />
      </div>

      <p className="mt-6 text-slate-500 text-xs font-medium">9:16 Visual Canvas Simulator</p>
    </div>
  );
}
