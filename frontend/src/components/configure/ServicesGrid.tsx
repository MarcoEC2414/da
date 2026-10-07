import type { ServiceKind } from '../../types';
import { SERVICE_DEFINITIONS } from '../../data/awsServices';
import { useEstimation } from '../../state/EstimationProvider';

interface ServicesGridProps {
  onConfigureKind: (kind: ServiceKind) => void;
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

const SERVICE_THEMES: Record<
  ServiceKind,
  {
    iconWrap: string;
    borderActive: string;
    glow: string;
    badge: string;
  }
> = {
  ec2: {
    iconWrap: 'text-amber-500 bg-amber-500/10 group-hover:bg-amber-500/20',
    borderActive: 'border-amber-500/60 dark:border-amber-500/50',
    glow: 'shadow-amber-500/10',
    badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
  },
  rds: {
    iconWrap: 'text-blue-500 bg-blue-500/10 group-hover:bg-blue-500/20',
    borderActive: 'border-blue-500/60 dark:border-blue-500/50',
    glow: 'shadow-blue-500/10',
    badge: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
  },
  s3: {
    iconWrap: 'text-emerald-500 bg-emerald-500/10 group-hover:bg-emerald-500/20',
    borderActive: 'border-emerald-500/60 dark:border-emerald-500/50',
    glow: 'shadow-emerald-500/10',
    badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
  },
  lambda: {
    iconWrap: 'text-orange-500 bg-orange-500/10 group-hover:bg-orange-500/20',
    borderActive: 'border-orange-500/60 dark:border-orange-500/50',
    glow: 'shadow-orange-500/10',
    badge: 'bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300',
  },
  dynamodb: {
    iconWrap: 'text-indigo-400 bg-indigo-500/10 group-hover:bg-indigo-500/20',
    borderActive: 'border-indigo-500/60 dark:border-indigo-500/50',
    glow: 'shadow-indigo-500/10',
    badge: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300',
  },
  sns: {
    iconWrap: 'text-rose-500 bg-rose-500/10 group-hover:bg-rose-500/20',
    borderActive: 'border-rose-500/60 dark:border-rose-500/50',
    glow: 'shadow-rose-500/10',
    badge: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
  },
  cloudfront: {
    iconWrap: 'text-purple-400 bg-purple-500/10 group-hover:bg-purple-500/20',
    borderActive: 'border-purple-500/60 dark:border-purple-500/50',
    glow: 'shadow-purple-500/10',
    badge: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300',
  },
  route53: {
    iconWrap: 'text-sky-400 bg-sky-500/10 group-hover:bg-sky-500/20',
    borderActive: 'border-sky-500/60 dark:border-sky-500/50',
    glow: 'shadow-sky-500/10',
    badge: 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300',
  },
};

export function ServicesGrid({ onConfigureKind }: ServicesGridProps) {
  const { state } = useEstimation();

  const countByKind = state.services.reduce<Record<string, number>>((acc, s) => {
    acc[s.kind] = (acc[s.kind] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
          Servicios de AWS
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Selecciona y configura los servicios que deseas incluir en tu estimación.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
        {SERVICE_DEFINITIONS.map((s) => {
          const Icon = SERVICE_ICONS[s.kind];
          const theme = SERVICE_THEMES[s.kind];
          const count = countByKind[s.kind] || 0;
          const isAdded = count > 0;

          return (
            <div
              key={s.kind}
              onClick={() => onConfigureKind(s.kind)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onConfigureKind(s.kind);
                }
              }}
              className={`group relative flex cursor-pointer flex-col justify-between rounded-xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                isAdded
                  ? `border-blue-500/50 bg-blue-50/20 shadow-sm dark:border-blue-500/40 dark:bg-[#11192e] ${theme.glow}`
                  : 'border-slate-200/80 bg-white hover:border-slate-300 dark:border-slate-800/80 dark:bg-[#0f172a] dark:hover:border-slate-700'
              }`}
            >
              <div>
                {/* Cabecera de la tarjeta */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl transition-all duration-200 ${theme.iconWrap}`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 transition-colors group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
                        {s.name}
                      </h3>
                      <span className="text-[11px] font-medium text-slate-400 dark:text-slate-400">
                        {s.provider}
                      </span>
                    </div>
                  </div>

                  {isAdded && (
                    <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:bg-blue-400/15 dark:text-blue-300">
                      {count} {count === 1 ? 'añadido' : 'añadidos'}
                    </span>
                  )}
                </div>

                {/* Descripción técnica breve */}
                <p className="mt-2.5 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  {s.description}
                </p>
              </div>

              {/* Pie de tarjeta con botón de configuración */}
              <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800/80">
                <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                  {s.fields.length} parámetros
                </span>

                <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 transition-colors group-hover:text-blue-700 dark:text-blue-400 dark:group-hover:text-blue-300">
                  <span>{isAdded ? '+ Añadir otro' : '+ Configurar'}</span>
                  <svg className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
