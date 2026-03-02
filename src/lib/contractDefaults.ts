export interface ClientData {
  companyName: string;
  companyAddress: string;
  representative: string;
}

export interface ContractorData {
  fullName: string;
  address: string;
}

export const defaultClient: ClientData = {
  companyName: "GREENCARE CLINIC SP. Z O.O.",
  companyAddress: "ul. Złota 7/28, 00-019 Warszawa",
  representative: "Taras Kravchuk",
};

export const defaultContractor: ContractorData = {
  fullName: "Vadym Moskalenko",
  address: "ul. Holzera 3/66, 02-972 Warszawa",
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

export function saveClient(data: ClientData) {
  localStorage.setItem("uod_client", JSON.stringify(data));
}

export function saveContractor(data: ContractorData) {
  localStorage.setItem("uod_contractor", JSON.stringify(data));
}
