import React from 'react';
import EditorClient from './EditorClient';

export const metadata = {
  title: 'Editor de Plantillas | Social Proof Reel',
  description: 'Crea y edita plantillas de video para tus reseñas de Google',
};

export default function EditorPage() {
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0A0A0A', color: 'white' }}>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <EditorClient />
      </div>
    </div>
  );
}
