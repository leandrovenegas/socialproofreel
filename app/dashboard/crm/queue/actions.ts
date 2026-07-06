'use server';

import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with the Service Role key to bypass RLS
const getServiceSupabase = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
};

export async function saveQueue(leadIds: string[]) {
  const supabase = getServiceSupabase();

  try {
    // 1. Delete all current rows in outreach_queue
    const { error: deleteErr } = await supabase
      .from('outreach_queue')
      .delete()
      .neq('lead_id', '00000000-0000-0000-0000-000000000000'); // Delete everything

    if (deleteErr) {
      console.error('Error clearing queue:', deleteErr);
      throw new Error(`Failed to clear queue: ${deleteErr.message}`);
    }

    if (leadIds.length === 0) {
      return true;
    }

    // 2. Insert new rows with position
    const insertRows = leadIds.map((id, index) => ({
      lead_id: id,
      position: index + 1,
    }));

    const { error: insertErr } = await supabase
      .from('outreach_queue')
      .insert(insertRows);

    if (insertErr) {
      console.error('Error inserting queue:', insertErr);
      throw new Error(`Failed to save queue items: ${insertErr.message}`);
    }

    return true;
  } catch (err: any) {
    console.error('saveQueue exception:', err);
    throw err;
  }
}

export async function getGeneralTemplates() {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('bot_config')
    .select('*')
    .eq('key', 'whatsapp_bot')
    .maybeSingle();

  if (error) {
    console.log('Note: Error fetching general templates (migration might be pending):', error.message);
    return { template1: '', template2: '' };
  }

  return {
    template1: data?.message_template || '',
    template2: data?.message_template_2 || ''
  };
}

export async function saveGeneralTemplates(template1: string, template2: string): Promise<boolean> {
  const supabase = getServiceSupabase();
  const { error } = await supabase
    .from('bot_config')
    .update({ 
      message_template: template1, 
      message_template_2: template2,
      updated_at: new Date().toISOString() 
    })
    .eq('key', 'whatsapp_bot');

  if (error) {
    console.error('Error saving general templates:', error);
    throw new Error(error.message);
  }

  return true;
}
