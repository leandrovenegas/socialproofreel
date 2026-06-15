'use client';

import { useState, useTransition } from 'react';
import { addLeadAction } from '@/app/actions/leads';

export default function LeadForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    startTransition(async () => {
      setStatus(null);
      const result = await addLeadAction(null, formData);
      if (result.success) {
        setStatus({ type: 'success', message: 'Lead added successfully.' });
        setTimeout(() => {
          setIsOpen(false);
          setStatus(null);
        }, 1500);
      } else {
        setStatus({ type: 'error', message: result.error || 'Failed to add lead.' });
      }
    });
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center px-4 py-2 bg-white text-black font-semibold rounded-lg hover:bg-slate-200 transition-colors shadow-sm"
      >
        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add Lead
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#020617] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <h2 className="text-xl font-bold text-white mb-6">New Lead</h2>
            
            {status && (
              <div className={`p-3 rounded-lg mb-6 text-sm ${status.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                {status.message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Name <span className="text-red-400">*</span></label>
                <input required type="text" name="name" className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Email <span className="text-red-400">*</span></label>
                <input required type="email" name="email" className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Company</label>
                <input type="text" name="company" className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Testimonial</label>
                <textarea name="testimonial" rows={3} className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Avatar URL</label>
                <input type="url" name="avatar_url" placeholder="https://..." className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isPending} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
                  {isPending ? 'Saving...' : 'Save Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
