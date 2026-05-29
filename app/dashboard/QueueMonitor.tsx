'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { VideoQueue } from '@/lib/types';

export default function QueueMonitor() {
  const [queue, setQueue] = useState<VideoQueue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQueue = async () => {
      const { data, error } = await supabase
        .from('video_queue')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setQueue(data as VideoQueue[]);
      }
      setLoading(false);
    };

    fetchQueue();

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'video_queue' },
        (payload) => {
          setQueue((current) => [payload.new as VideoQueue, ...current]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'video_queue' },
        (payload) => {
          setQueue((current) =>
            current.map((item) => (item.id === payload.new.id ? (payload.new as VideoQueue) : item))
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'video_queue' },
        (payload) => {
          setQueue((current) => current.filter((item) => item.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  if (queue.length === 0) {
    return (
      <div className="p-8 text-center bg-[#020617] border border-white/5 rounded-xl">
        <p className="text-slate-400">No videos in queue.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {queue.map((item) => (
        <div 
          key={item.id} 
          className="p-5 bg-[#020617] border border-white/5 rounded-xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-white/10"
        >
          {/* Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-semibold text-white">Task {item.id.slice(0, 8)}</h3>
              <StatusBadge status={item.status} />
            </div>
            <p className="text-sm text-slate-400">
              Lead ID: {item.lead_id?.slice(0, 8) || 'N/A'} • {new Date(item.created_at).toLocaleString()}
            </p>
          </div>

          {/* Action / Player */}
          <div className="w-full md:w-auto">
            {item.status === 'completed' && item.bunny_url && (
              <div className="w-full md:w-64 aspect-video bg-black rounded-lg overflow-hidden border border-white/10 shadow-inner">
                <iframe
                  src={item.bunny_url}
                  className="w-full h-full"
                  allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                  allowFullScreen
                ></iframe>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: VideoQueue['status'] }) {
  switch (status) {
    case 'pending':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1.5"></span>
          Pending
        </span>
      );
    case 'processing':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-900/30 text-blue-400 border border-blue-800/50">
          <svg className="animate-spin -ml-1 mr-1.5 h-3 w-3 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Processing
        </span>
      );
    case 'completed':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-900/30 text-emerald-400 border border-emerald-800/50">
          <svg className="w-3 h-3 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
          </svg>
          Completed
        </span>
      );
    default:
      return null;
  }
}
