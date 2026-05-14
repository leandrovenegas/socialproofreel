export interface Lead {
  id: string;
  created_at: string;
  name: string;
  email: string;
  company?: string;
}

export interface Settings {
  id: string;
  created_at: string;
  primary_color: string;
  blur_level: number;
  font_family: string;
}

export type VideoQueueStatus = 'pending' | 'processing' | 'completed';

export interface VideoQueue {
  id: string;
  created_at: string;
  lead_id: string;
  status: VideoQueueStatus;
  bunny_url?: string;
}
