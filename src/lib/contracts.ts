export interface ContractSnapshot {
  amountNet: number;
  amountWords: string;
  subject: string;
  startDate: string;
  endDate: string;
  month: number;
  year: number;
  company: {
    id: string | null;
    name: string;
    address: string | null;
    nip: string | null;
    representative: string | null;
  } | null;
  contractor: {
    id: string | null;
    full_name: string;
    address: string | null;
    pesel: string | null;
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
