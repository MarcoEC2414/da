import type { CloudService, Currency, ServiceKind } from '../types';
import { createServiceFromKind, getServiceDefinition } from '../data/awsServices';
import { DEFAULT_REGION } from '../data/regions';

export interface EstimationState {
  services: CloudService[];
  region: string;
  currency: Currency;
}

export type EstimationAction =
  | { type: 'addService'; kind: ServiceKind }
  | { type: 'addServiceWithSpec'; service: CloudService }
  | { type: 'updateService'; service: CloudService }
  | { type: 'removeService'; id: string }
  | { type: 'duplicateService'; id: string }
  | { type: 'setRegion'; region: string }
  | { type: 'setCurrency'; currency: Currency }
  | { type: 'restore'; state: EstimationState }
  | { type: 'reset' };

export const initialEstimationState: EstimationState = {
  services: [],
  region: DEFAULT_REGION,
  currency: 'USD',
};

function newId(): string {
  return crypto.randomUUID();
}

/** Nombre automático estilo AWS Pricing Calculator: «Amazon EC2 1», «Amazon RDS 2», … */
function autoName(kind: ServiceKind, services: CloudService[]): string {
  const n = services.filter((s) => s.kind === kind).length + 1;
  return `${getServiceDefinition(kind).name} ${n}`;
}

export function estimationReducer(state: EstimationState, action: EstimationAction): EstimationState {
  switch (action.type) {
    case 'addService': {
      const id = newId();
      const service = { ...createServiceFromKind(action.kind, id), name: autoName(action.kind, state.services) };
      return { ...state, services: [...state.services, service] };
    }
    case 'addServiceWithSpec':
      return {
        ...state,
        services: [
          ...state.services,
          { ...action.service, id: newId(), name: autoName(action.service.kind, state.services) },
        ],
      };
    case 'updateService':
      return {
        ...state,
        services: state.services.map((s) => (s.id === action.service.id ? action.service : s)),
      };
    case 'removeService':
      return { ...state, services: state.services.filter((s) => s.id !== action.id) };
    case 'duplicateService': {
      const source = state.services.find((s) => s.id === action.id);
      if (!source) return state;
      return { ...state, services: [...state.services, { ...source, id: newId() }] };
    }
    case 'setRegion':
      return { ...state, region: action.region };
    case 'setCurrency':
      return { ...state, currency: action.currency };
    case 'restore':
      return {
        services: action.state.services.filter((s) => s && typeof s === 'object' && s.id && s.kind && s.spec),
        region: action.state.region,
        currency: action.state.currency,
      };
    case 'reset':
      return initialEstimationState;
    default:
      return state;
  }
}