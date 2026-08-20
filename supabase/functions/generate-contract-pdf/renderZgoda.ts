import { PDFDocument, rgb } from "npm:pdf-lib@1.17.1";
import fontkit from "npm:@pdf-lib/fontkit@1.1.1";
import { ROBOTO_REGULAR_B64, ROBOTO_BOLD_B64 } from "./fonts.ts";

/** Keep this template in sync with src/components/ZgodaPreview.tsx */

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

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

function numberToPolishWords(num: number): string {
  if (num === 0) return "zero";
  const parts: string[] = [];
  const thousandsPart = Math.floor(num / 1000);
  const remainder = num % 1000;
  if (thousandsPart > 0) {
    parts.push(thousandsPart === 1 ? "tysiąc" : convertHundreds(thousandsPart) + " tysiące");
  }
  if (remainder > 0) parts.push(convertHundreds(remainder));
  return parts.join(" ");
}

/** Mirror of src/lib/zgoda.ts polishPeriodPhrase */
export function polishPeriodPhrase(n: number, unit: "months" | "years"): string {
  const count = Math.max(1, Math.floor(Number.isFinite(n) ? n : 1));
  const lastDigit = count % 10;
  const lastTwo = count % 100;
  const few = lastDigit >= 2 && lastDigit <= 4 && !(lastTwo >= 12 && lastTwo <= 14);
  let word: string;
  if (unit === "years") word = count === 1 ? "rok" : few ? "lata" : "lat";
  else word = count === 1 ? "miesiąc" : few ? "miesiące" : "miesięcy";
  return `${count} (${numberToPolishWords(count)}) ${word}`;
}

function shortCompanyName(name: string): string {
  return (
    name
      .replace(/\s*(sp\.?\s*z\s*o\.?\s*o\.?|spółka z ograniczoną odpowiedzialnością|s\.?a\.?|sp\.?\s*k\.?|sp\.?\s*j\.?)\s*$/i, "")
      .trim() || name
  );
}

