'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { format } from 'date-fns';
import OperationalControls from './OperationalControls';

type LogEntry = {
  id: number;
  created_at: string;
  level: string;
  message: string;
  module: string;
};

type ModuleStatus = {
  module: string;
  status: 'info' | 'warning' | 'error';
  lastSeen: string;
  message: string;
};

export default function SystemLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [modules, setModules] = useState<Record<string, ModuleStatus>>({});
  const [filterModule, setFilterModule] = useState<string>('all');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    fetchInitialLogs();
    
    // Subscribe to real-time changes
    const channel = supabase
      .channel('worker_logs_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'worker_logs',
        },
        (payload) => {
          const newLog = payload.new as LogEntry;
          setLogs((prev) => [...prev, newLog]);
          updateModuleStatus(newLog);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const fetchInitialLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('worker_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;

      if (data) {
        // Reverse because we want oldest first in the terminal view (bottom = newest)
        const sortedLogs = data.reverse();
        setLogs(sortedLogs);

        // Compute module status from initial logs (only process latest for each module)
        const mods: Record<string, ModuleStatus> = {};
        for (const log of sortedLogs) {
          mods[log.module] = {
            module: log.module,
            status: log.level as 'info' | 'warning' | 'error',
            lastSeen: log.created_at,
            message: log.message
          };
        }
        setModules(mods);
      }
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateModuleStatus = (log: LogEntry) => {
    setModules((prev) => ({
      ...prev,
      [log.module]: {
        module: log.module,
        status: log.level as 'info' | 'warning' | 'error',
        lastSeen: log.created_at,
        message: log.message
      }
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'error': return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'warning': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      default: return 'bg-green-500/20 text-green-400 border-green-500/50';
    }
  };

  const getLogColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'error': return 'text-red-400';
      case 'warning': return 'text-yellow-400';
      default: return 'text-slate-300';
    }
  };

  const filteredLogs = logs.filter(log => {
    if (filterModule !== 'all' && log.module !== filterModule) return false;
    if (filterLevel !== 'all' && log.level.toLowerCase() !== filterLevel) return false;
    return true;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">System Logs</h1>
          <p className="text-slate-400 text-sm mt-1">Supervisión en tiempo real de los procesos del Worker</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Module Status Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <h2 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">Estado de Módulos</h2>
            <div className="space-y-3">
              {Object.values(modules).length === 0 && !isLoading && (
                <p className="text-slate-500 text-sm">No hay módulos activos.</p>
              )}
              {Object.values(modules).map((mod) => (
                <div key={mod.module} className={`p-3 rounded-lg border ${getStatusColor(mod.status)}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm font-mono">{mod.module}</span>
                    <span className="w-2 h-2 rounded-full bg-current animate-pulse"></span>
                  </div>
                  <p className="text-xs opacity-80 truncate" title={mod.message}>{mod.message}</p>
                  <p className="text-[10px] opacity-60 mt-2 text-right">
                    {format(new Date(mod.lastSeen), 'HH:mm:ss')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Log Feed Terminal */}
        <div className="lg:col-span-3 flex flex-col h-[70vh] bg-[#0A0A0B] border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
          
          {/* Terminal Header & Filters */}
          <div className="bg-slate-900 border-b border-slate-800 p-3 flex items-center justify-between">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
            </div>
            
            <div className="flex items-center gap-3">
              <select 
                className="bg-slate-950 border border-slate-700 text-sm rounded-md px-2 py-1 text-slate-300 focus:outline-none focus:border-blue-500"
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
              >
                <option value="all">Todos los niveles</option>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
              </select>

              <select 
                className="bg-slate-950 border border-slate-700 text-sm rounded-md px-2 py-1 text-slate-300 focus:outline-none focus:border-blue-500"
                value={filterModule}
                onChange={(e) => setFilterModule(e.target.value)}
              >
                <option value="all">Todos los módulos</option>
                {Object.keys(modules).map(mod => (
                  <option key={mod} value={mod}>{mod}</option>
                ))}
              </select>

              <button 
                onClick={() => setAutoScroll(!autoScroll)}
                className={`text-xs px-2 py-1 rounded ${autoScroll ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-400'}`}
              >
                Auto-scroll
              </button>
            </div>
          </div>

          {/* Log Lines */}
          <div className="flex-1 overflow-y-auto p-4 font-mono text-sm space-y-1.5 scroll-smooth">
            {isLoading ? (
              <div className="text-slate-500 animate-pulse">Cargando logs...</div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-slate-500">No hay logs que coincidan con los filtros.</div>
            ) : (
              filteredLogs.map((log) => (
                <div key={log.id} className="flex gap-3 hover:bg-white/5 px-2 py-0.5 rounded transition-colors group">
                  <span className="text-slate-600 shrink-0 select-none">
                    {format(new Date(log.created_at), 'HH:mm:ss.SSS')}
                  </span>
                  <span className={`shrink-0 w-16 uppercase text-xs font-bold pt-0.5 ${getLogColor(log.level)}`}>
                    [{log.level}]
                  </span>
                  <span className="text-blue-400 shrink-0 w-32 truncate" title={log.module}>
                    {log.module}
                  </span>
                  <span className="text-slate-300 whitespace-pre-wrap break-all">
                    {log.message}
                  </span>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>
        </div>
      </div>
      
      <OperationalControls />
    </div>
  );
}
