import React from 'react';
import Link from 'next/link';

export default function VideoNotFound() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#050505',
        color: '#f0f0f0',
        fontFamily: "'Inter', -apple-system, sans-serif",
        textAlign: 'center',
        padding: '24px',
      }}
    >
      <span style={{ fontSize: '64px', marginBottom: '16px' }}>🎬</span>
      <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '12px' }}>
        Video no encontrado
      </h1>
      <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.45)', maxWidth: '400px', lineHeight: 1.6 }}>
        El enlace que buscas no existe o el video aún está en proceso de generación.
      </p>
      <Link
        href="/"
        style={{
          marginTop: '28px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: '#a5b4fc',
          padding: '12px 24px',
          borderRadius: '12px',
          fontSize: '14px',
          fontWeight: 600,
          textDecoration: 'none',
          transition: 'all 0.2s',
        }}
      >
        ← Volver al inicio
      </Link>
    </div>
  );
}
