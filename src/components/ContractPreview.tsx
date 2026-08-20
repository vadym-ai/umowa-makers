import { forwardRef } from "react";
import { Company, Contractor } from "@/lib/parties";
import { PartyTable } from "@/components/PartyTable";
import { formatPln, amountInWordsPl } from "@/lib/numberToWords";

interface ContractPreviewProps {
  contractNumber: string;
  signDate: string;
  city: string;
  startDate: string;
  endDate: string;
  company: Company | null;
  contractor: Contractor | null;
  subject: string;
  amountNet: number;
  paymentDays: number;
}

/** Keep this template in sync with supabase/functions/generate-contract-pdf/render.ts */
export const ContractPreview = forwardRef<HTMLDivElement, ContractPreviewProps>(
  (
    { contractNumber, signDate, city, startDate, endDate, company, contractor, subject, amountNet, paymentDays },
    ref,
  ) => {
    return (
      <div ref={ref} className="a4-page">
        <h2>Umowa o dzieło nr {contractNumber}</h2>
        <div className="subtitle">
          zawarta w dniu {signDate} w miejscowości: {city}
        </div>

        <PartyTable company={company} contractor={contractor} />


        <div className="section-title">§ 1</div>
        <p>
          WYKONAWCA zobowiązuje się wykonać na zamówienie ZAMAWIAJĄCEGO dzieło, polegające na {subject}.
        </p>

        <div className="section-title">§ 2</div>
        <p>1. WYKONAWCA oświadcza, iż posiada wiedzę, kwalifikacje i umiejętności niezbędne dla wykonania dzieła.</p>
        <p>
          2. WYKONAWCA oświadcza, że wykona dzieło w sposób staranny, sumienny i prawidłowy, zgodnie ze specyfiką dzieła oraz informacjami i wytycznymi ze strony ZAMAWIAJĄCEGO lub podmiotu trzeciego, na którego rzecz dzieło jest wykonywane.
        </p>
        <p>
          3. WYKONAWCA oświadcza, że dzieło będzie wynikiem jego oryginalnej twórczości i nie będzie naruszać praw osób trzecich, w szczególności praw autorskich oraz dóbr osobistych, jak również, iż osobiste i majątkowe prawa autorskie do dzieła nie są ograniczone jakimikolwiek prawami osób trzecich. WYKONAWCA oświadcza ponadto, że dzieło nie było publicznie rozpowszechnione lub udostępnione za pośrednictwem jakichkolwiek środków przekazu lub rozpowszechniania.
        </p>

        <div className="section-title">§ 3</div>
        <p>
          1. W razie stwierdzenia nieprawidłowości oświadczeń, o których mowa w § 2, lub też wad prawnych dzieła, ZAMAWIAJĄCY będzie uprawniony do odstąpienia od umowy lub żądania zwrotu wypłaconego wynagrodzenia wraz z odsetkami w wysokości ustawowej od dnia zapłaty do dnia zwrotu wynagrodzenia. W każdym wypadku określonym w niniejszym ustępie, ZAMAWIAJĄCY będzie także uprawniony do dochodzenia naprawienia szkody w pełnym zakresie.
        </p>
        <p>2. Dzieło ma charakter indywidualny i jest przedmiotem prawa autorskiego.</p>

        <div className="section-title">§ 4</div>
        <p>
          Termin rozpoczęcia dzieła strony ustaliły na dzień {startDate}, a wykonania na dzień {endDate}.
        </p>

        <div className="section-title">§ 5</div>
        <p>
          WYKONAWCA ma prawo powierzyć wykonanie dzieła innej osobie, jednakże jest on odpowiedzialny wobec ZAMAWIAJĄCEGO za jej działania, jak za własne.
        </p>

        <div className="section-title">§ 6</div>
        <p>
          1. WYKONAWCY przysługuje wynagrodzenie za wykonanie dzieła w wysokości {formatPln(amountNet)} (słownie: {amountInWordsPl(amountNet)}) netto.
        </p>
        <p>
          2. Wynagrodzenie WYKONAWCY płatne będzie w terminie {paymentDays} dni od dnia przyjęcia dzieła przez ZAMAWIAJĄCEGO bez zastrzeżeń. Wynagrodzenie płatne będzie na podstawie prawidłowo wystawionego i dostarczonego ZAMAWIAJĄCEMU rachunku, przelewem na konto wskazane w rachunku.
        </p>

        <div className="section-title">§ 7</div>
        <p>
          1. WYKONAWCA zobowiązuje się przenieść na ZAMAWIAJĄCEGO całość praw autorskich do dzieła, bez żadnych ograniczeń czasowych i terytorialnych, na wszelkich znanych w chwili zawarcia niniejszej umowy polach eksploatacji.
        </p>
        <p>
          2. WYKONAWCA upoważnia również ZAMAWIAJĄCEGO do rozporządzania oraz korzystania z utworów stanowiących opracowanie dzieła, w zakresie wskazanym w ust. 1 powyżej. Wskazane upoważnienie może być przenoszone na osoby trzecie bez konieczności uzyskiwania odrębnej zgody.
        </p>
        <p>3. Przejście praw autorskich do dzieła nastąpi z momentem przekazania Dzieła ZAMAWIAJĄCEMU.</p>

        <div className="section-title">§ 8</div>
        <p>
          1. W sprawach nieuregulowanych niniejszą umową będą miały zastosowanie przepisy kodeksu cywilnego oraz ustawy o prawie autorskim i prawach pokrewnych.
        </p>
        <p>
          2. Wszelkie spory powstałe na gruncie niniejszej umowy rozpoznawane będą przez sąd powszechny właściwy ze względu na siedzibę ZAMAWIAJĄCEGO.
        </p>
        <p>3. Zmiany umowy wymagają formy pisemnej pod rygorem nieważności.</p>

        <div className="section-title">§ 9</div>
        <p>Umowę sporządzono w dwóch jednobrzmiących egzemplarzach, po jednej dla każdej ze stron.</p>

        <div className="signatures">
          <div>
            <p>............................................</p>
            <p>Podpis zamawiającego</p>
          </div>
          <div>
            <p>............................................</p>
            <p>Podpis wykonawcy</p>
          </div>
        </div>
      </div>
    );
  },
);

ContractPreview.displayName = "ContractPreview";
