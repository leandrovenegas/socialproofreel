import React from 'react';
import { AbsoluteFill, useVideoConfig, useCurrentFrame, interpolate, spring } from 'remotion';

/* ═══════ Types ═══════ */

export interface ComponentItem {
  id: 'avatar' | 'reviewer_name' | 'review_text' | 'stars';
  label: string;
  visible: boolean;
}

export interface EffectsConfig {
  fade_in_duration: number;       // frames (1–60)
  card_slide_distance: number;    // px (0–200)
  card_damping: number;           // spring damping (5–30)
  stars_initial_scale: number;    // 0–1
  stars_damping: number;          // spring damping (5–30)
  stagger_delay: number;          // frames between each component animation (0–20)
}

export interface BusinessNameConfig {
  visible: boolean;
  show_rating: boolean;
  text_size: number;
  rating_text_size: number;
}

export interface VideoTemplateConfig {
  primary_color: string;
  blur_level: number;
  font_family: string;
  layout: 'Top' | 'Center' | 'Bottom';
  avatar_size: number;
  review_text_size: number;
  reviewer_name_size: number;
  component_order: ComponentItem[];
  business_name: BusinessNameConfig;
  effects: EffectsConfig;
}

export interface ReviewItem {
  reviewer_name: string;
  rating: number;
  review_text: string;
  avatar_base64?: string;
}

export interface VideoTemplateMetadata {
  business_name: string;
  overall_rating: number;
  background_base64?: string;
  
  // Backend worker: Multiple reviews
  reviews?: ReviewItem[];

  // Frontend preview: Single review fallback
  reviewer_name?: string;
  review_text?: string;
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
  const fontFamily = config.font_family || "'Roboto', sans-serif";
  const avatarSize = Math.round(200 * ((config.avatar_size ?? 140) / 100));
  const reviewTextSize = config.review_text_size || 34;
  const reviewerNameSize = config.reviewer_name_size || 30;
  // Defensive defaults for effects – prevents "inputRange must contain only numbers"
  const fx: EffectsConfig = Object.assign(
    { fade_in_duration: 20, card_slide_distance: 60, card_damping: 14, stars_initial_scale: 0.3, stars_damping: 10, stagger_delay: 5 },
    config.effects || {}
  ) as EffectsConfig;

  // Defensive defaults for component_order — must be declared before visibleItems
  const componentOrder: ComponentItem[] = config.component_order || [
    { id: 'avatar', label: 'Avatar', visible: true },
    { id: 'stars', label: 'Estrellas', visible: true },
    { id: 'review_text', label: 'Texto de Reseña', visible: true },
    { id: 'reviewer_name', label: 'Nombre del Autor', visible: true },
  ];

  // Defensive defaults for business_name — must be declared before JSX
  const biz: BusinessNameConfig = Object.assign(
    { visible: true, show_rating: true, text_size: 52, rating_text_size: 32 },
    config.business_name || {}
  ) as BusinessNameConfig;

  // Resolve multiple reviews or single fallback
  const reviews = metadata.reviews || [
    {
      reviewer_name: metadata.reviewer_name || '',
      review_text: metadata.review_text || '',
      avatar_base64: metadata.avatar_base64,
      rating: metadata.overall_rating || 5,
    }
  ];

  // Each review lasts 150 frames. Determine active review and frame within that scene.
  const reviewIndex = Math.min(
    reviews.length - 1,
    Math.floor(frame / 150)
  );
  const review = reviews[reviewIndex] || {};
  const sceneFrame = frame % 150;

  // ── Animations based on sceneFrame ──
  const fadeIn = interpolate(sceneFrame, [0, fx.fade_in_duration], [0, 1], { extrapolateRight: 'clamp' });

  const cardSlide = spring({
    frame: sceneFrame,
    from: fx.card_slide_distance,
    to: 0,
    fps,
    config: { damping: fx.card_damping, mass: 0.8 },
  });

  const starsScale = spring({
    frame: Math.max(0, sceneFrame - fx.stagger_delay),
    from: fx.stars_initial_scale,
    to: 1,
    fps,
    config: { damping: fx.stars_damping },
  });

