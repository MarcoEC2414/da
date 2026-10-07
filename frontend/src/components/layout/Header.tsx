import { CurrencySelector } from './CurrencySelector';
import { ThemeToggle } from './ThemeToggle';

export function Header({
  step = 'config',
  onStepChange,
  canGoToResult = false,
}: {
  step?: 'config' | 'result';
  onStepChange?: (step: 'config' | 'result') => void;
  canGoToResult?: boolean;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-md dark:border-slate-800/80 dark:bg-[#0b0f19]/90">
      <div className="mx-auto flex w-full max-w-[1720px] items-center justify-between gap-4 px-4 py-2.5 sm:px-6">
        {/* IZQUIERDA: Marca y subtítulo */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/20">
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                CloudCalc
              </span>
              <span className="hidden rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600 dark:bg-blue-400/10 dark:text-blue-400 sm:inline-block">
                AWS
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Estimador de costos en la nube · AWS
            </p>
          </div>
        </div>

        {/* CENTRO: Stepper visual */}
        <nav aria-label="Progreso de estimación" className="hidden md:flex items-center gap-2">
          <button
            type="button"
            onClick={() => onStepChange?.('config')}
            className={`group flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              step === 'config'
                ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-500/30 dark:bg-blue-950/60 dark:text-blue-300 dark:ring-blue-500/40'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                step === 'config'
                  ? 'bg-blue-600 text-white dark:bg-blue-500'
                  : 'bg-emerald-500/20 text-emerald-600 dark:bg-emerald-500/30 dark:text-emerald-300'
              }`}
            >
              {step === 'result' ? (
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                '1'
              )}
            </span>
            <span>Configurar</span>
          </button>

          {/* Línea conectora */}
          <div className="h-0.5 w-8 rounded bg-slate-200 dark:bg-slate-800" />

          <button
            type="button"
            disabled={!canGoToResult && step !== 'result'}
            onClick={() => {
              if (canGoToResult || step === 'result') onStepChange?.('result');
            }}
            className={`group flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              step === 'result'
                ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-500/30 dark:bg-indigo-950/60 dark:text-indigo-300 dark:ring-indigo-500/40'
                : canGoToResult
                ? 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer'
                : 'text-slate-400 opacity-60 cursor-not-allowed dark:text-slate-600'
            }`}
          >
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                step === 'result'
                  ? 'bg-indigo-600 text-white dark:bg-indigo-500'
                  : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              2
            </span>
            <span>Resultados</span>
          </button>
        </nav>

        {/* DERECHA: Moneda y Tema */}
        <div className="flex items-center gap-2 sm:gap-3">
          <CurrencySelector />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}