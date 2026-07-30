import { forwardRef } from "react";
import { Company, Contractor } from "@/lib/parties";

interface ContractPreviewProps {
  contractNumber: string;
  startDate: string;
  endDate: string;
  company: Company | null;
  contractor: Contractor | null;
  subject: string;
  amountNet: number;
  amountWords: string;
}

export const ContractPreview = forwardRef<HTMLDivElement, ContractPreviewProps>(
  ({ contractNumber, startDate, endDate, company, contractor, subject, amountNet, amountWords }, ref) => {
    return (
      <div ref={ref} className="a4-page">
        <h2>UMOWA O DZIEŁO {contractNumber}</h2>
        <div className="subtitle">wraz z przeniesieniem praw autorskich</div>

        <p>
          Umowa zawarta w dniu {startDate} r., w Warszawie, pomiędzy:
        </p>
        <p>
          <strong>{company?.name || "—"}</strong>, {company?.address || "—"}
        </p>
        {company?.nip && <p>NIP: {company.nip}</p>}
        <p>
          Reprezentowanym przez p. {company?.representative || "—"} zwanym dalej <strong>Zamawiającym</strong>, a
        </p>
        <p>
          p. <strong>{contractor?.full_name || "—"}</strong>, {contractor?.address || "—"}
        </p>
        <p>
          zwanym dalej <strong>Wykonawcą</strong>, o następującej treści:
        </p>

        <div className="section-title">§ 1</div>
        <p>
          Zamawiający powierza wykonanie, a Wykonawca zobowiązuje się wykonać dzieło polegające na: {subject}
        </p>

        <div className="section-title">§ 2</div>
        <p>
          1. Wykonawca oświadcza, iż posiada wiedzę, kwalifikacje i umiejętności niezbędne dla wykonania dzieła.
        </p>
        <p>
          2. Wykonawca oświadcza, że wykona dzieło w sposób staranny, sumienny i prawidłowy, zgodnie ze specyfiką dzieła oraz informacjami i wytycznymi ze strony Zamawiającego.
        </p>
        <p>
          3. Wykonawca oświadcza, że dzieło będzie wynikiem jego oryginalnej twórczości i nie będzie naruszać praw osób trzecich.
        </p>

        <div className="section-title">§ 3</div>
        <p>
          1. W razie stwierdzenia nieprawidłowości oświadczeń z § 2 lub wad prawnych dzieła, Zamawiający będzie uprawniony do odstąpienia od umowy lub żądania zwrotu wypłaconego wynagrodzenia.
        </p>
        <p>
          2. Dzieło ma charakter indywidualny i jest przedmiotem prawa autorskiego.
        </p>

        <div className="section-title">§ 4</div>
        <p>
          Termin rozpoczęcia dzieła strony ustaliły na dzień {startDate} r., a wykonania na dzień {endDate} r.
        </p>

        <div className="section-title">§ 5</div>
        <p>
          Wykonawcy przysługuje wynagrodzenie za wykonanie dzieła w wysokości {amountNet},00 zł netto (słownie: {amountWords} złotych) i jest płatne z góry.
        </p>

        <div className="section-title">§ 6</div>
        <p>
          1. Wykonawca zobowiązuje się przenieść na Zamawiającego całość autorskich praw majątkowych do dzieła, bez ograniczeń czasowych i terytorialnych.
        </p>
        <p>
          2. Wykonawca upoważnia Zamawiającego do rozporządzania i korzystania z opracowań dzieła.
        </p>
        <p>
          3. Przejście praw autorskich nastąpi z momentem przekazania dzieła Zamawiającemu.
        </p>

        <div className="section-title">§ 7</div>
        <p>
          1. W sprawach nieuregulowanych mają zastosowanie przepisy Kodeksu cywilnego oraz ustawy o prawie autorskim.
        </p>
        <p>
          2. Spory rozpoznawane będą przez sąd właściwy dla siedziby Zamawiającego.
        </p>

        <div className="section-title">§ 8</div>
        <p>
          Umowę sporządzono w 2 jednobrzmiących egzemplarzach.
        </p>

        <div className="signatures">
          <div>
            <p>............................................</p>
            <p>Zamawiający</p>
          </div>
          <div>
            <p>............................................</p>
            <p>Wykonawca</p>
          </div>
        </div>

        <div className="rodo">
          <p>
            Wyrażam zgodę na przetwarzanie moich danych osobowych dla potrzeb niezbędnych do realizacji procesu zatrudnienia zgodnie z Rozporządzeniem Parlamentu Europejskiego i Rady (UE) 2016/679 z dnia 27 kwietnia 2016 r. (RODO).
          </p>
          <p style={{ marginTop: "16pt" }}>............................................</p>
          <p>Podpis Wykonawcy</p>
        </div>
      </div>
    );
  }
);

ContractPreview.displayName = "ContractPreview";
