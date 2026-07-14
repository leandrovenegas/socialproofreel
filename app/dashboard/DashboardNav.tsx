'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/dashboard', label: 'Monitor', icon: '🎬' },
  { href: '/dashboard/leads', label: 'Leads', icon: '👥' },
  { href: '/dashboard/crm', label: 'CRM', icon: '💼' },
  { href: '/dashboard/outreach', label: 'Outreach', icon: '💬' },
  { href: '/dashboard/rubros', label: 'Rubros', icon: '🏷️' },
  { href: '/dashboard/queue', label: 'Cola', icon: '📋' },
  { href: '/dashboard/system-logs', label: 'System Logs', icon: '🖥️' },
  { href: '/dashboard/settings', label: 'Ajustes', icon: '⚙️' },
];

export default function DashboardNav() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // No renderizar el menú si estamos en el editor de video
  if (pathname === '/dashboard/editor') {
    return null;
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo y Branding */}
          <div className="flex items-center">
            <Link 
              href="/dashboard" 
              className="flex items-center gap-2 font-extrabold text-white text-lg tracking-tight hover:opacity-90 transition-opacity"
            >
              <span className="text-xl">🎬</span>
              <span>
                SocialProof<span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">REEL</span>
              </span>
            </Link>
          </div>

          {/* Menú de navegación Desktop */}
          <div className="hidden md:flex items-center gap-1.5">
            {navItems.map((item) => {
              const isActive = item.href === '/dashboard' 
                ? pathname === '/dashboard' 
                : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium border transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-600/10 text-blue-400 border-blue-500/25 shadow-[0_0_12px_rgba(59,130,246,0.08)]'
                      : 'text-slate-400 border-transparent hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Botón de Acción Principal Desktop */}
          <div className="hidden md:flex items-center">
            <Link
              href="/dashboard/editor"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-md shadow-blue-500/10 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>🎨</span>
              <span>Editor</span>
            </Link>
          </div>

          {/* Botón de Menú Mobile (Hamburger) */}
          <div className="flex md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 focus:outline-none transition-colors border border-transparent hover:border-white/5"
              aria-controls="mobile-menu"
              aria-expanded="false"
            >
              <span className="sr-only">Abrir menú principal</span>
              {!isOpen ? (
                <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Menú Mobile desplegable */}
      <div 
        className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out border-b border-white/5 bg-slate-950/95 ${
          isOpen ? 'max-h-96 opacity-100 py-3' : 'max-h-0 opacity-0 pointer-events-none'
        }`}
        id="mobile-menu"
      >
        <div className="px-2 space-y-1">
          {navItems.map((item) => {
            const isActive = item.href === '/dashboard' 
              ? pathname === '/dashboard' 
              : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-base font-medium border transition-all ${
                  isActive
                    ? 'bg-blue-600/10 text-blue-400 border-blue-500/25 shadow-sm'
                    : 'text-slate-400 border-transparent hover:text-white hover:bg-white/5'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
          
          <div className="border-t border-white/10 my-3 pt-3 px-2">
            <Link
              href="/dashboard/editor"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg text-base font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 shadow-md transition-all active:scale-95"
            >
              <span>🎨</span>
              <span>Ir al Editor de Video</span>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
