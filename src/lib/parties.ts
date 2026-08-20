export interface Company {
  id: string;
  org_id: string;
  name: string;
  address: string | null;
  nip: string | null;
  representative: string | null;
  krs: string | null;
  regon: string | null;
  city: string | null;
  is_default?: boolean;
}

export interface Contractor {
  id: string;
  org_id: string;
  full_name: string;
  address: string | null;
  pesel: string | null;
  document_number: string | null;
  tax_office: string | null;
  bank_account: string | null;
  email: string | null;
  phone: string | null;
  is_default?: boolean;
}


export interface NumberingRule {
  id: string;
  org_id: string;
  prefix: string;
  format: string;
  reset_period: string;
}
