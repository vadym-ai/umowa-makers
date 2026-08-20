export interface ContractSnapshot {
  amountNet: number;
  amountWords: string;
  subject: string;
  startDate: string;
  endDate: string;
  month: number;
  year: number;
  city: string;
  paymentDays: number;
  /** Rachunek-only options; the rachunek itself is derived from this snapshot. */
  rachunek?: {
    date: string;
    kupRate: 0.5 | 0.2;
    bankAccount: string;
    paymentTerm: string;
  };
  company: {
    id: string | null;
    name: string;
    address: string | null;
    nip: string | null;
    representative: string | null;
    krs: string | null;
    regon: string | null;
    city: string | null;
  } | null;
  contractor: {
    id: string | null;
    full_name: string;
    address: string | null;
    pesel: string | null;
    document_number: string | null;
    tax_office: string | null;
    bank_account: string | null;
  } | null;
}

export interface ContractRow {
  id: string;
  org_id: string;
  company_id: string | null;
  contractor_id: string | null;
  contract_type: string;
  number: string;
  period_month: number | null;
  period_year: number | null;
  data: ContractSnapshot;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
