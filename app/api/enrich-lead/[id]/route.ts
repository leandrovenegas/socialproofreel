import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

const PLACES_BASE = "https://maps.googleapis.com/maps/api/place";

async function fetchContactData(placeId: string, apiKey: string) {
  const fields = "formatted_phone_number,international_phone_number,website";
  const url = `${PLACES_BASE}/details/json?place_id=${placeId}&fields=${fields}&key=${apiKey}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Places API error: ${res.status}`);
  const data = await res.json();
  if (data.status !== "OK") throw new Error(`Places status: ${data.status}`);
  const result = data.result ?? {};
  return {
    phone: result.formatted_phone_number ?? null,
    phone_international: result.international_phone_number ?? null,
    website: result.website ?? null,
  };
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GOOGLE_PLACES_API_KEY not set" }, { status: 500 });
  }

  const { data: lead, error: fetchError } = await supabase
    .from("raw_leads")
    .select("id, raw_data")
    .eq("id", id)
    .single();

  if (fetchError || !lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

const url = lead.raw_data?.url ?? '';
const match = url.match(/!19s([A-Za-z0-9_\-]+)/);
const placeId = match ? match[1] : null;
  if (!placeId) {
    return NextResponse.json({ error: "No place_id in raw_data" }, { status: 400 });
  }

  let contactData;
  try {
    contactData = await fetchContactData(placeId, apiKey);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }

  const { error: updateError } = await supabase
    .from("raw_leads")
    .update({ contact_data: contactData })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, contact_data: contactData });
}
