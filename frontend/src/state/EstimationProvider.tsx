import { createContext, useContext, useEffect, useMemo, useState, useReducer, type ReactNode } from 'react';
import type { CloudService, Currency, ServiceKind } from '../types';
import {
  estimationReducer,
  initialEstimationState,
  type EstimationState,
} from './estimationReducer';
import {
  deleteScenario,
  listScenarios,
  saveScenario,
  type SavedScenario,
} from './scenariosStore';

const STORAGE_KEY = 'cloudcalc:estimation:v1';

interface EstimationContextValue {
  state: EstimationState;
  addService: (kind: ServiceKind) => void;
  addServiceWithSpec: (service: CloudService) => void;
  updateService: (service: CloudService) => void;
  removeService: (id: string) => void;
  duplicateService: (id: string) => void;
  setRegion: (region: string) => void;
  setCurrency: (currency: Currency) => void;
  scenarios: SavedScenario[];
  saveScenario: (name: string) => void;
  loadScenario: (id: string) => void;
  deleteScenario: (id: string) => void;
}

const EstimationContext = createContext<EstimationContextValue | null>(null);

function isAwsService(value: unknown): value is CloudService {
  if (!value || typeof value !== 'object') return false;
  const s = value as Partial<CloudService>;
  return typeof s.id === 'string' && typeof s.kind === 'string' && !!s.spec && typeof s.spec === 'object';
}

function loadInitial(): EstimationState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialEstimationState;
    const parsed = JSON.parse(raw) as Partial<EstimationState>;
    return {
      // Servicios antiguos (modelo GCP) se descartan: solo se conservan los AWS.
      services: Array.isArray(parsed.services) ? parsed.services.filter(isAwsService) : [],
      region: typeof parsed.region === 'string' ? parsed.region : initialEstimationState.region,
      currency: (parsed.currency as Currency | undefined) ?? initialEstimationState.currency,
    };
  } catch {
    return initialEstimationState;
  }
}

export function EstimationProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(estimationReducer, undefined, loadInitial);
  const [scenarios, setScenarios] = useState<SavedScenario[]>(listScenarios);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // almacenamiento no disponible: el estado sigue vivo en memoria
    }
  }, [state]);

  const value = useMemo<EstimationContextValue>(
    () => ({
      state,
      addService: (kind) => dispatch({ type: 'addService', kind }),
      addServiceWithSpec: (service) => dispatch({ type: 'addServiceWithSpec', service }),
      updateService: (service) => dispatch({ type: 'updateService', service }),
      removeService: (id) => dispatch({ type: 'removeService', id }),
      duplicateService: (id) => dispatch({ type: 'duplicateService', id }),
      setRegion: (region) => dispatch({ type: 'setRegion', region }),
      setCurrency: (currency) => dispatch({ type: 'setCurrency', currency }),
      scenarios,
      saveScenario: (name) => setScenarios(saveScenario(name, state)),
      loadScenario: (id) => {
        const target = scenarios.find((s) => s.id === id);
        if (target) dispatch({ type: 'restore', state: target.state });
      },
      deleteScenario: (id) => setScenarios(deleteScenario(id)),
    }),
    [state, scenarios],
  );

  return <EstimationContext.Provider value={value}>{children}</EstimationContext.Provider>;
}

export function useEstimation(): EstimationContextValue {
  const ctx = useContext(EstimationContext);
  if (!ctx) throw new Error('useEstimation debe usarse dentro de <EstimationProvider>');
  return ctx;
}