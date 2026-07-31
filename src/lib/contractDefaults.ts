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

export function saveClient(data: ClientData) {
  localStorage.setItem("uod_client", JSON.stringify(data));
}

export function saveContractor(data: ContractorData) {
  localStorage.setItem("uod_contractor", JSON.stringify(data));
}

export function saveSettings(data: ContractSettings) {
  localStorage.setItem("uod_settings", JSON.stringify(data));
}

export type ResetPeriod = "monthly" | "yearly" | "never";
