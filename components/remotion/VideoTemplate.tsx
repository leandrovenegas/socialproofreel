import React from 'react';
import { AbsoluteFill, useVideoConfig, useCurrentFrame, interpolate, spring } from 'remotion';

export interface ComponentItem {
  id: 'avatar' | 'reviewer_name' | 'business_name' | 'review_text' | 'stars';
  label: string;
  visible: boolean;
}

export interface VideoTemplateConfig {
  primary_color: string;
  blur_level: number;
  font_family: string;
  layout: 'Top' | 'Center' | 'Bottom';
  avatar_size: number;        // percentage (100 = default)
  review_text_size: number;   // px
  reviewer_name_size: number; // px
  business_name_size: number; // px
  component_order: ComponentItem[];
}

export interface VideoTemplateMetadata {
  business_name: string;
  overall_rating: number;
  review_text: string;
  reviewer_name: string;
  background_base64?: string;
  avatar_base64?: string;
}

export interface VideoTemplateProps {
  config: VideoTemplateConfig;
  metadata: VideoTemplateMetadata;
}

const GOOGLE_YELLOW = '#F4B400';

export const VideoTemplate: React.FC<VideoTemplateProps> = ({ config, metadata }) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();

  const primaryColor = config.primary_color || '#4285F4';
  const blurLevel = config.blur_level ?? 10;
  const layout = config.layout || 'Center';
  const fontFamily = config.font_family || "'Google Sans', 'Roboto', sans-serif";
  const avatarSize = Math.round(200 * (config.avatar_size / 100));
  const reviewTextSize = config.review_text_size || 34;
  const reviewerNameSize = config.reviewer_name_size || 30;
  const businessNameSize = config.business_name_size || 52;

  // Animations
  const fadeIn = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  const cardSlide = spring({ frame, from: 60, to: 0, fps, config: { damping: 14, mass: 0.8 } });
  const footerSlide = spring({ frame: Math.max(0, frame - 10), from: 40, to: 0, fps, config: { damping: 14 } });
  const starsScale = spring({ frame: Math.max(0, frame - 5), from: 0.3, to: 1, fps, config: { damping: 10 } });

  const justifyMap: Record<string, string> = {
    Top: 'flex-start',
    Center: 'center',
    Bottom: 'flex-end',
  };

  const initials = metadata.reviewer_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Build the ordered components map
  const componentMap: Record<string, React.ReactNode> = {
    avatar: metadata.avatar_base64 ? (
      <img
        src={metadata.avatar_base64}
        style={{
          width: `${avatarSize}px`,
          height: `${avatarSize}px`,
          borderRadius: '50%',
          border: `4px solid ${primaryColor}`,
          boxShadow: `0 2px 12px rgba(0,0,0,0.3)`,
          objectFit: 'cover',
        }}
      />
    ) : (
      <div
        style={{
          width: `${avatarSize}px`,
          height: `${avatarSize}px`,
          borderRadius: '50%',
          border: `4px solid ${primaryColor}`,
          boxShadow: `0 2px 12px rgba(0,0,0,0.3)`,
          background: `linear-gradient(135deg, ${primaryColor}99, ${primaryColor}44)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: `${Math.round(avatarSize * 0.38)}px`,
          fontWeight: 700,
          color: 'white',
          fontFamily,
        }}
      >
        {initials}
      </div>
    ),
    stars: (
      <div style={{ display: 'flex', gap: '6px', transform: `scale(${starsScale})` }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            style={{
              fontSize: '48px',
              color: star <= Math.round(metadata.overall_rating) ? GOOGLE_YELLOW : 'rgba(255,255,255,0.2)',
              textShadow: star <= Math.round(metadata.overall_rating) ? `0 0 8px ${GOOGLE_YELLOW}55` : 'none',
            }}
          >
            ★
          </span>
        ))}
      </div>
    ),
    review_text: (
      <p
        style={{
          fontSize: `${reviewTextSize}px`,
          textAlign: 'center',
          lineHeight: 1.5,
          fontWeight: 400,
          color: 'rgba(255, 255, 255, 0.95)',
          letterSpacing: '0.01em',
          margin: 0,
          padding: '0 10px',
        }}
      >
        &ldquo;{metadata.review_text}&rdquo;
      </p>
    ),
    reviewer_name: (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
        <div style={{ width: '48px', height: '3px', background: `linear-gradient(90deg, transparent, ${primaryColor}, transparent)`, borderRadius: '2px' }} />
        <p style={{ fontSize: `${reviewerNameSize}px`, fontWeight: 600, color: '#FFF', letterSpacing: '0.02em', margin: 0, fontFamily }}>
          {metadata.reviewer_name}
        </p>
      </div>
    ),
    business_name: (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <h2
          style={{
            fontSize: `${businessNameSize}px`,
            fontWeight: 700,
            margin: 0,
            color: 'white',
            fontFamily,
            letterSpacing: '-0.01em',
            textShadow: '0 2px 12px rgba(0,0,0,0.5)',
          }}
        >
          {metadata.business_name}
        </h2>
        <p
          style={{
            fontSize: `${Math.round(businessNameSize * 0.6)}px`,
            color: GOOGLE_YELLOW,
            margin: 0,
            fontWeight: 600,
            fontFamily,
            textShadow: '0 2px 10px rgba(0,0,0,0.4)',
          }}
        >
          {metadata.overall_rating} ★ en Google
        </p>
      </div>
    ),
  };

  const orderedComponents = config.component_order.filter((c) => c.visible);

  return (
    <AbsoluteFill style={{ backgroundColor: '#202124', overflow: 'hidden', fontFamily }}>

      {/* ─── Background ─── */}
      {metadata.background_base64 ? (
        <AbsoluteFill>
          <img
            src={metadata.background_base64}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: `blur(${blurLevel}px) brightness(0.3)`,
              transform: 'scale(1.15)',
            }}
          />
        </AbsoluteFill>
      ) : (
        <AbsoluteFill style={{ background: `linear-gradient(170deg, #202124 0%, #303134 40%, ${primaryColor}11 100%)` }} />
      )}

      {/* ─── Subtle Google-style accent ─── */}
      <AbsoluteFill style={{ opacity: 0.06 }}>
        <div style={{ position: 'absolute', top: '-15%', right: '-10%', width: '500px', height: '500px', borderRadius: '50%', background: '#4285F4', filter: 'blur(120px)' }} />
        <div style={{ position: 'absolute', bottom: '-15%', left: '-10%', width: '600px', height: '600px', borderRadius: '50%', background: '#34A853', filter: 'blur(120px)' }} />
      </AbsoluteFill>

      {/* ─── Card ─── */}
      <AbsoluteFill
        style={{
          justifyContent: justifyMap[layout] || 'center',
          alignItems: 'center',
          padding: '100px 50px',
          opacity: fadeIn,
          transform: `translateY(${cardSlide}px)`,
        }}
      >
        <div
          style={{
            backgroundColor: 'rgba(48, 49, 52, 0.75)',
            backdropFilter: 'blur(20px)',
            borderRadius: '28px',
            padding: '48px 40px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '24px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
            width: '100%',
            maxWidth: '920px',
          }}
        >
          {orderedComponents.map((item) => (
            <React.Fragment key={item.id}>
              {componentMap[item.id]}
            </React.Fragment>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
