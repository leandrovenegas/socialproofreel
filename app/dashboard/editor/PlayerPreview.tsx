'use client';

import React from 'react';
import { Player } from '@remotion/player';
import { VideoTemplate } from '@/components/remotion/VideoTemplate';
import type { VideoTemplateConfig } from '@/components/remotion/VideoTemplate';

interface PlayerPreviewProps {
  config: VideoTemplateConfig;
  videoData?: any;
}

const sampleMetadata = {
  business_name: 'Street Motors Servicio Automotriz PSA Peugeot Citroën',
  overall_rating: 4.5,
  backgrounds_base64: [
    '/street_motors/background_0.jpg',
    '/street_motors/background_1.jpg',
    '/street_motors/background_2.jpg'
  ],
  reviews: [
    {
      reviewer_name: 'Ricardo Araneda',
      rating: 5,
      review_text: 'Excelente atención. Me solucionaron el problema rápidamente. Quedé muy impresionado y contento.',
      avatar_base64: '/street_motors/avatar_0.jpg'
    },
    {
      reviewer_name: 'Luis Ramirez',
      rating: 5,
      review_text: 'Excelente servicio. 100% recomendable.',
      avatar_base64: '/street_motors/avatar_1.jpg'
    },
    {
      reviewer_name: 'Pablo Herrada',
      rating: 5,
      review_text: 'Excelente servicio, muy amables y dispuestos a resolver cualquier duda. Sinceros y te explican claramente lo que tu vehículo tiene o necesita. 1000% recomendables!!!',
      avatar_base64: '/street_motors/avatar_2.jpg'
    },
    {
      reviewer_name: 'Juan Amestica',
      rating: 5,
      review_text: 'Excelente servicio y muy buenos precios',
      avatar_base64: '/street_motors/avatar_3.jpg'
    },
    {
      reviewer_name: 'Alejandro Toledo',
      rating: 5,
      review_text: 'Excelente lugar y servicio! Muy profesionales',
      avatar_base64: '/street_motors/avatar_4.jpg'
    }
  ]
};

export default function PlayerPreview({ config, videoData }: PlayerPreviewProps) {
  return (
    <Player
      key={videoData?.id || 'default-preview-key'}
      component={VideoTemplate}
      inputProps={{ config, metadata: videoData?.metadata || sampleMetadata }}
      durationInFrames={750}
      compositionWidth={1080}
      compositionHeight={1920}
      fps={30}
      controls
      loop
      acknowledgeRemotionLicense
      style={{ width: '100%', height: '100%' }}
    />
  );
}
