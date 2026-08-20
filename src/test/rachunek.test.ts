import { describe, it, expect } from "vitest";
import { calcRachunek } from "@/lib/rachunek";
import { amountInWordsGroszePl } from "@/lib/numberToWords";

describe("calcRachunek", () => {
  it("reproduces the real invoice (netto 2800, KUP 50%)", () => {
    expect(calcRachunek({ netto: 2800, kupRate: 0.5 })).toEqual({
      brutto: 2979,
      kup: 1489.5,
      podstawa: 1490,
      podatekNaliczony: 178.8,
      podatekUS: 179,
      doWyplaty: 2800,
    });
  });

  it("netto 8000 → brutto 8511 / podatek 511", () => {
    const c = calcRachunek({ netto: 8000, kupRate: 0.5 });
    expect(c.brutto).toBe(8511);
    expect(c.podatekUS).toBe(511);
    expect(c.doWyplaty).toBe(8000);
  });

  it("netto 1500 → brutto 1596 / podatek 96", () => {
    const c = calcRachunek({ netto: 1500, kupRate: 0.5 });
    expect(c.brutto).toBe(1596);
    expect(c.podatekUS).toBe(96);
    expect(c.doWyplaty).toBe(1500);
  });

  it("20% KUP variant pays out exactly the net amount", () => {
    const c = calcRachunek({ netto: 2800, kupRate: 0.2 });
    expect(c.kup).toBe(Math.round(c.brutto * 0.2 * 100) / 100);
    expect(c.podstawa).toBe(Math.round(c.brutto - c.kup));
    expect(c.podatekUS).toBe(Math.round(c.podstawa * 0.12));
    expect(c.doWyplaty).toBe(2800);
  });
});

describe("amountInWordsGroszePl", () => {
  it("spells out złote and grosze", () => {
    expect(amountInWordsGroszePl(2800)).toBe("Dwa tysiące osiemset złotych zero groszy");
    expect(amountInWordsGroszePl(1.01)).toBe("Jeden złoty jeden grosz");
    expect(amountInWordsGroszePl(5.03)).toBe("Pięć złotych trzy grosze");
    expect(amountInWordsGroszePl(2.25)).toBe("Dwa złote dwadzieścia pięć groszy");
  });
});
