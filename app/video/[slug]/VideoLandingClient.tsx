'use client';

import React, { useRef, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

interface VideoLandingClientProps {
  businessName: string;
  rating: number;
  reviews: number;
  bunnyUrl: string | null;
  slug: string;
  leadId: string;
  contactData: any;
}

export default function VideoLandingClient({
  businessName,
  rating,
  reviews,
  bunnyUrl,
  slug,
  leadId,
  contactData,
}: VideoLandingClientProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Track visit when the prospect loads the landing page
  useEffect(() => {
    const trackVisit = async () => {
      const sessionKey = `tracked_visit_${leadId}`;
      if (sessionStorage.getItem(sessionKey)) return;

      try {
        const { error } = await supabase
          .from('outreach')
          .insert({
            lead_id: leadId,
            canal: 'web',
            estado: 'visitado',
            notas: 'El prospecto abrió la página de video.'
          });
        
        if (!error) {
          sessionStorage.setItem(sessionKey, 'true');
        }
      } catch (err) {
        console.error('Error tracking visit:', err);
      }
    };

    if (leadId) {
      trackVisit();
    }
  }, [leadId]);

  // Generate deliverables array
  const deliverables = [...(contactData?.deliverables || [])];
  const hasVideoDeliverable = deliverables.some((d: any) => d.type === 'video');
  if (bunnyUrl && !hasVideoDeliverable) {
    deliverables.unshift({
      id: 'del-video-primary',
      name: 'Video de Reseñas (Google Maps)',
      url: bunnyUrl,
      type: 'video',
      created_at: new Date().toISOString()
    });
  }

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

        /* Deliverables Section */
        .deliverable-item:hover {
          background: rgba(255, 255, 255, 0.05) !important;
          border-color: rgba(255, 255, 255, 0.1) !important;
          transform: scale(1.01);
        }
        .download-btn-client:hover {
          transform: translateY(-1px);
          filter: brightness(1.1);
          box-shadow: 0 4px 15px rgba(0,0,0,0.2);
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

        {/* Deliverables Section */}
        {deliverables.length > 0 && (
          <section className="deliverables-section fade-in fade-in-delay-3" style={{ padding: '0 24px 48px', maxWidth: '680px', margin: '0 auto', width: '100%' }}>
            <div className="deliverables-card" style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '28px 24px', position: 'relative', zIndex: 10 }}>
              <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 700, color: '#fff', textAlign: 'center' }}>
                📦 Tus Documentos y Entregables
              </h3>
              <p style={{ margin: '0 0 24px', fontSize: '13px', color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: '1.5' }}>
                Accede y descarga aquí tu video optimizado, cotizaciones y otros documentos de tu proyecto de forma directa.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {deliverables.map((del: any) => (
                  <div
                    key={del.id}
                    className="deliverable-item"
                    style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.04)',
                      borderRadius: '12px',
                      padding: '14px 18px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'all 0.2s ease-in-out',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <span style={{ fontSize: '24px' }}>
                        {del.type === 'video' ? '🎬' : del.type === 'pdf' ? '📄' : del.type === 'excel' ? '📊' : del.type === 'invoice' ? '🧾' : '📁'}
                      </span>
                      <div>
                        <div style={{ fontWeight: 600, color: '#fff', fontSize: '13.5px', textAlign: 'left' }}>{del.name}</div>
                        <div style={{ fontSize: '10.5px', color: 'rgba(255,255,255,0.3)', marginTop: '3px', textAlign: 'left' }}>
                          Tipo: {del.type === 'video' ? 'Video MP4' : del.type === 'pdf' ? 'Documento PDF' : del.type === 'excel' ? 'Planilla de Datos' : del.type === 'invoice' ? 'Boleta/Factura' : 'Archivo'}
                        </div>
                      </div>
                    </div>
                    <a
                      href={del.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="download-btn-client"
                      style={{
                        background: del.type === 'video' ? '#34a853' : '#8ab4f8',
                        color: del.type === 'video' ? '#fff' : '#121212',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px 16px',
                        fontSize: '12px',
                        fontWeight: 600,
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s ease',
                        cursor: 'pointer'
                      }}
                    >
                      Descargar 📥
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

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
