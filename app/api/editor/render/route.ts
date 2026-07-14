import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const execAsync = promisify(exec);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { video, config, action } = body;

    if (!video) {
      return NextResponse.json({ error: 'Missing video' }, { status: 400 });
    }

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

    if (!bizId) {
      return NextResponse.json({ error: 'Missing business_id in video metadata' }, { status: 400 });
    }

    // Ruta del Worker
    const os = require('os');
    const isWindows = os.platform() === 'win32';
    const workerPath = isWindows 
      ? '\\\\192.168.1.18\\Vicente\\proyects\\SocialProofREEL-Worker' 
      : '/home/vicente/proyects/SocialProofREEL-Worker';
    const leadDir = path.join(workerPath, 'videos_locales', bizId);
    
    // Opcional: limpiar videos anteriores si es "overwrite"
    const fs = require('fs');
    if (action === 'overwrite') {
      if (fs.existsSync(leadDir)) {
        const files = fs.readdirSync(leadDir);
        files.forEach((f: string) => {
          if (f.startsWith('video_v') && f.endsWith('.mp4')) {
            fs.unlinkSync(path.join(leadDir, f));
          }
        });
        console.log(`[API Render] Videos anteriores borrados por acción overwrite.`);
      }
    }

    // 2. Ejecutar render_remotion.py con bandera --force y pasándole el ID de video_queue
    console.log(`[API Render] Iniciando render_remotion.py para ${leadDir} (ID: ${video.id})...`);
    const { stdout: renderOut, stderr: renderErr } = await execAsync(`python3 render_remotion.py "${leadDir}" --id "${video.id}" --force`, {
      cwd: workerPath,
    });
    
    console.log('[API Render] Render output:', renderOut);
    if (renderErr) console.error('[API Render] Render stderr:', renderErr);
    
    const match = renderOut.match(/\[CLI\] Video ready:\s*(.+)/);
    if (!match) {
      return NextResponse.json({ error: 'No se encontró la ruta del video en la salida' }, { status: 500 });
    }
    
    const videoPath = match[1].trim();
    
    // 3. Ejecutar upload_to_bunny.py
    console.log(`[API Render] Subiendo a BunnyCDN: ${videoPath}...`);
    const { stdout: uploadOut, stderr: uploadErr } = await execAsync(`python3 upload_to_bunny.py "${videoPath}"`, {
      cwd: workerPath
    });
    
    console.log('[API Render] Upload output:', uploadOut);
    if (uploadErr) console.error('[API Render] Upload stderr:', uploadErr);
    
    const bunnyMatch = uploadOut.match(/(https:\/\/[^\s]+\.mp4)/);
    let bunnyUrl = video.bunny_url;
    if (bunnyMatch) {
      bunnyUrl = bunnyMatch[1];
      await supabase.from('video_queue').update({ bunny_url: bunnyUrl }).eq('id', video.id);
    }

    return NextResponse.json({ success: true, videoPath, bunnyUrl });
  } catch (error: any) {
    console.error('[API Render] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
