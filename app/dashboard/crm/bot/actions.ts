'use server';

import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with the Service Role key to bypass RLS
const getServiceSupabase = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
};

export async function getChileMidnight(): Promise<string> {
  const now = new Date();
  const dateStr = now.toLocaleDateString('sv-SE', { timeZone: 'America/Santiago' }); // returns YYYY-MM-DD
  
  // Calculate timezone offset for Chile dynamically
  const santiagoStr = now.toLocaleString('en-US', { timeZone: 'America/Santiago' });
  const utcStr = now.toLocaleString('en-US', { timeZone: 'UTC' });
  const diffHours = Math.round((new Date(santiagoStr).getTime() - new Date(utcStr).getTime()) / 3600000);
  const offsetSign = diffHours >= 0 ? '+' : '-';
  const offsetStr = `${offsetSign}${String(Math.abs(diffHours)).padStart(2, '0')}:00`;
  
  return `${dateStr}T00:00:00${offsetStr}`;
}

export async function getBotStatus() {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('bot_config')
    .select('*')
    .eq('key', 'whatsapp_bot')
    .maybeSingle();

  if (error) {
    console.error('Error fetching bot config:', error);
    return {
      online: false,
      enabled: false,
      last_ping: null,
      next_slot: 'No programado',
      slots_remaining: 40,
    };
  }

  if (!data) {
    return {
      online: false,
      enabled: false,
      last_ping: null,
      next_slot: 'No inicializado',
      slots_remaining: 40,
    };
  }

  // Determine online status if last ping is within the last 60 seconds
  const lastPingDate = new Date(data.last_ping);
  const now = new Date();
  const diffSeconds = Math.round((now.getTime() - lastPingDate.getTime()) / 1000);
  const online = diffSeconds < 60; // online if ping is within 60s

  return {
    online,
    enabled: data.enabled,
    last_ping: data.last_ping,
    next_slot: data.next_slot || 'No programado',
    slots_remaining: data.slots_remaining,
  };
}

export async function toggleScheduler(enabled: boolean) {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('bot_config')
    .update({ enabled, updated_at: new Date().toISOString() })
    .eq('key', 'whatsapp_bot')
    .select()
    .single();

  if (error) {
    console.error('Error toggling scheduler:', error);
    throw new Error(error.message);
  }

  return { enabled: data.enabled };
}

export async function requestBotRestart() {
  const supabase = getServiceSupabase();
  const { error } = await supabase
    .from('bot_config')
    .update({ restart_requested: true, updated_at: new Date().toISOString() })
    .eq('key', 'whatsapp_bot');

  if (error) {
    console.error('Error requesting bot restart:', error);
    throw new Error(error.message);
  }

  return true;
}

export interface OutreachHistoryItem {
  id: string;
  lead_id: string;
  canal: string;
  estado: string;
  notas: string | null;
  created_at: string;
  raw_leads: {
    raw_data: {
      name?: string;
    } | null;
  } | null;
}

export async function getBotStatsAndHistory() {
  const supabase = getServiceSupabase();
  const midnightStr = await getChileMidnight();

  // 1. Envíos de hoy: outreach con canal='whatsapp' y estado='contactado' hoy
  const { data: sentTodayData, error: sentErr } = await supabase
    .from('outreach')
    .select('*, raw_leads(raw_data)')
    .eq('canal', 'whatsapp')
    .eq('estado', 'contactado')
    .gte('created_at', midnightStr)
    .order('created_at', { ascending: false });

  if (sentErr) console.error('Error fetching sent history:', sentErr);

  // 2. Respuestas recibidas: outreach con estado='respondió'
  const { data: repliesData, error: repliesErr } = await supabase
    .from('outreach')
    .select('*, raw_leads(raw_data)')
    .eq('canal', 'whatsapp')
    .eq('estado', 'respondió')
    .order('created_at', { ascending: false })
    .limit(30);

  if (repliesErr) console.error('Error fetching replies:', repliesErr);

  // 3. Leads pendientes (crm_status IS NULL)
  const { count: pendingCount, error: pendingErr } = await supabase
    .from('raw_leads')
    .select('id', { count: 'exact', head: true })
    .is('crm_status', null);

  if (pendingErr) console.error('Error counting pending leads:', pendingErr);

  return {
    sentToday: (sentTodayData || []) as OutreachHistoryItem[],
    replies: (repliesData || []) as OutreachHistoryItem[],
    pendingLeads: pendingCount || 0,
  };
}
