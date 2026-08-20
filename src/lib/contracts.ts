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
  /** Manually edited document HTML (umowa / zgoda), sanitised before rendering. */
  editedHtml?: string | null;
  editedAt?: string | null;
  /** Rachunek-only options; the rachunek itself is derived from this snapshot. */
  rachunek?: {
    date: string;
    kupRate: 0.5 | 0.2;
    bankAccount: string;
    paymentTerm: string;
    editedHtml?: string | null;
    editedAt?: string | null;
  };
  /** Zgoda na wykorzystanie materiałów — document-specific options. */
  zgoda?: {
    representative: string;
    periodCount: number;
    periodUnit: "months" | "years";
    paid: boolean;
    amount: number | null;
    endDate: string;
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
    email?: string | null;
    phone?: string | null;
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
