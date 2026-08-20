import { Company, Contractor } from "@/lib/parties";

interface PartyTableProps {
  company: Company | null;
  contractor: Contractor | null;
}

export function partyLines(company: Company | null, contractor: Contractor | null) {
  const repLines = (company?.representative ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const left: string[] = [];
  if (company?.name) left.push(`${company.name} reprezentowana przez:`);
  left.push(...repLines);
  if (company?.address) left.push(company.address);
  if (company?.krs) left.push(`KRS: ${company.krs}`);
  if (company?.regon) left.push(`REGON: ${company.regon}`);
  if (company?.nip) left.push(`NIP: ${company.nip}`);

  const right: string[] = [];
  if (contractor?.full_name) right.push(`Imię i Nazwisko: ${contractor.full_name}`);
  if (contractor?.address) right.push(`Adres: ${contractor.address}`);
  if (contractor?.pesel) right.push(`PESEL: ${contractor.pesel}`);
  if (contractor?.document_number) right.push(`Dokument: ${contractor.document_number}`);
  if (contractor?.tax_office) right.push(`Urząd Skarbowy: ${contractor.tax_office}`);

  return { left, right };
}

/** Shared party table used by both the umowa and the rachunek preview. */
export function PartyTable({ company, contractor }: PartyTableProps) {
  const { left, right } = partyLines(company, contractor);
  return (
    <table className="party-table">
      <thead>
        <tr>
          <th>ZAMAWIAJĄCY</th>
          <th>WYKONAWCA</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            {left.map((l, i) => (
              <div key={i}>{l}</div>
            ))}
          </td>
          <td>
            {right.map((l, i) => (
              <div key={i}>{l}</div>
            ))}
          </td>
        </tr>
      </tbody>
    </table>
  );
}
