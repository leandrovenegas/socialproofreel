'use client';

import React, { useRef, useState, useEffect } from 'react';

interface VideoLandingClientProps {
  businessName: string;
  rating: number;
  reviews: number;
  bunnyUrl: string | null;
  slug: string;
}

export default function VideoLandingClient({
  businessName,
  rating,
  reviews,
  bunnyUrl,
  slug,
}: VideoLandingClientProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Generate stars
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.3;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

  const handlePlayClick = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
      setHasInteracted(true);
    }
  };

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);
    vid.addEventListener('play', onPlay);
    vid.addEventListener('pause', onPause);
    vid.addEventListener('ended', onEnded);
    return () => {
      vid.removeEventListener('play', onPlay);
      vid.removeEventListener('pause', onPause);
      vid.removeEventListener('ended', onEnded);
    };
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
          background: #050505 !important;
          color: #f0f0f0 !important;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important;
          overflow-x: hidden;
        }

        .landing-container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
        }

        /* Animated gradient background orbs */
        .bg-orb {
          position: fixed;
          border-radius: 50%;
          filter: blur(120px);
          opacity: 0.12;
          pointer-events: none;
          z-index: 0;
        }
        .bg-orb-1 {
          width: 600px; height: 600px;
          background: radial-gradient(circle, #6366f1, #8b5cf6);
          top: -200px; left: -200px;
          animation: float1 20s ease-in-out infinite;
        }
        .bg-orb-2 {
          width: 500px; height: 500px;
          background: radial-gradient(circle, #ec4899, #f43f5e);
          bottom: -150px; right: -150px;
          animation: float2 25s ease-in-out infinite;
        }
        .bg-orb-3 {
          width: 400px; height: 400px;
          background: radial-gradient(circle, #14b8a6, #06b6d4);
          top: 50%; left: 60%;
          animation: float3 18s ease-in-out infinite;
        }

        @keyframes float1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(80px, 40px) scale(1.1); }
          66% { transform: translate(-40px, 80px) scale(0.95); }
        }
        @keyframes float2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-60px, -30px) scale(1.05); }
          66% { transform: translate(40px, -60px) scale(0.9); }
        }
        @keyframes float3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-50px, 30px) scale(1.08); }
        }

        /* Top bar */
        .top-bar {
          width: 100%;
          padding: 16px 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          z-index: 10;
        }
        .top-bar-brand {
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: rgba(255,255,255,0.3);
        }

        /* Hero Section */
        .hero {
          width: 100%;
          max-width: 900px;
          padding: 40px 24px 20px;
          text-align: center;
          position: relative;
          z-index: 10;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(99, 102, 241, 0.12);
          border: 1px solid rgba(99, 102, 241, 0.2);
          border-radius: 100px;
          padding: 6px 16px;
          font-size: 12px;
          font-weight: 600;
          color: #a5b4fc;
          margin-bottom: 20px;
          letter-spacing: 0.5px;
        }
        .badge-dot {
          width: 6px; height: 6px;
          background: #6366f1;
          border-radius: 50%;
          animation: pulse-dot 2s ease-in-out infinite;
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }

        .hero h1 {
          font-size: clamp(28px, 5vw, 44px);
          font-weight: 800;
          line-height: 1.15;
          color: #ffffff;
          margin-bottom: 12px;
          letter-spacing: -0.03em;
        }
        .hero h1 .gradient-text {
          background: linear-gradient(135deg, #6366f1, #a78bfa, #ec4899);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .hero-subtitle {
          font-size: 16px;
          color: rgba(255,255,255,0.5);
          font-weight: 400;
          line-height: 1.6;
          max-width: 520px;
          margin: 0 auto;
        }

        /* Stars */
        .stars-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 20px;
        }
        .star {
          font-size: 22px;
          color: #facc15;
          filter: drop-shadow(0 0 4px rgba(250, 204, 21, 0.3));
        }
        .star-empty {
          color: rgba(255,255,255,0.12);
          filter: none;
        }
        .star-half {
          position: relative;
          display: inline-block;
        }
        .rating-text {
          font-size: 14px;
          color: rgba(255,255,255,0.5);
          font-weight: 500;
          margin-left: 4px;
        }

        /* Video Player Section */
        .video-section {
          width: 100%;
          max-width: 720px;
          padding: 8px 24px 40px;
          position: relative;
          z-index: 10;
        }

        .video-wrapper {
          position: relative;
          border-radius: 20px;
          overflow: hidden;
          background: #111;
          box-shadow:
            0 0 0 1px rgba(255,255,255,0.06),
            0 25px 80px -12px rgba(0, 0, 0, 0.8),
            0 0 120px -20px rgba(99, 102, 241, 0.15);
          cursor: pointer;
          transition: box-shadow 0.4s ease;
          aspect-ratio: 9 / 16;
          max-height: 75vh;
          margin: 0 auto;
        }
        .video-wrapper:hover {
          box-shadow:
            0 0 0 1px rgba(255,255,255,0.1),
            0 30px 100px -12px rgba(0, 0, 0, 0.9),
            0 0 150px -20px rgba(99, 102, 241, 0.25);
        }

        .video-wrapper video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        /* Play overlay */
        .play-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.35);
          transition: opacity 0.3s ease;
          z-index: 5;
        }
        .play-overlay.hidden {
          opacity: 0;
          pointer-events: none;
        }
        .play-btn {
          width: 80px; height: 80px;
          background: rgba(255,255,255,0.12);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        }
        .play-btn:hover {
          background: rgba(255,255,255,0.2);
          transform: scale(1.08);
        }
        .play-btn svg {
          width: 28px; height: 28px;
          fill: #fff;
          margin-left: 4px;
        }

        /* No video state */
        .no-video {
          aspect-ratio: 9 / 16;
          max-height: 75vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: linear-gradient(180deg, rgba(99,102,241,0.05), rgba(0,0,0,0));
          border-radius: 20px;
          border: 1px dashed rgba(255,255,255,0.1);
          margin: 0 auto;
        }
        .no-video-icon {
          font-size: 48px;
          margin-bottom: 16px;
          opacity: 0.5;
        }
        .no-video-text {
          font-size: 16px;
          color: rgba(255,255,255,0.4);
          font-weight: 500;
        }
        .no-video-sub {
          font-size: 13px;
          color: rgba(255,255,255,0.25);
          margin-top: 6px;
        }

        /* CTA Section */
        .cta-section {
          width: 100%;
          max-width: 600px;
          padding: 0 24px 60px;
          text-align: center;
          position: relative;
          z-index: 10;
        }

        .cta-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 20px;
          padding: 36px 32px;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }
        .cta-card h3 {
          font-size: 20px;
          font-weight: 700;
          margin-bottom: 10px;
          color: #fff;
        }
        .cta-card p {
          font-size: 14px;
          color: rgba(255,255,255,0.45);
          line-height: 1.6;
          margin-bottom: 24px;
        }

        .cta-btn {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: linear-gradient(135deg, #25d366, #128c7e);
          color: #fff;
          font-size: 15px;
          font-weight: 700;
          padding: 14px 32px;
          border-radius: 14px;
          border: none;
          cursor: pointer;
          text-decoration: none;
          transition: all 0.3s ease;
          box-shadow: 0 8px 30px -6px rgba(37, 211, 102, 0.3);
          letter-spacing: 0.3px;
        }
        .cta-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 40px -6px rgba(37, 211, 102, 0.45);
        }
        .cta-btn svg {
          width: 20px; height: 20px;
          fill: #fff;
        }

        /* Footer */
        .footer {
          width: 100%;
          padding: 24px;
          text-align: center;
          position: relative;
          z-index: 10;
          border-top: 1px solid rgba(255,255,255,0.04);
        }
        .footer-text {
          font-size: 11px;
          color: rgba(255,255,255,0.2);
          letter-spacing: 0.5px;
        }

        /* Fade-in animation */
        .fade-in {
          animation: fadeUp 0.8s ease-out forwards;
          opacity: 0;
        }
        .fade-in-delay-1 { animation-delay: 0.15s; }
        .fade-in-delay-2 { animation-delay: 0.3s; }
        .fade-in-delay-3 { animation-delay: 0.45s; }
        .fade-in-delay-4 { animation-delay: 0.6s; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 640px) {
          .hero { padding: 24px 16px 12px; }
          .video-section { padding: 8px 16px 32px; }
          .cta-section { padding: 0 16px 48px; }
          .cta-card { padding: 28px 20px; }
          .video-wrapper { border-radius: 16px; }
          .play-btn { width: 64px; height: 64px; }
          .play-btn svg { width: 22px; height: 22px; }
        }
      `}</style>

      <div className="landing-container">
        {/* Background orbs */}
        <div className="bg-orb bg-orb-1" />
        <div className="bg-orb bg-orb-2" />
        <div className="bg-orb bg-orb-3" />

        {/* Top bar */}
        <div className="top-bar fade-in">
          <span className="top-bar-brand">SocialProofREEL</span>
        </div>

        {/* Hero */}
        <section className="hero">
          <div className="badge fade-in fade-in-delay-1">
            <span className="badge-dot" />
            Video Personalizado
          </div>
          <h1 className="fade-in fade-in-delay-1">
            <span className="gradient-text">{businessName}</span>
          </h1>
          <p className="hero-subtitle fade-in fade-in-delay-2">
            Tus mejores reseñas de Google, transformadas en un video profesional que impulsa tu negocio.
          </p>

          {/* Stars */}
          {rating > 0 && (
            <div className="stars-row fade-in fade-in-delay-2">
              {Array.from({ length: fullStars }).map((_, i) => (
                <span key={`full-${i}`} className="star">★</span>
              ))}
              {hasHalf && <span className="star">★</span>}
              {Array.from({ length: emptyStars }).map((_, i) => (
                <span key={`empty-${i}`} className="star star-empty">★</span>
              ))}
              <span className="rating-text">
                {rating.toFixed(1)} · {reviews} reseñas
              </span>
            </div>
          )}
        </section>

        {/* Video Player */}
        <section className="video-section fade-in fade-in-delay-3">
          {bunnyUrl ? (
            <div className="video-wrapper" onClick={handlePlayClick}>
              <video
                ref={videoRef}
                src={bunnyUrl}
                playsInline
                preload="metadata"
              />
              <div className={`play-overlay ${isPlaying ? 'hidden' : ''}`}>
                <div className="play-btn">
                  {isPlaying ? (
                    <svg viewBox="0 0 24 24">
                      <rect x="6" y="4" width="4" height="16" rx="1" />
                      <rect x="14" y="4" width="4" height="16" rx="1" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24">
                      <polygon points="6,4 20,12 6,20" />
                    </svg>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="no-video">
              <span className="no-video-icon">🎬</span>
              <span className="no-video-text">Video en preparación</span>
              <span className="no-video-sub">Estará disponible pronto</span>
            </div>
          )}
        </section>

        {/* CTA Section */}
        <section className="cta-section fade-in fade-in-delay-4">
          <div className="cta-card">
            <h3>¿Te gustó tu video?</h3>
            <p>
              Publica este video en tus redes sociales y atrae nuevos clientes
              mostrando las mejores reseñas de tu negocio.
            </p>
            <a
              href="https://wa.me/56912345678?text=Hola%2C%20vi%20el%20video%20de%20mi%20negocio%20y%20me%20interesa%20saber%20m%C3%A1s"
              target="_blank"
              rel="noopener noreferrer"
              className="cta-btn"
            >
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Quiero mi video — Escríbenos
            </a>
          </div>
        </section>

        {/* Footer */}
        <footer className="footer">
          <p className="footer-text">Generado con SocialProofREEL · Videos de reseñas que venden</p>
        </footer>
      </div>
    </>
  );
}
