'use server';

import { createClient } from '@supabase/supabase-js';

const getServiceSupabase = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
};

export async function getEditorTemplates() {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('editor_templates')
    .select('id, nombre, config')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching editor templates:', error);
    throw new Error(error.message);
  }

  return data;
}

export async function saveEditorTemplate(nombre: string, config: any) {
  const supabase = getServiceSupabase();
  
  const { data, error } = await supabase
    .from('editor_templates')
    .upsert(
      { nombre, config, updated_at: new Date().toISOString() },
      { onConflict: 'nombre' }
    )
    .select()
    .single();

  if (error) {
    console.error('Error saving editor template:', error);
    throw new Error(error.message);
  }

  return data;
}

export async function getLocalVideoPath(video: any) {
  let bizId = video.metadata?.business_id;
  if (!bizId) {
    const query = video.maps_url || video.business_name;
    if (query) {
      const crypto = require('crypto');
      bizId = crypto.createHash('md5').update(query).digest('hex');
    } else {
      bizId = video.id;
    }
  }
  return `\\\\192.168.1.18\\Vicente\\proyects\\SocialProofREEL-Worker\\videos_locales\\${bizId}`;
}
