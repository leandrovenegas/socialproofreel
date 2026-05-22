export interface Lead {
  id: string;
  created_at: string;
  name: string;
  email: string;
  company?: string;
  testimonial?: string;
  avatar_url?: string;
}

export interface TemplateConfig {
  typography: {
    family: string;
    size: number;
    weight: string;
  };
  colors: {
    primary: string;
    secondary: string;
    overlay_opacity: number;
  };
  layout: {
    alignment: 'top' | 'center' | 'bottom';
  };
  effects: {
    blur: number;
    overlay_darkness: number;
  };
}

export interface Settings {
  id: string;
  created_at: string;
  primary_color: string;
  blur_level: number;
  font_family: string;
  config?: TemplateConfig;
}

export type VideoQueueStatus = 'pending' | 'processing' | 'completed';

export interface VideoQueue {
  id: string;
  created_at: string;
  lead_id: string;
  status: VideoQueueStatus;
  bunny_url?: string;
}
