'use server';

import { supabase } from "@/lib/supabase/client";
import { revalidatePath } from "next/cache";

export async function addLeadAction(prevState: any, formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const company = formData.get('company') as string;
  const testimonial = formData.get('testimonial') as string;
  const avatar_url = formData.get('avatar_url') as string;

  if (!name || !email) {
    return { success: false, error: 'Name and email are required.' };
  }

  const { data, error } = await supabase
    .from('leads')
    .insert([
      { 
        name, 
        email, 
        company: company || null, 
        testimonial: testimonial || null, 
        avatar_url: avatar_url || null 
      }
    ])
    .select()
    .single();

  if (error) {
    console.error("Error adding lead:", error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard/leads');
  return { success: true, data };
}

export async function generateVideoTaskAction(leadId: string) {
  if (!leadId) {
    return { success: false, error: 'Lead ID is required.' };
  }

  const { data, error } = await supabase
    .from('video_queue')
    .insert([
      { 
        lead_id: leadId, 
        status: 'pending' 
      }
    ])
    .select()
    .single();

  if (error) {
    console.error("Error generating video task:", error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard/leads');
  return { success: true, data };
}
