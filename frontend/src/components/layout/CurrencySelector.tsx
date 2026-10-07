import { useEstimation } from '../../state/EstimationProvider';
import { CURRENCIES } from '../../data/currencies';
import { Select } from '../ui/Select';

/**
 * Selector de moneda (USD por defecto). El backend cotiza en USD; EUR/MXN se
 * convierten con un tipo de cambio fijo de referencia (ver data/fx.ts).
 */
export function CurrencySelector() {
  const { state, setCurrency } = useEstimation();

  return (
    <Select label="Moneda" value={state.currency} onChange={(e) => setCurrency(e.target.value as typeof state.currency)}>
      {CURRENCIES.map((c) => (
        <option key={c.id} value={c.id}>
          {c.label}
        </option>
      ))}
    </Select>
  );
}