export async function renderZgodaPdf(
  contract: { number: string; data: Record<string, any> },
): Promise<Uint8Array> {
  const d = (contract.data ?? {}) as Record<string, any>;
  const company = d.company ?? null;
  const contractor = d.contractor ?? null;
  const z = d.zgoda ?? {};
  const dash = "……………………";
  const date = plDate(d.startDate) ?? dash;
  const endDate = plDate(z.endDate ?? d.endDate) ?? dash;
  const city = (typeof d.city === "string" && d.city.trim()) || company?.city || "Warszawa";
  const periodPhrase = polishPeriodPhrase(Number(z.periodCount ?? 3), z.periodUnit === "months" ? "months" : "years");
  const paid = !!z.paid;
  const amountText = paid && z.amount ? String(z.amount) : dash;
  const representative = String(z.representative ?? company?.representative ?? "").split("\n")[0].split(/[–—-]/)[0].trim() || dash;

  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const regular = await pdf.embedFont(b64ToBytes(ROBOTO_REGULAR_B64), { subset: true });
  const bold = await pdf.embedFont(b64ToBytes(ROBOTO_BOLD_B64), { subset: true });

  const A4: [number, number] = [595.28, 841.89];
  const MARGIN_X = 56.7;
  const MARGIN_Y = 42.5;
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

  const wrapSegs = (segs: Seg[], size: number, maxWidth: number, indent = 0) => {
    const lines: Seg[][] = [];
    let line: Seg[] = [];
    let lineW = 0;
    for (const seg of segs) {
      const font = seg.b ? bold : regular;
      const words = seg.text.split(/(\s+)/).filter((w) => w !== "");
      for (const w of words) {
        const ww = font.widthOfTextAtSize(w, size);
        if (lineW + ww > maxWidth - indent && line.length > 0 && w.trim() !== "") {
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
    opts: {
      size?: number;
      align?: "left" | "center";
      gapBefore?: number;
      gapAfter?: number;
      leading?: number;
      indent?: number;
    } = {},
  ) => {
    const size = opts.size ?? SIZE;
    const leading = opts.leading ?? LEADING;
    const indent = opts.indent ?? 0;
    y -= opts.gapBefore ?? 0;
    const lines = wrapSegs(segs, size, WIDTH, indent);
    for (const line of lines) {
      ensure(leading);
      const lineWidth = line.reduce(
        (acc, s) => acc + (s.b ? bold : regular).widthOfTextAtSize(s.text, size),
        0,
      );
      let x =
        opts.align === "center" ? MARGIN_X + (WIDTH - lineWidth) / 2 : MARGIN_X + indent;
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
    drawSegs([{ text: title, b: true }], { gapBefore: 8, gapAfter: 2 });

  // Header
  drawSegs([{ text: "ZGODA NA WYKORZYSTANIE WIZERUNKU I MATERIAŁÓW WIDEO", b: true }], {
    size: 12,
    align: "center",
    leading: 16,
  });
  drawSegs([{ text: `nr ${contract.number}` }], { size: 9, align: "center", gapAfter: 10 });

  p(`Zawarta w dniu ${date} w ${city} pomiędzy:`, { gapAfter: 4 });

  p(
    `1. ${company?.name ?? dash} z siedzibą pod adresem: ${company?.address ?? dash}, wpisaną do rejestru przedsiębiorców KRS pod numerem ${company?.krs ?? dash}, NIP: ${company?.nip ?? dash}, REGON: ${company?.regon ?? dash}, reprezentowaną przez ${representative}, Członka Zarządu uprawnionego do samodzielnej reprezentacji (dalej: „Firma”),`,
    { gapAfter: 4 },
  );

  p(
    `2. Panią/Panem ${contractor?.full_name ?? dash}, zamieszkałą/-ym pod adresem ${contractor?.address ?? dash}, PESEL / nr dokumentu: ${contractor?.pesel || contractor?.document_number || dash}, e-mail: ${contractor?.email ?? dash}, telefon: ${contractor?.phone ?? dash} (dalej: „Twórca”),`,
    { gapAfter: 4 },
  );

  p("zwanymi dalej łącznie „Stronami”, o następującej treści:");

  section("§ 1. Przedmiot i zakres zgody");
  p(
    "Twórca wyraża dobrowolną zgodę na wykorzystywanie przez Firmę jego/jej wizerunku, głosu i wypowiedzi utrwalonych w materiałach wideo nagranych w ramach współpracy z Firmą (dalej: „Materiały”), w tym w wersji zmontowanej, opatrzonej napisami lub grafiką. Materiały mogą być wykorzystywane w szczególności w:",
  );
  p(
    "• mediach społecznościowych (Instagram, Facebook, TikTok, YouTube, LinkedIn i inne), organicznie oraz w płatnych kampaniach reklamowych,",
    { indent: 12 },
  );
  p("• reklamie internetowej i tradycyjnej,", { indent: 12 });
  p("• na stronie internetowej Firmy oraz w materiałach marketingowych.", { indent: 12 });

  section("§ 2. Okres i terytorium");
  p(
    `Zgoda obowiązuje przez ${periodPhrase} od dnia podpisania niniejszego dokumentu, tj. od ${date} do ${endDate}, na terytorium Polski oraz — z uwagi na zasięg Internetu — całego świata. Po tym okresie Firma zaprzestaje wykorzystywania Materiałów w nowych publikacjach; treści opublikowane wcześniej mogą pozostać dostępne w sieci.`,
  );

  section("§ 3. Wynagrodzenie");
  p(
    `${paid ? "[ ]" : "[X]"} nieodpłatnie     ${paid ? "[X]" : "[ ]"} odpłatnie, w wysokości ${amountText} PLN, płatne na podstawie odrębnej umowy / rachunku / faktury.`,
  );

  section("§ 4. Cofnięcie zgody i dane osobowe");
  p(
    "Twórca może cofnąć zgodę w dowolnym momencie w formie pisemnej lub elektronicznej; nie wpływa to na zgodność z prawem wcześniejszego wykorzystania Materiałów. Administratorem danych osobowych Twórcy jest Firma, która przetwarza je w celu realizacji niniejszej zgody i działań marketingowych, zgodnie z RODO. Twórcy przysługują prawa dostępu, sprostowania, usunięcia i sprzeciwu wobec przetwarzania danych.",
  );

  section("§ 5. Postanowienia końcowe");
  p(
    "Zmiany niniejszej zgody wymagają formy pisemnej. W sprawach nieuregulowanych stosuje się przepisy prawa polskiego. Dokument sporządzono w dwóch jednobrzmiących egzemplarzach, po jednym dla każdej ze Stron.",
  );

  // Signatures
  ensure(60);
  y -= 40;
  const colW = WIDTH / 2;
  const dots = "............................................";
  const captions = [
    `Firma (${shortCompanyName(String(company?.name ?? "")) || dash})`,
    "Twórca (Content Creator)",
  ];
  for (let i = 0; i < 2; i++) {
    const cx = MARGIN_X + i * colW;
    const dw = regular.widthOfTextAtSize(dots, SIZE);
    page.drawText(dots, { x: cx + (colW - dw) / 2, y: y, size: SIZE, font: regular, color: rgb(0, 0, 0) });
    const cw = regular.widthOfTextAtSize(captions[i], SIZE);
    page.drawText(captions[i], {
      x: cx + (colW - cw) / 2,
      y: y - LEADING,
      size: SIZE,
      font: regular,
      color: rgb(0, 0, 0),
    });
  }

  return await pdf.save();
}
