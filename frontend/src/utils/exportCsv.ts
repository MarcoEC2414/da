import type { CloudService, Currency, ServiceQuote } from '../types';
import { getRegion } from '../data/regions';
import { SERVICE_KIND_LABELS, configSummary, quantityLabel } from '../data/awsServices';

export interface QuoteForExport {
  quote: ServiceQuote | null;
}

function cell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function csvNumber(n: number): string {
  return n.toFixed(2).replace('.', ',');
}

/** Arma el CSV con separador ';' y decimales con coma (formato Excel en es). */
export function buildEstimationCsv(
  services: CloudService[],
  region: string,
  currency: Currency,
  quotes: Record<string, QuoteForExport>
): string {
  const regionName = getRegion(region)?.name ?? region;
  const lines: string[] = [];

  lines.push(cell('Estimación CloudCalc (simulación AWS)'));
  lines.push(cell(`Región: ${regionName}`));
  lines.push(cell(`Moneda: ${currency}`));
  lines.push('');
  lines.push(['Servicio', 'Tipo', 'Configuración', 'Cantidad', 'Desglose', `Costo mensual (${currency})`, `Costo anual (${currency})`].map(cell).join(';'));

  let monthlyTotal = 0;
  for (const service of services) {
    const quote = quotes[service.id]?.quote;
    if (!quote) continue;
    monthlyTotal += quote.monthly;
    const breakdown = quote.breakdown.map((l) => `${l.label}: ${currency} ${csvNumber(l.amount)}`).join(' | ');
    lines.push(
      [
        service.name,
        SERVICE_KIND_LABELS[service.kind],
        configSummary(service),
        quantityLabel(service),
        breakdown,
        csvNumber(quote.monthly),
        csvNumber(quote.monthly * 12),
      ]
        .map(cell)
        .join(';')
    );
  }

  lines.push('');
  lines.push([cell('TOTAL MENSUAL'), '', '', '', '', cell(csvNumber(monthlyTotal)), cell(csvNumber(monthlyTotal * 12))].join(';'));
  lines.push('');
  lines.push(cell('Simulación académica con tarifas de referencia aproximadas. No es una cotización de AWS.'));
  return lines.join('\n');
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}