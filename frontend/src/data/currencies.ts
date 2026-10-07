import type { Currency } from '../types';

export interface CurrencyOption {
  id: Currency;
  label: string;
  symbol: string;
  /** El backend cotiza en USD; el resto son conversiones de referencia. */
  availableInCatalog: boolean;
}

export const CURRENCIES: CurrencyOption[] = [
  { id: 'USD', label: 'USD', symbol: '$', availableInCatalog: true },
  { id: 'EUR', label: 'EUR', symbol: '€', availableInCatalog: false },
  { id: 'MXN', label: 'MXN', symbol: 'MX$', availableInCatalog: false },
  { id: 'PEN', label: 'PEN', symbol: 'S/', availableInCatalog: false },
];

export function getCurrency(id: Currency): CurrencyOption {
  return CURRENCIES.find((c) => c.id === id) ?? CURRENCIES[0];
}