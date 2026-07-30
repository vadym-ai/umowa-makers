export interface ClientData {
  companyName: string;
  companyAddress: string;
  representative: string;
}

export interface ContractorData {
  fullName: string;
  address: string;
}

export interface ContractSettings {
  prefix: string;
}

export type ContractCounters = Record<string, number>; // key: "MM/YY" -> count

export const defaultClient: ClientData = {
  companyName: "Przykładowa Firma Sp. z o.o.",
  companyAddress: "ul. Testowa 1, 00-000 Warszawa",
  representative: "Jan Kowalski",
};

export const defaultContractor: ContractorData = {
  fullName: "Jan Nowak",
  address: "ul. Fikcyjna 2/3, 00-000 Kraków",
};

export const defaultSettings: ContractSettings = {
  prefix: "W-",
};

export function loadClient(): ClientData {
  try {
    const stored = localStorage.getItem("uod_client");
    if (stored) return JSON.parse(stored);
  } catch {}
  return { ...defaultClient };
}

export function loadContractor(): ContractorData {
  try {
    const stored = localStorage.getItem("uod_contractor");
    if (stored) return JSON.parse(stored);
  } catch {}
  return { ...defaultContractor };
}

export function loadSettings(): ContractSettings {
  try {
    const stored = localStorage.getItem("uod_settings");
    if (stored) return JSON.parse(stored);
  } catch {}
  return { ...defaultSettings };
}

export function loadCounters(): ContractCounters {
  try {
    const stored = localStorage.getItem("uod_counters");
    if (stored) return JSON.parse(stored);
  } catch {}
  return {};
}

export function saveClient(data: ClientData) {
  localStorage.setItem("uod_client", JSON.stringify(data));
}

export function saveContractor(data: ContractorData) {
  localStorage.setItem("uod_contractor", JSON.stringify(data));
}

export function saveSettings(data: ContractSettings) {
  localStorage.setItem("uod_settings", JSON.stringify(data));
}

export function saveCounters(data: ContractCounters) {
  localStorage.setItem("uod_counters", JSON.stringify(data));
}

export type ResetPeriod = "monthly" | "yearly" | "never";

export function getCounterKey(month: number, year: number, period: ResetPeriod = "monthly"): string {
  if (period === "never") return "all";
  if (period === "yearly") return `${year}`;
  return `${month.toString().padStart(2, "0")}/${year.toString().slice(-2)}`;
}

export function getCurrentCounter(month: number, year: number, period: ResetPeriod = "monthly"): number {
  const counters = loadCounters();
  return (counters[getCounterKey(month, year, period)] || 0) + 1;
}

export function incrementCounter(month: number, year: number, period: ResetPeriod = "monthly"): number {
  const counters = loadCounters();
  const key = getCounterKey(month, year, period);
  const newCount = (counters[key] || 0) + 1;
  counters[key] = newCount;
  saveCounters(counters);
  return newCount + 1; // return NEXT number
}

export function formatContractNumber(
  format: string,
  opts: { prefix: string; counter: number; month: number; year: number }
): string {
  const nn = opts.counter.toString().padStart(2, "0");
  return format
    .replace(/\{prefix\}/gi, opts.prefix)
    .replace(/\{NNN\}/g, opts.counter.toString().padStart(3, "0"))
    .replace(/\{NN\}/g, nn)
    .replace(/\{N\}/g, opts.counter.toString())
    .replace(/\{MM\}/g, opts.month.toString().padStart(2, "0"))
    .replace(/\{YYYY\}/g, opts.year.toString())
    .replace(/\{YY\}/g, opts.year.toString().slice(-2));
}
