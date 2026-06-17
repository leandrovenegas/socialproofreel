'use client';

import { Player } from '@remotion/player';
import { useTemplate } from './TemplateContext';
import { VideoTemplate } from './VideoTemplate';

export default function VideoPreview() {
  const { config } = useTemplate();

  // Mock metadata para la vista previa en el Frontend
  const mockMetadata = {
    business_name: "HexClave Solutions",
    overall_rating: 4.9,
    // Usamos imágenes estáticas de placeholder para que se vean en el WYSIWYG
    background_base64: "https://images.unsplash.com/photo-1557682250-33bd709cbe85?q=80&w=1080", 
    reviews: [
      {
        reviewer_name: "Alex Rivera",
        rating: 5,
        review_text: "This platform completely changed how we handle our social proof. The automation is seamless and the results are premium!",
        avatar_base64: "https://ui-avatars.com/api/?name=Alex+Rivera&background=random&size=300"
      }
    ]
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 w-full h-full bg-slate-950/50">
      {/* 9:16 Phone Frame */}
      <div className="relative w-[320px] h-[568px] rounded-[3rem] overflow-hidden border-[10px] border-slate-900 shadow-2xl bg-black flex items-center justify-center">
        <Player
          component={VideoTemplate}
          inputProps={{
            config: config,
            metadata: mockMetadata
          }}
          durationInFrames={150}
          compositionWidth={1080}
          compositionHeight={1920}
          fps={30}
          style={{
            width: '100%',
            height: '100%',
          }}
          controls
          autoPlay
          loop
        />
      </div>

      <p className="mt-6 text-slate-500 text-xs font-medium">9:16 Visual Canvas Simulator (Remotion)</p>
    </div>
  );
}
