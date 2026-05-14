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
  const configString = formData.get('config') as string;

  if (!id || typeof id !== 'string') {
    return { success: false, error: 'Invalid ID' };
  }

  let config;
  try {
    config = JSON.parse(configString);
  } catch (e) {
    return { success: false, error: 'Invalid config format' };
  }

  // Update both the JSON config and the legacy fields for backward compatibility
  const { data, error } = await supabase
    .from("settings")
    .update({
      config,
      // Keep legacy fields in sync
      primary_color: config.colors.primary,
      font_family: config.typography.family,
      blur_level: config.effects.blur,
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
