import type { EstimationState } from './estimationReducer';

const STORAGE_KEY = 'cloudcalc:scenarios:v1';

export interface SavedScenario {
  id: string;
  name: string;
  savedAt: string;
  state: EstimationState;
}

function readAll(): SavedScenario[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (s): s is SavedScenario =>
        !!s && typeof s === 'object' && typeof (s as SavedScenario).id === 'string' && typeof (s as SavedScenario).name === 'string' && !!s.state,
    );
  } catch {
    return [];
  }
}

function writeAll(scenarios: SavedScenario[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios));
  } catch {
    // almacenamiento no disponible
  }
}

export function listScenarios(): SavedScenario[] {
  return readAll();
}

/** Guarda o reemplaza un escenario con el mismo nombre (insensible a mayúsculas). */
export function saveScenario(name: string, state: EstimationState): SavedScenario[] {
  const trimmed = name.trim();
  if (!trimmed) return readAll();
  const all = readAll();
  const next = [
    { id: crypto.randomUUID(), name: trimmed, savedAt: new Date().toISOString(), state },
    ...all.filter((s) => s.name.toLocaleLowerCase() !== trimmed.toLocaleLowerCase()),
  ];
  writeAll(next);
  return next;
}

export function deleteScenario(id: string): SavedScenario[] {
  const next = readAll().filter((s) => s.id !== id);
  writeAll(next);
  return next;
}