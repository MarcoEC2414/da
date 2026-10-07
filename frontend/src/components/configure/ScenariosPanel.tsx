import { useEstimation } from '../../state/EstimationProvider';
import { Card } from '../ui/Card';

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

export function ScenariosPanel() {
  const { scenarios, loadScenario, deleteScenario } = useEstimation();

  if (scenarios.length === 0) return null;

  return (
    <Card className="no-print p-4">
      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Tus escenarios guardados</p>
      <ul className="mt-3 space-y-2">
        {scenarios.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{s.name}</p>
              <p className="text-xs text-slate-400">
                {s.state.services.length} servicio(s) · guardado {formatDate(s.savedAt)}
              </p>
            </div>
            <div className="flex shrink-0 gap-1.5">
              <button
                type="button"
                onClick={() => loadScenario(s.id)}
                className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300 dark:hover:bg-indigo-950"
              >
                Aplicar
              </button>
              <button
                type="button"
                onClick={() => deleteScenario(s.id)}
                className="rounded-lg px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/60"
              >
                Borrar
              </button>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}