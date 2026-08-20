import { PDFDocument, rgb } from "npm:pdf-lib@1.17.1";
import fontkit from "npm:@pdf-lib/fontkit@1.1.1";
import { ROBOTO_REGULAR_B64, ROBOTO_BOLD_B64 } from "./fonts.ts";

/** Keep this template in sync with src/components/ContractPreview.tsx */

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Formats a date as DD.MM.YYYY (Polish convention). Passes through unknown formats. */
function plDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const s = value.trim();
  if (!s) return null;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}.${iso[2]}.${iso[1]}`;
  const dotted = s.match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})$/);
  if (dotted) return `${dotted[1].padStart(2, "0")}.${dotted[2].padStart(2, "0")}.${dotted[3]}`;
  return s;
}

const ones = ["", "jeden", "dwa", "trzy", "cztery", "pięć", "sześć", "siedem", "osiem", "dziewięć"];
const teens = ["dziesięć", "jedenaście", "dwanaście", "trzynaście", "czternaście", "piętnaście", "szesnaście", "siedemnaście", "osiemnaście", "dziewiętnaście"];
const tens = ["", "dziesięć", "dwadzieścia", "trzydzieści", "czterdzieści", "pięćdziesiąt", "sześćdziesiąt", "siedemdziesiąt", "osiemdziesiąt", "dziewięćdziesiąt"];
const hundredsW = ["", "sto", "dwieście", "trzysta", "czterysta", "pięćset", "sześćset", "siedemset", "osiemset", "dziewięćset"];

function convertHundreds(n: number): string {
  const parts: string[] = [];
  const h = Math.floor(n / 100);
  const rest = n % 100;
  if (h > 0) parts.push(hundredsW[h]);
  if (rest >= 10 && rest <= 19) parts.push(teens[rest - 10]);
  else {
    const t = Math.floor(rest / 10);
    const o = rest % 10;
    if (t > 0) parts.push(tens[t]);
    if (o > 0) parts.push(ones[o]);
  }
  return parts.join(" ");
}

function plural(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one;
  const lastDigit = n % 10;
  const lastTwo = n % 100;
  if (lastTwo >= 12 && lastTwo <= 14) return many;
  if (lastDigit >= 2 && lastDigit <= 4) return few;
  return many;
}

function numberToPolishWords(num: number): string {
  if (num === 0) return "zero";
  if (num < 0) return "minus " + numberToPolishWords(-num);
  const parts: string[] = [];
  const millions = Math.floor(num / 1000000);
  const thousandsPart = Math.floor((num % 1000000) / 1000);
  const remainder = num % 1000;
  if (millions > 0) {
    if (millions === 1) parts.push("milion");
    else {
      parts.push(convertHundreds(millions));
      parts.push(plural(millions, "milion", "miliony", "milionów"));
    }
  }
  if (thousandsPart > 0) {
    if (thousandsPart === 1) parts.push("tysiąc");
    else {
      parts.push(convertHundreds(thousandsPart));
      parts.push(plural(thousandsPart, "tysiąc", "tysiące", "tysięcy"));
    }
  }
  if (remainder > 0) parts.push(convertHundreds(remainder));
  return parts.join(" ");
}

/** "2 800,00 zł" — plain space separator (PDF-safe). */
function formatPln(amount: number): string {
  const value = Number.isFinite(amount) ? amount : 0;
  const cents = Math.round(Math.abs(value) * 100);
  const int = Math.floor(cents / 100);
  const rest = cents % 100;
  const grouped = int.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${value < 0 ? "-" : ""}${grouped},${rest.toString().padStart(2, "0")} zł`;
}

/** "dwa tysiące osiemset złotych 00/100" */
function amountInWordsPl(amount: number): string {
  const value = Number.isFinite(amount) ? amount : 0;
  const cents = Math.round(Math.abs(value) * 100);
  const int = Math.floor(cents / 100);
  const rest = cents % 100;
  return `${value < 0 ? "minus " : ""}${numberToPolishWords(int)} złotych ${rest.toString().padStart(2, "0")}/100`;
}

