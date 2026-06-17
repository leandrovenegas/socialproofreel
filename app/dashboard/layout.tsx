import React from 'react';
import DashboardNav from './DashboardNav';

export const metadata = {
  title: 'Panel de Control | Social Proof Reel',
  description: 'Administra tus testimonios y genera videos dinámicos a partir de tus reseñas de Google.',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-[#020617]">
      <DashboardNav />
      <div className="flex-grow w-full">
        {children}
      </div>
    </div>
  );
}
