import { forwardRef } from "react";
import { Company, Contractor } from "@/lib/parties";
import { shortCompanyName } from "@/lib/zgoda";

export interface ZgodaPreviewProps {
  documentNumber: string;
  date: string;
  endDate: string;
  city: string;
  company: Company | null;
  contractor: Contractor | null;
  representative: string;
  periodPhrase: string;
  paid: boolean;
  amount: number | null;
}

const DASH = "……………………";

/** Keep this template in sync with supabase/functions/generate-contract-pdf/renderZgoda.ts */
export const ZgodaPreview = forwardRef<HTMLDivElement, ZgodaPreviewProps>(
  (
    { documentNumber, date, endDate, city, company, contractor, representative, periodPhrase, paid, amount },
    ref,
  ) => {
    const peselOrDoc = contractor?.pesel || contractor?.document_number || DASH;
    const amountText = paid && amount ? String(amount) : DASH;

    return (
      <div ref={ref} className="a4-page">
        <h2>ZGODA NA WYKORZYSTANIE WIZERUNKU I MATERIAŁÓW WIDEO</h2>
        <div className="subtitle">nr {documentNumber}</div>

        <p>
          Zawarta w dniu {date} w {city} pomiędzy:
        </p>

        <p>
          1. {company?.name || DASH} z siedzibą pod adresem: {company?.address || DASH}, wpisaną do
          rejestru przedsiębiorców KRS pod numerem {company?.krs || DASH}, NIP: {company?.nip || DASH},
          REGON: {company?.regon || DASH}, reprezentowaną przez {representative || DASH}, Członka
          Zarządu uprawnionego do samodzielnej reprezentacji (dalej: „Firma”),
        </p>

        <p>
          2. Panią/Panem {contractor?.full_name || DASH}, zamieszkałą/-ym pod adresem{" "}
          {contractor?.address || DASH}, PESEL / nr dokumentu: {peselOrDoc}, e-mail:{" "}
          {contractor?.email || DASH}, telefon: {contractor?.phone || DASH} (dalej: „Twórca”),
        </p>

        <p>zwanymi dalej łącznie „Stronami”, o następującej treści:</p>

        <div className="section-title">§ 1. Przedmiot i zakres zgody</div>
        <p>
          Twórca wyraża dobrowolną zgodę na wykorzystywanie przez Firmę jego/jej wizerunku, głosu i
          wypowiedzi utrwalonych w materiałach wideo nagranych w ramach współpracy z Firmą (dalej:
          „Materiały”), w tym w wersji zmontowanej, opatrzonej napisami lub grafiką. Materiały mogą być
          wykorzystywane w szczególności w:
        </p>
        <p>
          ● mediach społecznościowych (Instagram, Facebook, TikTok, YouTube, LinkedIn i inne),
          organicznie oraz w płatnych kampaniach reklamowych,
        </p>
        <p>● reklamie internetowej i tradycyjnej,</p>
        <p>● na stronie internetowej Firmy oraz w materiałach marketingowych.</p>

        <div className="section-title">§ 2. Okres i terytorium</div>
        <p>
          Zgoda obowiązuje przez {periodPhrase} od dnia podpisania niniejszego dokumentu, tj. od {date}{" "}
          do {endDate}, na terytorium Polski oraz — z uwagi na zasięg Internetu — całego świata. Po tym
          okresie Firma zaprzestaje wykorzystywania Materiałów w nowych publikacjach; treści
          opublikowane wcześniej mogą pozostać dostępne w sieci.
        </p>

        <div className="section-title">§ 3. Wynagrodzenie</div>
        <p>
          {paid ? "☐" : "☑"} nieodpłatnie&nbsp;&nbsp;&nbsp;&nbsp;{paid ? "☑" : "☐"} odpłatnie, w
          wysokości {amountText} PLN, płatne na podstawie odrębnej umowy / rachunku / faktury.
        </p>

        <div className="section-title">§ 4. Cofnięcie zgody i dane osobowe</div>
        <p>
          Twórca może cofnąć zgodę w dowolnym momencie w formie pisemnej lub elektronicznej; nie wpływa
          to na zgodność z prawem wcześniejszego wykorzystania Materiałów. Administratorem danych
          osobowych Twórcy jest Firma, która przetwarza je w celu realizacji niniejszej zgody i działań
          marketingowych, zgodnie z RODO. Twórcy przysługują prawa dostępu, sprostowania, usunięcia i
          sprzeciwu wobec przetwarzania danych.
        </p>

        <div className="section-title">§ 5. Postanowienia końcowe</div>
        <p>
          Zmiany niniejszej zgody wymagają formy pisemnej. W sprawach nieuregulowanych stosuje się
          przepisy prawa polskiego. Dokument sporządzono w dwóch jednobrzmiących egzemplarzach, po
          jednym dla każdej ze Stron.
        </p>

        <div className="signatures">
          <div>
            <p>............................................</p>
            <p>Firma ({shortCompanyName(company?.name) || DASH})</p>
          </div>
          <div>
            <p>............................................</p>
            <p>Twórca (Content Creator)</p>
          </div>
        </div>
      </div>
    );
  },
);

ZgodaPreview.displayName = "ZgodaPreview";
