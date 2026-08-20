import { forwardRef } from "react";
import { Company, Contractor } from "@/lib/parties";
import { PartyTable } from "@/components/PartyTable";
import { formatPln, amountInWordsGroszePl } from "@/lib/numberToWords";
import { calcRachunek } from "@/lib/rachunek";

interface RachunekPreviewProps {
  contractNumber: string;
  rachunekDate: string;
  company: Company | null;
  contractor: Contractor | null;
  amountNet: number;
  kupRate: 0.5 | 0.2;
  bankAccount: string;
  paymentTerm: string;
}

/** Keep this template in sync with supabase/functions/generate-contract-pdf/renderRachunek.ts */
export const RachunekPreview = forwardRef<HTMLDivElement, RachunekPreviewProps>(
  ({ contractNumber, rachunekDate, company, contractor, amountNet, kupRate, bankAccount, paymentTerm }, ref) => {
    const c = calcRachunek({ netto: amountNet, kupRate });
    const zero = "0,00 zł";

    const rows: { label: string; value: string; bold?: boolean }[] = [
      { label: "Kwota rachunku brutto", value: formatPln(c.brutto), bold: true },
      { label: "Składka emerytalna (9,76%)", value: zero },
      { label: "Składka rentowa (1,50%)", value: zero },
      { label: "Składka chorobowa (2,45%)", value: zero },
      { label: "Przychód", value: formatPln(c.brutto), bold: true },
      { label: `Koszt uzyskania przychodu (${kupRate === 0.5 ? "50" : "20"}%)`, value: formatPln(c.kup) },
      { label: "Podstawa opodatkowania", value: `${c.podstawa} zł` },
      { label: "Naliczony podatek (12,00%)", value: formatPln(c.podatekNaliczony) },
      { label: "Składka na ubezpieczenie zdrowotne (9,00%)", value: zero },
      { label: "Do odliczenia (-1,00%)", value: zero },
      { label: "Podatek do Urzędu Skarbowego", value: `${c.podatekUS} zł` },
      { label: "Wypłacono zaliczkę", value: zero },
      { label: "Do wypłaty", value: formatPln(c.doWyplaty), bold: true },
    ];

    return (
      <div ref={ref} className="a4-page">
        <h2>Rachunek z dnia {rachunekDate}</h2>
        <div className="subtitle">do umowy o dzieło nr {contractNumber}</div>

        <PartyTable company={company} contractor={contractor} />

        <div className="bank-block">
          <div>Numer rachunku bankowego</div>
          <div>{bankAccount || "—"}</div>
        </div>

        <table className="amount-table">
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={r.bold ? { fontWeight: "bold" } : undefined}>
                <td>{r.label}</td>
                <td className="amount">{r.value}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p>Słownie: {amountInWordsGroszePl(c.doWyplaty)}</p>
        <p>Termin płatności: {paymentTerm}</p>

        <div className="signatures">
          <div>
            <p>Potwierdzam wykonanie umowy</p>
            <p>............................................</p>
            <p>Podpis zamawiającego</p>
          </div>
          <div>
            <p>Kwituję odbiór w/w kwoty</p>
            <p>............................................</p>
            <p>Podpis wykonawcy</p>
          </div>
        </div>
      </div>
    );
  },
);

RachunekPreview.displayName = "RachunekPreview";
