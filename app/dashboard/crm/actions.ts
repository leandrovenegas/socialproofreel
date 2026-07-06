'use server';

import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with the Service Role key to bypass RLS
const getServiceSupabase = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
};

export async function updateLeadContactData(leadId: string, contactData: any) {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('raw_leads')
    .update({ contact_data: contactData })
    .eq('id', leadId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateLeadStatus(leadId: string, status?: string, stage?: string) {
  const supabase = getServiceSupabase();
  const updateData: any = {};
  
  if (status !== undefined) {
    updateData.crm_status = status;
  }
  
  if (stage !== undefined) {
    updateData.pipeline_stage = stage;
  } else if (status === 'sin_contactar') {
    updateData.score = 50;
    updateData.pipeline_stage = null;
  }

  const { error } = await supabase
    .from('raw_leads')
    .update(updateData)
    .eq('id', leadId);

  if (error) throw new Error(error.message);
  return true;
}

export async function updateLeadScore(leadId: string, score: number) {
  const supabase = getServiceSupabase();
  const { error } = await supabase
    .from('raw_leads')
    .update({ score })
    .eq('id', leadId);

  if (error) throw new Error(error.message);
  return true;
}

export async function updateLeadMessageOverride(
  leadId: string, 
  messageOverride: string | null,
  messageOverride2: string | null
) {
  const supabase = getServiceSupabase();
  const { error } = await supabase
    .from('raw_leads')
    .update({ 
      message_override: messageOverride,
      message_override_2: messageOverride2
    })
    .eq('id', leadId);

  if (error) throw new Error(error.message);
  return true;
}