  // Footer (business name) animates separately
  const footerFade = interpolate(sceneFrame, [fx.stagger_delay * 2, fx.stagger_delay * 2 + fx.fade_in_duration], [0, 1], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });
  const footerSlide = spring({
    frame: Math.max(0, sceneFrame - fx.stagger_delay * 2),
    from: Math.round(fx.card_slide_distance * 0.6),
    to: 0,
    fps,
    config: { damping: fx.card_damping },
  });

  const justifyMap: Record<string, string> = {
    Top: 'flex-start',
    Center: 'center',
    Bottom: 'flex-end',
  };

  const initials = (review.reviewer_name || '')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Per-component stagger: each visible component gets a progressive delay
  const visibleItems = componentOrder.filter((c) => c.visible);

  // ── Component renderers ──
  const renderComponent = (item: ComponentItem, itemIndex: number) => {
    const delay = fx.stagger_delay * (itemIndex + 1);
    const itemFade = interpolate(sceneFrame, [delay, delay + fx.fade_in_duration * 0.6], [0, 1], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });
    const itemSlide = spring({
      frame: Math.max(0, sceneFrame - delay),
      from: 30,
      to: 0,
      fps,
      config: { damping: fx.card_damping + 2 },
    });

    const wrapStyle: React.CSSProperties = {
      opacity: itemFade,
      transform: `translateY(${itemSlide}px)`,
    };

    switch (item.id) {
      case 'avatar':
        return (
          <div key={item.id} style={wrapStyle}>
            {review.avatar_base64 ? (
              <img
                src={review.avatar_base64}
                style={{
                  width: `${avatarSize}px`, height: `${avatarSize}px`,
                  borderRadius: '50%', border: `4px solid ${primaryColor}`,
                  boxShadow: '0 2px 12px rgba(0,0,0,0.3)', objectFit: 'cover',
                }}
              />
            ) : (
              <div style={{
                width: `${avatarSize}px`, height: `${avatarSize}px`,
                borderRadius: '50%', border: `4px solid ${primaryColor}`,
                boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
                background: `linear-gradient(135deg, ${primaryColor}99, ${primaryColor}44)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: `${Math.round(avatarSize * 0.38)}px`, fontWeight: 700, color: 'white', fontFamily,
              }}>
                {initials || 'U'}
              </div>
            )}
          </div>
        );

      case 'stars':
        return (
          <div key={item.id} style={{ ...wrapStyle, display: 'flex', gap: '6px', transform: `translateY(${itemSlide}px) scale(${starsScale})` }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <span key={star} style={{
                fontSize: '48px',
                color: star <= Math.round(review.rating || 5) ? GOOGLE_YELLOW : 'rgba(255,255,255,0.15)',
                textShadow: star <= Math.round(review.rating || 5) ? `0 0 8px ${GOOGLE_YELLOW}44` : 'none',
              }}>★</span>
            ))}
          </div>
        );

      case 'review_text':
        return (
          <div key={item.id} style={wrapStyle}>
            <p style={{
              fontSize: `${reviewTextSize}px`, textAlign: 'center', lineHeight: 1.5,
              fontWeight: 400, color: 'rgba(255,255,255,0.95)', letterSpacing: '0.01em',
              margin: 0, padding: '0 10px',
            }}>
              &ldquo;{review.review_text}&rdquo;
            </p>
          </div>
        );

      case 'reviewer_name':
        return (
          <div key={item.id} style={{ ...wrapStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '48px', height: '3px', background: `linear-gradient(90deg, transparent, ${primaryColor}, transparent)`, borderRadius: '2px' }} />
            <p style={{ fontSize: `${reviewerNameSize}px`, fontWeight: 600, color: '#FFF', letterSpacing: '0.02em', margin: 0, fontFamily }}>
              {review.reviewer_name}
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  // (componentOrder and biz are declared above, near fx)

  return (
    <AbsoluteFill style={{ backgroundColor: '#202124', overflow: 'hidden', fontFamily }}>

      {/* ─── Background ─── */}
      {metadata.background_base64 ? (
        <AbsoluteFill>
          <img src={metadata.background_base64} style={{
            width: '100%', height: '100%', objectFit: 'cover',
            filter: `blur(${blurLevel}px) brightness(0.3)`, transform: 'scale(1.15)',
          }} />
        </AbsoluteFill>
      ) : (
        <AbsoluteFill style={{ background: `linear-gradient(170deg, #202124 0%, #303134 40%, ${primaryColor}11 100%)` }} />
      )}

      {/* ─── Decorative blobs ─── */}
      <AbsoluteFill style={{ opacity: 0.06 }}>
        <div style={{ position: 'absolute', top: '-15%', right: '-10%', width: '500px', height: '500px', borderRadius: '50%', background: '#4285F4', filter: 'blur(120px)' }} />
        <div style={{ position: 'absolute', bottom: '-15%', left: '-10%', width: '600px', height: '600px', borderRadius: '50%', background: '#34A853', filter: 'blur(120px)' }} />
      </AbsoluteFill>

      {/* ─── Review Card (components inside) ─── */}
      <AbsoluteFill style={{
        justifyContent: justifyMap[layout] || 'center',
        alignItems: 'center',
        padding: biz.visible ? '100px 50px 220px 50px' : '100px 50px',
        opacity: fadeIn,
        transform: `translateY(${cardSlide}px)`,
      }}>
        <div style={{
          backgroundColor: 'rgba(48, 49, 52, 0.75)',
          backdropFilter: 'blur(20px)',
          borderRadius: '28px',
          padding: '48px 40px',
          border: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
          width: '100%', maxWidth: '920px',
        }}>
          {visibleItems.map((item, i) => renderComponent(item, i))}
        </div>
      </AbsoluteFill>

      {/* ─── Business Name (OUTSIDE the card, pinned to bottom) ─── */}
      {biz.visible && (
        <AbsoluteFill style={{
          justifyContent: 'flex-end', alignItems: 'center',
          paddingBottom: '70px',
          opacity: footerFade,
          transform: `translateY(${footerSlide}px)`,
        }}>
          <h2 style={{
            fontSize: `${biz.text_size}px`, fontWeight: 700,
            margin: 0, color: 'white', fontFamily,
            letterSpacing: '-0.01em',
            textShadow: '0 2px 16px rgba(0,0,0,0.6)',
          }}>
            {metadata.business_name}
          </h2>
          {biz.show_rating && (
            <p style={{
              fontSize: `${biz.rating_text_size}px`, color: GOOGLE_YELLOW,
              margin: '8px 0 0', fontWeight: 600, fontFamily,
              textShadow: '0 2px 10px rgba(0,0,0,0.4)',
            }}>
              {metadata.overall_rating} ★ en Google
            </p>
          )}
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
