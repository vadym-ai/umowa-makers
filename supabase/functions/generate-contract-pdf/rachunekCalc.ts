/**
 * Rachunek (invoice) calculation for a Polish "umowa o dzieło" (no ZUS).
 *
 * IMPORTANT: this is a verbatim copy of src/lib/rachunek.ts — edge functions
 * cannot import from src/. Keep both files identical.
 */

export interface RachunekInput {
  netto: number;
  kupRate: 0.5 | 0.2;
  taxRate?: number;
}

export interface RachunekCalc {
  brutto: number;
  kup: number;
  podstawa: number;
  podatekNaliczony: number;
  podatekUS: number;
  doWyplaty: number;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function fromBrutto(brutto: number, kupRate: number, taxRate: number): RachunekCalc {
  const kup = round2(brutto * kupRate);
  const podstawa = Math.round(brutto - kup);
  const podatekNaliczony = round2(podstawa * taxRate);
  const podatekUS = Math.round(podstawa * taxRate);
  const doWyplaty = round2(brutto - podatekUS);
  return { brutto, kup, podstawa, podatekNaliczony, podatekUS, doWyplaty };
}

export function calcRachunek({ netto, kupRate = 0.5, taxRate = 0.12 }: RachunekInput): RachunekCalc {
  const target = Number.isFinite(netto) ? netto : 0;
  const start = Math.round(target / (1 - taxRate * (1 - kupRate)));
  for (let b = start - 3; b <= start + 3; b++) {
    if (b <= 0) continue;
    const c = fromBrutto(b, kupRate, taxRate);
    if (c.doWyplaty === target) return c;
  }
  return fromBrutto(start, kupRate, taxRate);
}
