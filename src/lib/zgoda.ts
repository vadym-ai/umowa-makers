import { numberToPolishWords } from "@/lib/numberToWords";

export type PeriodUnit = "months" | "years";

/**
 * "3 (trzy) lata", "5 (pięć) miesięcy" — Polish declension for the § 2 phrase.
 * Keep in sync with supabase/functions/generate-contract-pdf/renderZgoda.ts
 */
export function polishPeriodPhrase(n: number, unit: PeriodUnit): string {
  const count = Math.max(1, Math.floor(Number.isFinite(n) ? n : 1));
  const lastDigit = count % 10;
  const lastTwo = count % 100;
  const few = lastDigit >= 2 && lastDigit <= 4 && !(lastTwo >= 12 && lastTwo <= 14);

  let word: string;
  if (unit === "years") {
    word = count === 1 ? "rok" : few ? "lata" : "lat";
  } else {
    word = count === 1 ? "miesiąc" : few ? "miesiące" : "miesięcy";
  }
  return `${count} (${numberToPolishWords(count)}) ${word}`;
}

/** Adds N months / N years to an ISO date (YYYY-MM-DD) and returns an ISO date. */
export function addPeriod(isoDate: string, n: number, unit: PeriodUnit): string {
  const [y, m, d] = (isoDate || "").split("-").map(Number);
  if (!y || !m || !d) return isoDate;
  const count = Math.max(1, Math.floor(Number.isFinite(n) ? n : 1));
  const target = new Date(y, m - 1, d);
  if (unit === "years") target.setFullYear(target.getFullYear() + count);
  else target.setMonth(target.getMonth() + count);
  const pad = (v: number) => v.toString().padStart(2, "0");
  return `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}`;
}

/** "Vadym Moskalenko – Członek Zarządu" -> "Vadym Moskalenko" */
export function representativeName(line: string): string {
  return line.split(/[–—-]/)[0].trim();
}

/** Splits company.representative into individual lines. */
export function representativeLines(representative: string | null | undefined): string[] {
  return (representative ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}
