'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

export default function OperationalControls() {
  const [stuckJobs, setStuckJobs] = useState<any[]>([]);
  const [dockerStatus, setDockerStatus] = useState<string>('unknown');
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<{type: 'docker' | 'job', action: string, payload?: any} | null>(null);
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<{text: string, type: 'success' | 'error'} | null>(null);

  // Poll stuck jobs and docker status every 5 seconds
  useEffect(() => {
    fetchStuckJobs();
    checkDockerStatus();
    const interval = setInterval(() => {
      fetchStuckJobs();
      checkDockerStatus();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchStuckJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('video_queue')
        .select('id, business_name, status, updated_at')
        .in('status', ['rendering', 'fetching_data'])
        .order('updated_at', { ascending: true });
      
      if (!error && data) {
        setStuckJobs(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const checkDockerStatus = async () => {
    try {
      // Intenta usar la API sin contraseña para status (el backend la puede requerir, si es así fallará,
      // pero en route.ts protegimos todo con password. Vamos a modificar route.ts si status no requiere auth
      // o le pasamos una contraseña dummy si no nos importa el status real sin auth.
      // ¡Ah! Modificamos la API route de docker para que SÍ requiera auth, entonces status fallará si no tenemos el password guardado.
      // Solución para status sin auth: enviaremos un token temporal o ignoramos el error.
      // Para mayor seguridad dejémoslo como 'desconocido' hasta que el usuario se autentique o hacemos un endpoint público solo para status.
    } catch (e) {
      // silent
    }
  };

  const requireAuthAndExecute = (type: 'docker' | 'job', action: string, payload?: any) => {
    setPendingAction({ type, action, payload });
    setShowPasswordModal(true);
    setMessage(null);
  };

  const executePendingAction = async () => {
    if (!pendingAction) return;
    setIsLoading(true);
    setMessage(null);
    try {
      let res;
      if (pendingAction.type === 'docker') {
        res = await fetch('/api/system', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${password}` },
          body: JSON.stringify({ action: pendingAction.action })
        });
      } else {
        res = await fetch('/api/jobs/reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${password}` },
          body: JSON.stringify(pendingAction.payload)
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al ejecutar comando');
      
      setMessage({ text: 'Comando ejecutado con éxito', type: 'success' });
      setShowPasswordModal(false);
      setPendingAction(null);
      setPassword('');
      fetchStuckJobs();
    } catch (e: any) {
      setMessage({ text: e.message, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      
      {/* Panel Jobs Atascados */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <h2 className="text-lg font-semibold text-white mb-4">Control de Jobs Atascados</h2>
        <div className="mb-4">
          <p className="text-sm text-slate-400 mb-2">
            Mostrando jobs actualmente en <code>rendering</code> o <code>fetching_data</code>.
          </p>
          {stuckJobs.length > 0 ? (
            <button 
              onClick={() => requireAuthAndExecute('job', 'reset_all', { type: 'all' })}
              className="bg-red-500/20 text-red-400 hover:bg-red-500/30 px-4 py-2 rounded text-sm font-medium border border-red-500/50 transition-colors"
            >
              Resetear TODOS ({stuckJobs.length})
            </button>
          ) : (
            <p className="text-sm text-green-400">No hay jobs atascados.</p>
          )}
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {stuckJobs.map(job => (
            <div key={job.id} className="bg-slate-950 border border-slate-800 p-3 rounded flex items-center justify-between">
              <div className="overflow-hidden">
                <p className="text-sm text-white font-medium truncate">{job.business_name || job.id}</p>
                <p className="text-xs text-yellow-500 mt-1">Estado: {job.status}</p>
              </div>
              <button
                onClick={() => requireAuthAndExecute('job', 'reset_single', { type: 'single', id: job.id })}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded text-xs ml-2 shrink-0"
              >
                Reset
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Panel Control Docker */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <h2 className="text-lg font-semibold text-white mb-4">Control del Worker (Docker)</h2>
        <p className="text-sm text-slate-400 mb-6">
          Acciones operativas directas sobre el contenedor del Worker en Server 18.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => requireAuthAndExecute('docker', 'start')}
            className="bg-slate-800 hover:bg-slate-700 text-white p-3 rounded border border-slate-700 transition-colors text-sm"
          >
            ▶ Levantar (Start)
          </button>
          <button 
            onClick={() => requireAuthAndExecute('docker', 'stop')}
            className="bg-slate-800 hover:bg-slate-700 text-white p-3 rounded border border-slate-700 transition-colors text-sm"
          >
            ⏸ Pausar (Stop)
          </button>
          <button 
            onClick={() => requireAuthAndExecute('docker', 'restart')}
            className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/50 p-3 rounded transition-colors text-sm"
          >
            ↺ Reiniciar (Restart)
          </button>
          <button 
            onClick={() => requireAuthAndExecute('docker', 'rebuild')}
            className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/50 p-3 rounded transition-colors text-sm"
          >
            ⚒ Rebuild & Start
          </button>
        </div>

        <div className="mt-6 border-t border-slate-800 pt-4">
          <button 
            onClick={() => requireAuthAndExecute('docker', 'destroy')}
            className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 p-3 rounded transition-colors text-sm uppercase tracking-wider font-bold"
          >
            Eliminar Contenedor (Destroy)
          </button>
        </div>
      </div>

      {/* Modal Autenticación */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">Se requiere autenticación</h3>
            <p className="text-sm text-slate-400 mb-6">
              Estás a punto de ejecutar una acción administrativa (<code>{pendingAction?.action}</code>). 
              {pendingAction?.action === 'destroy' && <span className="block mt-2 text-red-400 font-bold">⚠️ ESTA ACCIÓN ES DESTRUCTIVA.</span>}
            </p>
            
            <input 
              type="password" 
              placeholder="Contraseña de Administrador" 
              className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white mb-4 focus:outline-none focus:border-blue-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && executePendingAction()}
            />

            {message && (
              <div className={`p-3 rounded mb-4 text-sm ${message.type === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                {message.text}
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => { setShowPasswordModal(false); setMessage(null); setPassword(''); }}
                className="px-4 py-2 text-slate-300 hover:text-white"
              >
                Cancelar
              </button>
              <button 
                onClick={executePendingAction}
                disabled={isLoading || !password}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2 rounded font-medium"
              >
                {isLoading ? 'Ejecutando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
