import { supabase } from '@/lib/supabase/client';
import QueueClient from './QueueClient';

export const revalidate = 0; // Deshabilitar caché para ver cambios en tiempo real

export default async function QueuePage() {
  // Fetch de la cola
  const { data: queueData } = await supabase
    .from('video_queue')
    .select('*')
    .order('created_at', { ascending: false });

  // Fetch de algunos leads sin procesar
  const { data: rawLeads } = await supabase
    .from('raw_leads')
    .select('id, raw_data, processed')
    .eq('processed', false)
    .limit(10);

  return (
    <QueueClient 
      initialQueue={queueData || []} 
      initialLeads={rawLeads || []} 
    />
  );
}
