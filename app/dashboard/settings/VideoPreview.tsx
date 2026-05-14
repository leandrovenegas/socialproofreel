'use client';

interface VideoPreviewProps {
  primaryColor: string;
  fontFamily: string;
  blurLevel: number;
}

export default function VideoPreview({ primaryColor, fontFamily, blurLevel }: VideoPreviewProps) {
  return (
    <div className="flex flex-col items-center justify-center p-6 bg-[#020617] rounded-xl border border-white/5 shadow-2xl">
      <h3 className="text-white/80 font-medium mb-6">Live Preview</h3>
      
      {/* 9:16 Container */}
      <div 
        className="relative w-[270px] h-[480px] rounded-[2rem] overflow-hidden border-[6px] border-slate-800 bg-slate-900 shadow-[0_0_40px_rgba(0,0,0,0.5)]"
        style={{ fontFamily }}
      >
        {/* Mock Video Background */}
        <div className="absolute inset-0 bg-slate-800 object-cover flex items-center justify-center">
          <svg className="w-12 h-12 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </div>

        {/* Blur overlay simulating video processing/glassmorphism */}
        <div 
          className="absolute inset-0 z-10 transition-all duration-300"
          style={{ backdropFilter: `blur(${blurLevel}px)` }}
        />

        {/* Overlay Content */}
        <div className="absolute inset-x-0 bottom-0 z-20 p-5 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
          {/* Aesthetic Pill */}
          <div 
            className="inline-block px-3 py-1 rounded-full text-xs font-semibold mb-3 border border-white/10 text-white backdrop-blur-md shadow-lg"
            style={{ backgroundColor: `${primaryColor}CC` }} // CC for 80% opacity
          >
            New Update
          </div>
          
          <h4 className="text-white font-bold text-xl leading-tight mb-2">
            SocialProofREEL
          </h4>
          <p className="text-white/70 text-sm leading-relaxed mb-4">
            Experience premium dynamic layouts.
          </p>

          {/* Progress / CTA */}
          <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-500" 
              style={{ width: '60%', backgroundColor: primaryColor }}
            />
          </div>
        </div>

        {/* Floating Icons (Glassmorphism) */}
        <div className="absolute top-4 right-4 z-20 flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div 
              key={i} 
              className="w-10 h-10 rounded-full bg-black/20 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/80"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