export async function renderContractPdf(contract: { number: string; data: Record<string, any> }): Promise<Uint8Array> {
  const d = (contract.data ?? {}) as Record<string, any>;
  const company = d.company ?? null;
  const contractor = d.contractor ?? null;
  const dash = "—";
  const startDate = plDate(d.startDate) ?? dash;
  const endDate = plDate(d.endDate) ?? dash;
  const city = (typeof d.city === "string" && d.city.trim()) || company?.city || "Warszawa";
  const paymentDays = Number.isFinite(d.paymentDays) ? d.paymentDays : 3;
  const amountNet = Number(d.amountNet ?? 0);

  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const regular = await pdf.embedFont(b64ToBytes(ROBOTO_REGULAR_B64), { subset: true });
  const bold = await pdf.embedFont(b64ToBytes(ROBOTO_BOLD_B64), { subset: true });

  const A4: [number, number] = [595.28, 841.89];
  const MARGIN_X = 56.7; // 20mm
  const MARGIN_Y = 42.5; // 15mm
  const WIDTH = A4[0] - MARGIN_X * 2;
  const SIZE = 9.5;
  const LEADING = 12.5;

  let page = pdf.addPage(A4);
  let y = A4[1] - MARGIN_Y;

  const ensure = (needed: number) => {
    if (y - needed < MARGIN_Y) {
      page = pdf.addPage(A4);
      y = A4[1] - MARGIN_Y;
    }
  };

  type Seg = { text: string; b?: boolean };

  const wrapSegs = (segs: Seg[], size: number, maxWidth: number) => {
    const lines: Seg[][] = [];
    let line: Seg[] = [];
    let lineW = 0;
    for (const seg of segs) {
      const font = seg.b ? bold : regular;
      const words = seg.text.split(/(\s+)/).filter((w) => w !== "");
      for (const w of words) {
        const ww = font.widthOfTextAtSize(w, size);
        if (lineW + ww > maxWidth && line.length > 0 && w.trim() !== "") {
          lines.push(line);
          line = [];
          lineW = 0;
        }
        if (line.length === 0 && w.trim() === "") continue;
        line.push({ text: w, b: seg.b });
        lineW += ww;
      }
    }
    if (line.length) lines.push(line);
    return lines;
  };

  const drawSegs = (
    segs: Seg[],
    opts: { size?: number; align?: "left" | "center"; gapBefore?: number; gapAfter?: number; leading?: number } = {},
  ) => {
    const size = opts.size ?? SIZE;
    const leading = opts.leading ?? LEADING;
    y -= opts.gapBefore ?? 0;
    const lines = wrapSegs(segs, size, WIDTH);
    for (const line of lines) {
      ensure(leading);
      const lineWidth = line.reduce((acc, s) => acc + (s.b ? bold : regular).widthOfTextAtSize(s.text, size), 0);
      let x = opts.align === "center" ? MARGIN_X + (WIDTH - lineWidth) / 2 : MARGIN_X;
      for (const s of line) {
        const font = s.b ? bold : regular;
        page.drawText(s.text, { x, y: y - size, size, font, color: rgb(0, 0, 0) });
        x += font.widthOfTextAtSize(s.text, size);
      }
      y -= leading;
    }
    y -= opts.gapAfter ?? 0;
  };

  const p = (text: string, opts = {}) => drawSegs([{ text }], opts);
  const section = (title: string) =>
    drawSegs([{ text: title, b: true }], { align: "center", gapBefore: 6, gapAfter: 1 });

  // Header
  drawSegs([{ text: `Umowa o dzieło nr ${contract.number}`, b: true }], { size: 12, align: "center", leading: 15 });
  drawSegs([{ text: `zawarta w dniu ${startDate} w miejscowości: ${city}` }], {
    size: 9,
    align: "center",
    gapAfter: 8,
  });

  // Party table
  const leftLines: string[] = [];
  if (company?.name) leftLines.push(`${company.name} reprezentowana przez:`);
  for (const rep of String(company?.representative ?? "").split("\n").map((s: string) => s.trim()).filter(Boolean)) {
    leftLines.push(rep);
  }
  if (company?.address) leftLines.push(company.address);
  if (company?.krs) leftLines.push(`KRS: ${company.krs}`);
  if (company?.regon) leftLines.push(`REGON: ${company.regon}`);
  if (company?.nip) leftLines.push(`NIP: ${company.nip}`);

  const rightLines: string[] = [];
  if (contractor?.full_name) rightLines.push(`Imię i Nazwisko: ${contractor.full_name}`);
  if (contractor?.address) rightLines.push(`Adres: ${contractor.address}`);
  if (contractor?.pesel) rightLines.push(`PESEL: ${contractor.pesel}`);
  if (contractor?.document_number) rightLines.push(`Dokument: ${contractor.document_number}`);
  if (contractor?.tax_office) rightLines.push(`Urząd Skarbowy: ${contractor.tax_office}`);

  const CELL_PAD = 5;
  const COL_W = WIDTH / 2;
  const CELL_W = COL_W - CELL_PAD * 2;
  const TSIZE = 8.5;
  const TLEAD = 10.5;

  const wrapPlain = (text: string, size: number, maxWidth: number): string[] => {
    const out: string[] = [];
    let line = "";
    for (const word of text.split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (regular.widthOfTextAtSize(candidate, size) > maxWidth && line) {
        out.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) out.push(line);
    return out;
  };

  const leftWrapped = leftLines.flatMap((l) => wrapPlain(l, TSIZE, CELL_W));
  const rightWrapped = rightLines.flatMap((l) => wrapPlain(l, TSIZE, CELL_W));
  const headerH = TLEAD + CELL_PAD;
  const bodyH = Math.max(leftWrapped.length, rightWrapped.length) * TLEAD + CELL_PAD * 2;
  const tableH = headerH + bodyH;

  ensure(tableH + 6);
  const tableTop = y;
  const tableBottom = tableTop - tableH;
  page.drawRectangle({
    x: MARGIN_X,
    y: tableBottom,
    width: WIDTH,
    height: tableH,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });
  // header separator
  page.drawLine({
    start: { x: MARGIN_X, y: tableTop - headerH },
    end: { x: MARGIN_X + WIDTH, y: tableTop - headerH },
    thickness: 1,
    color: rgb(0, 0, 0),
  });
  // column separator
  page.drawLine({
    start: { x: MARGIN_X + COL_W, y: tableTop },
    end: { x: MARGIN_X + COL_W, y: tableBottom },
    thickness: 1,
    color: rgb(0, 0, 0),
  });

  page.drawText("ZAMAWIAJĄCY", {
    x: MARGIN_X + CELL_PAD,
    y: tableTop - CELL_PAD - TSIZE,
    size: TSIZE,
    font: bold,
  });
  page.drawText("WYKONAWCA", {
    x: MARGIN_X + COL_W + CELL_PAD,
    y: tableTop - CELL_PAD - TSIZE,
    size: TSIZE,
    font: bold,
  });

  const drawColumn = (lines: string[], x: number) => {
    let ly = tableTop - headerH - CELL_PAD;
    for (const l of lines) {
      page.drawText(l, { x, y: ly - TSIZE, size: TSIZE, font: regular });
      ly -= TLEAD;
    }
  };
  drawColumn(leftWrapped, MARGIN_X + CELL_PAD);
  drawColumn(rightWrapped, MARGIN_X + COL_W + CELL_PAD);

  y = tableBottom - 8;

  section("§ 1");
  p(`WYKONAWCA zobowiązuje się wykonać na zamówienie ZAMAWIAJĄCEGO dzieło, polegające na ${d.subject ?? ""}.`);

  section("§ 2");
  p("1. WYKONAWCA oświadcza, iż posiada wiedzę, kwalifikacje i umiejętności niezbędne dla wykonania dzieła.");
  p("2. WYKONAWCA oświadcza, że wykona dzieło w sposób staranny, sumienny i prawidłowy, zgodnie ze specyfiką dzieła oraz informacjami i wytycznymi ze strony ZAMAWIAJĄCEGO lub podmiotu trzeciego, na którego rzecz dzieło jest wykonywane.");
  p("3. WYKONAWCA oświadcza, że dzieło będzie wynikiem jego oryginalnej twórczości i nie będzie naruszać praw osób trzecich, w szczególności praw autorskich oraz dóbr osobistych, jak również, iż osobiste i majątkowe prawa autorskie do dzieła nie są ograniczone jakimikolwiek prawami osób trzecich. WYKONAWCA oświadcza ponadto, że dzieło nie było publicznie rozpowszechnione lub udostępnione za pośrednictwem jakichkolwiek środków przekazu lub rozpowszechniania.");

  section("§ 3");
  p("1. W razie stwierdzenia nieprawidłowości oświadczeń, o których mowa w § 2, lub też wad prawnych dzieła, ZAMAWIAJĄCY będzie uprawniony do odstąpienia od umowy lub żądania zwrotu wypłaconego wynagrodzenia wraz z odsetkami w wysokości ustawowej od dnia zapłaty do dnia zwrotu wynagrodzenia. W każdym wypadku określonym w niniejszym ustępie, ZAMAWIAJĄCY będzie także uprawniony do dochodzenia naprawienia szkody w pełnym zakresie.");
  p("2. Dzieło ma charakter indywidualny i jest przedmiotem prawa autorskiego.");

  section("§ 4");
  p(`Termin rozpoczęcia dzieła strony ustaliły na dzień ${startDate}, a wykonania na dzień ${endDate}.`);

  section("§ 5");
  p("WYKONAWCA ma prawo powierzyć wykonanie dzieła innej osobie, jednakże jest on odpowiedzialny wobec ZAMAWIAJĄCEGO za jej działania, jak za własne.");

  section("§ 6");
  p(`1. WYKONAWCY przysługuje wynagrodzenie za wykonanie dzieła w wysokości ${formatPln(amountNet)} (słownie: ${amountInWordsPl(amountNet)}) netto.`);
  p(`2. Wynagrodzenie WYKONAWCY płatne będzie w terminie ${paymentDays} dni od dnia przyjęcia dzieła przez ZAMAWIAJĄCEGO bez zastrzeżeń. Wynagrodzenie płatne będzie na podstawie prawidłowo wystawionego i dostarczonego ZAMAWIAJĄCEMU rachunku, przelewem na konto wskazane w rachunku.`);

  section("§ 7");
  p("1. WYKONAWCA zobowiązuje się przenieść na ZAMAWIAJĄCEGO całość praw autorskich do dzieła, bez żadnych ograniczeń czasowych i terytorialnych, na wszelkich znanych w chwili zawarcia niniejszej umowy polach eksploatacji.");
  p("2. WYKONAWCA upoważnia również ZAMAWIAJĄCEGO do rozporządzania oraz korzystania z utworów stanowiących opracowanie dzieła, w zakresie wskazanym w ust. 1 powyżej. Wskazane upoważnienie może być przenoszone na osoby trzecie bez konieczności uzyskiwania odrębnej zgody.");
  p("3. Przejście praw autorskich do dzieła nastąpi z momentem przekazania Dzieła ZAMAWIAJĄCEMU.");

  section("§ 8");
  p("1. W sprawach nieuregulowanych niniejszą umową będą miały zastosowanie przepisy kodeksu cywilnego oraz ustawy o prawie autorskim i prawach pokrewnych.");
  p("2. Wszelkie spory powstałe na gruncie niniejszej umowy rozpoznawane będą przez sąd powszechny właściwy ze względu na siedzibę ZAMAWIAJĄCEGO.");
  p("3. Zmiany umowy wymagają formy pisemnej pod rygorem nieważności.");

  section("§ 9");
  p("Umowę sporządzono w dwóch jednobrzmiących egzemplarzach, po jednej dla każdej ze stron.");

  // Signatures
  y -= 38;
  ensure(40);
  const line = "............................................";
  const lw = regular.widthOfTextAtSize(line, SIZE);
  const leftX = MARGIN_X;
  const rightX = MARGIN_X + WIDTH - lw;
  page.drawText(line, { x: leftX, y: y - SIZE, size: SIZE, font: regular });
  page.drawText(line, { x: rightX, y: y - SIZE, size: SIZE, font: regular });
  y -= LEADING;
  const center = (txt: string, blockX: number) =>
    blockX + (lw - regular.widthOfTextAtSize(txt, SIZE)) / 2;
  page.drawText("Podpis zamawiającego", { x: center("Podpis zamawiającego", leftX), y: y - SIZE, size: SIZE, font: regular });
  page.drawText("Podpis wykonawcy", { x: center("Podpis wykonawcy", rightX), y: y - SIZE, size: SIZE, font: regular });
  y -= LEADING;

  return await pdf.save();
}
