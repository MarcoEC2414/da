export function Disclaimer() {
  return (
    <p className="flex items-start gap-2 text-xs leading-relaxed text-slate-400 dark:text-slate-500">
      <svg className="mt-0.5 h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
      <span>
        Proyecto académico: los valores usan <strong>tarifas de referencia aproximadas</strong> y no
        constituyen una cotización oficial de AWS.
      </span>
    </p>
  );
}