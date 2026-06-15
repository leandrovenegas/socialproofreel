import React from 'react';
import { AbsoluteFill, Img, useVideoConfig, useCurrentFrame, interpolate } from 'remotion';

// Definición de Props que coincide con lo que el frontend genera en Supabase
export interface VideoTemplateProps {
  config: {
    colors?: {
      primary?: string;
      secondary?: string;
      overlay_opacity?: number;
    };
    layout?: {
      alignment?: string;
    };
    effects?: {
      blur?: number;
      overlay_darkness?: number;
    };
    typography?: {
      size?: number;
      family?: string;
      weight?: string;
    };
  };
  metadata: {
    business_name: string;
    overall_rating: number;
    background_local_path?: string; // Para el render en Ubuntu
    background_base64?: string;     // Imagen codificada en base64 para evitar problemas de red/CORS
    reviews: Array<{
      reviewer_name: string;
      rating: number;
      review_text: string;
      avatar_local_path?: string; // Para el render en Ubuntu
      avatar_base64?: string;     // Imagen codificada en base64 para evitar problemas de red/CORS
    }>;
  };
}

export const VideoTemplate: React.FC<VideoTemplateProps> = ({ config, metadata }) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();

  // Animación simple de fade in
  const opacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: 'clamp' });

  // Valores por defecto
  const blur = config.effects?.blur ?? 5;
  const primaryColor = config.colors?.primary || '#FBBC04';
  const fontFamily = config.typography?.family || 'sans-serif';
  const overlayDarkness = config.effects?.overlay_darkness ?? 0.4;
  
  // Posicionamiento
  const align = config.layout?.alignment?.toLowerCase() || 'center';
  const layoutClass = align === 'top' ? 'justify-start pt-40' : 
                      align === 'bottom' ? 'justify-end pb-40' : 
                      'justify-center';

  // Reseña actual a mostrar (por ahora mostramos la primera para el ejemplo)
  const review = metadata.reviews[0] || {};

  // Resolver fuentes de imagen (preferir base64 para evitar bloqueos CORS en navegadores/headless)
  const backgroundSrc = metadata.background_base64 || (metadata.background_local_path ? `file://${metadata.background_local_path}` : undefined);
  const avatarSrc = review.avatar_base64 || (review.avatar_local_path ? `file://${review.avatar_local_path}` : undefined);

  return (
    <AbsoluteFill style={{ backgroundColor: '#0f0f1a', fontFamily, opacity }}>
      {/* Fondo Desenfocado (Background Blur) */}
      {backgroundSrc && (
        <AbsoluteFill>
          <Img 
            src={backgroundSrc} 
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover',
              filter: `blur(${blur}px)` 
            }} 
          />
          {/* Overlay Oscuro */}
          <AbsoluteFill style={{ backgroundColor: `rgba(0,0,0,${overlayDarkness})` }} />
        </AbsoluteFill>
      )}

      {/* Contenido Principal */}
      <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'white' }} className={layoutClass}>
        
        {/* Avatar */}
        {avatarSrc && (
          <Img 
            src={avatarSrc} 
            style={{ width: 300, height: 300, borderRadius: '50%', marginBottom: 40 }} 
          />
        )}

        {/* Autor */}
        <h1 style={{ fontSize: 60, fontWeight: 'bold', marginBottom: 20 }}>
          {review.reviewer_name || 'Usuario'}
        </h1>

        {/* Estrellas */}
        <div style={{ fontSize: 50, color: primaryColor, marginBottom: 40 }}>
          {'★'.repeat(review.rating || 5)}{'☆'.repeat(5 - (review.rating || 5))}
        </div>

        {/* Texto del Testimonio */}
        <p style={{ fontSize: 50, textAlign: 'center', maxWidth: 800, lineHeight: 1.4 }}>
          "{review.review_text}"
        </p>
        
        {/* Nombre del Local (Fijo abajo) */}
        <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 100 }}>
          <h2 style={{ fontSize: 40, fontWeight: 'bold' }}>{metadata.business_name}</h2>
          <p style={{ fontSize: 30, color: primaryColor }}>{metadata.overall_rating} ★ en Google</p>
        </AbsoluteFill>

      </AbsoluteFill>
    </AbsoluteFill>
  );
};
