import QueueMonitor from "./QueueMonitor";
import Link from "next/link";

const quickLinks = [
  {
    href: "/dashboard/leads",
    title: "Base de Leads",
    description: "Gestiona los testimonios recolectados de tus clientes.",
    icon: "👥",
    color: "from-blue-500/10 to-indigo-500/10 border-blue-500/20 text-blue-400",
  },
  {
    href: "/dashboard/crm",
    title: "CRM Leads",
    description: "Flujo de prospección y estado del pipeline en tiempo real.",
    icon: "💼",
    color: "from-emerald-500/10 to-teal-500/10 border-emerald-500/20 text-emerald-400",
  },
  {
    href: "/dashboard/outreach",
    title: "Outreach WA",
    description: "Envía videos generados automáticamente por WhatsApp.",
    icon: "💬",
    color: "from-green-500/10 to-emerald-500/10 border-green-500/20 text-green-400",
  },
  {
    href: "/dashboard/rubros",
    title: "Rubros / Nichos",
    description: "Clasifica y organiza prospectos según su sector.",
    icon: "🏷️",
    color: "from-amber-500/10 to-orange-500/10 border-amber-500/20 text-amber-400",
  },
  {
    href: "/dashboard/queue",
    title: "Cola Detallada",
    description: "Administración completa e histórico de tareas de video.",
    icon: "📋",
    color: "from-purple-500/10 to-pink-500/10 border-purple-500/20 text-purple-400",
  },
  {
    href: "/dashboard/editor",
    title: "Editor de Plantilla",
    description: "Ajusta diseños, colores y efectos en tiempo real.",
    icon: "🎨",
    color: "from-indigo-500/10 to-purple-500/10 border-indigo-500/20 text-indigo-400",
  },
  {
    href: "/dashboard/settings",
    title: "Ajustes de Marca",
    description: "Configura tipografía y branding general del lienzo.",
    icon: "⚙️",
    color: "from-slate-500/10 to-slate-700/10 border-slate-500/20 text-slate-400",
  },
];

export default function DashboardPage() {
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-10">
      {/* Header Sección Principal */}
      <div className="border-b border-white/5 pb-6">
        <h1 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
          Panel de Control
        </h1>
        <p className="text-slate-400 mt-2 text-lg">
          Genera, monitorea y distribuye reels dinámicos a partir de reseñas de Google Maps.
        </p>
      </div>

      {/* Grid de Accesos Directos */}
      <div>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
          Accesos Directos a Secciones
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col p-5 rounded-xl border bg-[#020617]/30 backdrop-blur-sm hover:bg-white/[0.02] hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300 group ${link.color}`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl p-2 rounded-lg bg-white/5 group-hover:scale-110 transition-transform">
                  {link.icon}
                </span>
                <span className="text-xs font-medium text-slate-500 group-hover:text-slate-300 transition-colors">
                  Ir →
                </span>
              </div>
              <h3 className="text-base font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">
                {link.title}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {link.description}
              </p>
            </Link>
          ))}
        </div>
      </div>

      {/* Cola de Renderizado */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="animate-pulse w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            Monitor de Renderizado Activo
          </h2>
          <Link
            href="/dashboard/queue"
            className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors"
          >
            Ver historial completo →
          </Link>
        </div>
        <QueueMonitor />
      </div>
    </div>
  );
}