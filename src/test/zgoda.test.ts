import { describe, expect, it } from "vitest";
import { addPeriod, polishPeriodPhrase, representativeName } from "@/lib/zgoda";

describe("polishPeriodPhrase", () => {
  it("declines months", () => {
    expect(polishPeriodPhrase(1, "months")).toBe("1 (jeden) miesiąc");
    expect(polishPeriodPhrase(2, "months")).toBe("2 (dwa) miesiące");
    expect(polishPeriodPhrase(3, "months")).toBe("3 (trzy) miesiące");
    expect(polishPeriodPhrase(5, "months")).toBe("5 (pięć) miesięcy");
    expect(polishPeriodPhrase(12, "months")).toBe("12 (dwanaście) miesięcy");
    expect(polishPeriodPhrase(22, "months")).toBe("22 (dwadzieścia dwa) miesiące");
  });

  it("declines years", () => {
    expect(polishPeriodPhrase(1, "years")).toBe("1 (jeden) rok");
    expect(polishPeriodPhrase(2, "years")).toBe("2 (dwa) lata");
    expect(polishPeriodPhrase(3, "years")).toBe("3 (trzy) lata");
    expect(polishPeriodPhrase(5, "years")).toBe("5 (pięć) lat");
    expect(polishPeriodPhrase(13, "years")).toBe("13 (trzynaście) lat");
  });
});

describe("addPeriod", () => {
  it("adds years and months", () => {
    expect(addPeriod("2026-08-20", 3, "years")).toBe("2029-08-20");
    expect(addPeriod("2026-08-20", 6, "months")).toBe("2027-02-20");
  });
});

describe("representativeName", () => {
  it("keeps only the name part", () => {
    expect(representativeName("Vadym Moskalenko – Członek Zarządu")).toBe("Vadym Moskalenko");
    expect(representativeName("Anna Nowak")).toBe("Anna Nowak");
  });
});
