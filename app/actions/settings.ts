'use server';

import { supabase } from "@/lib/supabase/client";
import { Settings } from "@/lib/types";

// Note: In Next.js Server Actions, we should ideally use a server-side Supabase client 
// (e.g. from @supabase/ssr), but as per the starter structure, we're using the client.
// Assuming we are just doing simple validation here.

export async function updateSettingsAction(
  prevState: any,
  formData: FormData
) {
  const id = formData.get('id') as string;
  const primary_color = formData.get('primary_color') as string;
  const font_family = formData.get('font_family') as string;
  const blur_level = Number(formData.get('blur_level'));

  // Simple type validation
  if (!id || typeof id !== 'string') {
    return { success: false, error: 'Invalid ID' };
  }
  if (!primary_color || !/^#([0-9A-F]{3}){1,2}$/i.test(primary_color)) {
    return { success: false, error: 'Invalid color format' };
  }
  if (!font_family || typeof font_family !== 'string') {
    return { success: false, error: 'Invalid font family' };
  }
  if (isNaN(blur_level) || blur_level < 0 || blur_level > 20) {
    return { success: false, error: 'Invalid blur level (must be 0-20)' };
  }

  const { data, error } = await supabase
    .from("settings")
    .update({
      primary_color,
      font_family,
      blur_level,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating settings:", error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}
