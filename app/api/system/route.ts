import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

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
    const action = body.action; // 'start', 'stop', 'restart', 'rebuild', 'destroy', 'status'
    const containerName = process.env.WORKER_CONTAINER_NAME || 'socialproof-worker';

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    let command = '';
    
    switch (action) {
      case 'status':
        command = `docker inspect -f "{{.State.Status}}" ${containerName}`;
        break;
      case 'start':
        command = `docker start ${containerName}`;
        break;
      case 'stop':
        command = `docker stop ${containerName}`;
        break;
      case 'restart':
        command = `docker restart ${containerName}`;
        break;
      case 'destroy':
        command = `docker rm -f ${containerName}`;
        break;
      case 'rebuild':
        // Asume que el contexto de build está en /home/vicente/proyects/SocialProofREEL-Worker
        // Esto puede variar según la estructura real del servidor, ajustar ruta si es necesario.
        const workerPath = '/home/vicente/proyects/SocialProofREEL-Worker';
        command = `cd ${workerPath} && docker build -t socialproof-worker-image . && docker rm -f ${containerName} || true && docker run -d --name ${containerName} --env-file .env -v /home/vicente/proyects/SocialProofREEL-Worker/videos_locales:/app/videos_locales socialproof-worker-image`;
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    try {
      const { stdout, stderr } = await execAsync(command);
      
      let status = 'unknown';
      if (action === 'status') {
        status = stdout.trim() || 'not_found';
      }

      return NextResponse.json({ 
        success: true, 
        action, 
        status: action === 'status' ? status : undefined,
        output: stdout,
        error_output: stderr 
      });
    } catch (cmdError: any) {
      // If docker inspect fails, it usually means container doesn't exist
      if (action === 'status' && cmdError.code !== 0) {
        return NextResponse.json({ success: true, action: 'status', status: 'not_found' });
      }
      console.error(`Command error for ${action}:`, cmdError);
      return NextResponse.json({ 
        error: 'Command failed', 
        details: cmdError.message,
        stderr: cmdError.stderr 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('System API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
