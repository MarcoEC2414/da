import { useState } from 'react';
import { useEstimation } from '../../state/EstimationProvider';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

export function SaveScenario() {
  const { saveScenario, scenarios } = useEstimation();
  const [name, setName] = useState('');
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const handleSave = () => {
    if (!name.trim()) return;
    saveScenario(name);
    setSavedAt(name.trim());
    setName('');
  };

  return (
    <Card className="no-print p-4">
      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Guardar escenario</p>
      <p className="mt-0.5 text-xs text-slate-400">
        Guarda esta estimación para compararla o reutilizarla después ({scenarios.length} guardado(s)).
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setSavedAt(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
          }}
          placeholder="Nombre del escenario (p. ej. App web con RDS)"
          className="h-9 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
        <Button size="sm" onClick={handleSave} disabled={!name.trim()}>
          Guardar
        </Button>
      </div>
      {savedAt ? (
        <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">
          «{savedAt}» guardado (reemplaza cualquier escenario con el mismo nombre).
        </p>
      ) : null}
    </Card>
  );
}