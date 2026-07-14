import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// We must use the service role key to bypass RLS for administrative resets
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const password = process.env.DASHBOARD_ADMIN_PASSWORD;

    if (!password) {
      return NextResponse.json({ error: 'System not configured for admin actions' }, { status: 500 });
    }

    if (!authHeader || authHeader !== `Bearer ${password}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, type } = body; // type can be 'single' or 'all'

    if (type === 'all') {
      // Reset all stuck jobs
      const { data, error } = await supabase
        .from('video_queue')
        .update({ 
          status: 'pending',
          error_message: 'Manual reset from dashboard'
        })
        .in('status', ['rendering', 'fetching_data'])
        .select('id');

      if (error) throw error;
      return NextResponse.json({ success: true, count: data?.length || 0 });
      
    } else if (type === 'single' && id) {
      // Reset a single job
      const { data, error } = await supabase
        .from('video_queue')
        .update({ 
          status: 'pending',
          error_message: 'Manual reset from dashboard'
        })
        .eq('id', id)
        .in('status', ['rendering', 'fetching_data'])
        .select('id');

      if (error) throw error;
      return NextResponse.json({ success: true, count: data?.length || 0 });
    } else {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Job Reset API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
