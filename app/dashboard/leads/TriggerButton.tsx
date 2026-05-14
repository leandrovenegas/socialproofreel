'use client';

import { useTransition, useState } from 'react';
import { generateVideoTaskAction } from '@/app/actions/leads';

export default function TriggerButton({ leadId }: { leadId: string }) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleTrigger = () => {
    startTransition(async () => {
      const result = await generateVideoTaskAction(leadId);
      if (result.success) {
        setStatus('success');
        setTimeout(() => setStatus('idle'), 3000);
      } else {
        setStatus('error');
        console.error(result.error);
        setTimeout(() => setStatus('idle'), 3000);
      }
    });
  };

  return (
    <button
      onClick={handleTrigger}
      disabled={isPending || status === 'success'}
      className={`inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-md transition-all shadow-sm ${
        status === 'success' 
          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
          : status === 'error'
          ? 'bg-red-500/10 text-red-400 border border-red-500/20'
          : 'bg-white text-black hover:bg-slate-200 border border-transparent'
      } disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {isPending ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Triggering...
        </>
      ) : status === 'success' ? (
        'Queued'
      ) : status === 'error' ? (
        'Failed'
      ) : (
        <>
          <svg className="w-3.5 h-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Send to Queue
        </>
      )}
    </button>
  );
}
