'use client';

import React from 'react';
import { Player } from '@remotion/player';
import { VideoTemplate } from '@/components/remotion/VideoTemplate';
import type { VideoTemplateConfig } from '@/components/remotion/VideoTemplate';

interface PlayerPreviewProps {
  config: VideoTemplateConfig;
}

const sampleMetadata = {
  business_name: 'Foz Indumentaria',
  overall_rating: 4.8,
  review_text: 'Excelente atención y productos de primera calidad. Muy recomendable para toda la familia.',
  reviewer_name: 'María García',
};

export default function PlayerPreview({ config }: PlayerPreviewProps) {
  return (
    <Player
      key={JSON.stringify(config)}
      component={VideoTemplate}
      inputProps={{ config, metadata: sampleMetadata }}
      durationInFrames={150}
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
