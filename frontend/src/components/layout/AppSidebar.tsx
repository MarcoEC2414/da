import type { ServiceKind } from '../../types';
import { SERVICE_DEFINITIONS, SERVICE_KIND_LABELS } from '../../data/awsServices';
import { useEstimation } from '../../state/EstimationProvider';

export type SidebarNavView = 'estimate' | 'scenarios' | 'regions' | 'compare';

interface AppSidebarProps {
  currentView: SidebarNavView;
  onNavigate: (view: SidebarNavView) => void;
  onSelectServiceKind: (kind: ServiceKind) => void;
  step: 'config' | 'result';
}

const SERVICE_ICONS: Record<ServiceKind, (props: { className?: string }) => React.JSX.Element> = {
  ec2: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="8" rx="2" />
      <rect x="2" y="14" width="20" height="8" rx="2" />
      <line x1="6" y1="6" x2="6.01" y2="6" />
      <line x1="6" y1="18" x2="6.01" y2="18" />
    </svg>
  ),
  rds: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  ),
  s3: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  ),
  lambda: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  ),
  dynamodb: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h16M4 12h16M4 18h16" />
      <circle cx="8" cy="6" r="1" fill="currentColor" />
      <circle cx="8" cy="12" r="1" fill="currentColor" />
      <circle cx="8" cy="18" r="1" fill="currentColor" />
    </svg>
  ),
  sns: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  cloudfront: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
  route53: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 19 21 12 17 5 21 12 2" />
    </svg>
  ),
};

const SERVICE_COLORS: Record<ServiceKind, string> = {
  ec2: 'text-amber-500 bg-amber-500/10 group-hover:bg-amber-500/20',
  rds: 'text-blue-500 bg-blue-500/10 group-hover:bg-blue-500/20',
  s3: 'text-emerald-500 bg-emerald-500/10 group-hover:bg-emerald-500/20',
  lambda: 'text-orange-500 bg-orange-500/10 group-hover:bg-orange-500/20',
  dynamodb: 'text-indigo-400 bg-indigo-500/10 group-hover:bg-indigo-500/20',
  sns: 'text-rose-500 bg-rose-500/10 group-hover:bg-rose-500/20',
  cloudfront: 'text-purple-400 bg-purple-500/10 group-hover:bg-purple-500/20',
  route53: 'text-sky-400 bg-sky-500/10 group-hover:bg-sky-500/20',
};

export function AppSidebar({
  currentView,
  onNavigate,
  onSelectServiceKind,
  step,
}: AppSidebarProps) {
  const { state, scenarios } = useEstimation();

  // Contar cuántas instancias de cada servicio existen en la estimación activa
  const serviceCountByKind = state.services.reduce<Record<string, number>>((acc, s) => {
    acc[s.kind] = (acc[s.kind] || 0) + 1;
    return acc;
  }, {});

  return (
    <aside className="w-64 shrink-0 flex flex-col gap-6 border-r border-slate-200/80 bg-white/70 p-4 backdrop-blur-md dark:border-slate-800/80 dark:bg-[#0b0f19]/70">
      {/* Navegación Principal */}
      <div>
        <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Navegación
        </p>
        <nav className="space-y-1">
          {/* Nueva Estimación */}
          <button
            type="button"
            onClick={() => onNavigate('estimate')}
            className={`group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold transition-all ${
              currentView === 'estimate'
                ? 'bg-blue-600/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400 relative before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:rounded-r before:bg-blue-600 dark:before:bg-blue-400'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span>{step === 'result' ? 'Ver estimación' : 'Nueva estimación'}</span>
            </span>
            {state.services.length > 0 && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                {state.services.length}
              </span>
            )}
          </button>

          {/* Mis Estimaciones / Escenarios */}
          <button
            type="button"
            onClick={() => onNavigate('scenarios')}
            className={`group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold transition-all ${
              currentView === 'scenarios'
                ? 'bg-blue-600/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400 relative before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:rounded-r before:bg-blue-600 dark:before:bg-blue-400'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              <span>Mis estimaciones</span>
            </span>
            {scenarios.length > 0 && (
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {scenarios.length}
              </span>
            )}
          </button>

          {/* Explorar Regiones */}
          <button
            type="button"
            onClick={() => onNavigate('regions')}
            className={`group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold transition-all ${
              currentView === 'regions'
                ? 'bg-blue-600/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400 relative before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:rounded-r before:bg-blue-600 dark:before:bg-blue-400'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              <span>Explorar regiones</span>
            </span>
          </button>

          {/* Comparar Precios / Ahorro */}
          <button
            type="button"
            onClick={() => onNavigate('compare')}
            className={`group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold transition-all ${
              currentView === 'compare'
                ? 'bg-blue-600/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400 relative before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:rounded-r before:bg-blue-600 dark:before:bg-blue-400'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
              <span>Comparar precios</span>
            </span>
          </button>
        </nav>
      </div>

      {/* Servicios de AWS */}
      <div className="flex-1 overflow-y-auto pr-1">
        <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Servicios de AWS
        </p>
        <div className="space-y-1">
          {SERVICE_DEFINITIONS.map((s) => {
            const Icon = SERVICE_ICONS[s.kind];
            const colorClass = SERVICE_COLORS[s.kind];
            const count = serviceCountByKind[s.kind] || 0;

            return (
              <button
                key={s.kind}
                type="button"
                onClick={() => onSelectServiceKind(s.kind)}
                className="group flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs transition-colors hover:bg-slate-100 dark:hover:bg-slate-800/60"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg transition-colors ${colorClass}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-800 group-hover:text-blue-600 dark:text-slate-200 dark:group-hover:text-blue-400">
                      {s.kind.toUpperCase()}
                    </p>
                    <p className="truncate text-[10px] text-slate-400 dark:text-slate-500">
                      {SERVICE_KIND_LABELS[s.kind]}
                    </p>
                  </div>
                </div>

                {count > 0 && (
                  <span className="shrink-0 rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
