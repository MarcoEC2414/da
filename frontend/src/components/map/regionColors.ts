/* Rampa de color barato -> caro, válida en claro y oscuro. */

export const NO_DATA_COLOR = '#94a3b8';

const RAMP = [
  { f: 0, hex: '#34d399' },
  { f: 0.25, hex: '#84cc16' },
  { f: 0.5, hex: '#fbbf24' },
  { f: 0.75, hex: '#fb923c' },
  { f: 1, hex: '#f87171' },
];

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

function lerpHex(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return `rgb(${lerp(r1, r2, t)}, ${lerp(g1, g2, t)}, ${lerp(b1, b2, t)})`;
}

export function rampColor(frac: number): string {
  const t = Math.min(1, Math.max(0, frac));
  for (let i = 0; i < RAMP.length - 1; i += 1) {
    const lo = RAMP[i];
    const hi = RAMP[i + 1];
    if (t <= hi.f) {
      const local = (t - lo.f) / (hi.f - lo.f);
      return lerpHex(lo.hex, hi.hex, local);
    }
  }
  return RAMP[RAMP.length - 1].hex;
}

/** Color de relleno de un marcador según su costo mensual relativo. */
export function markerFill(monthly: number, min: number, max: number): string {
  const frac = max > min ? (monthly - min) / (max - min) : 1;
  return rampColor(frac);
}