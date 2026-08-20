import { PDFDocument, rgb } from "npm:pdf-lib@1.17.1";
import fontkit from "npm:@pdf-lib/fontkit@1.1.1";
import { ROBOTO_REGULAR_B64, ROBOTO_BOLD_B64 } from "./fonts.ts";
import { calcRachunek } from "./rachunekCalc.ts";

/** Keep this template in sync with src/components/RachunekPreview.tsx */

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

/** "Dwa tysiące osiemset złotych zero groszy" */
function amountInWordsGroszePl(amount: number): string {
  const value = Number.isFinite(amount) ? amount : 0;
  const cents = Math.round(Math.abs(value) * 100);
  const int = Math.floor(cents / 100);
  const rest = cents % 100;
  const zloty = plural(int, "złoty", "złote", "złotych");
  const grosz = rest === 0 ? "groszy" : plural(rest, "grosz", "grosze", "groszy");
  const groszeWords = rest === 0 ? "zero" : numberToPolishWords(rest);
  const sentence = `${value < 0 ? "minus " : ""}${numberToPolishWords(int)} ${zloty} ${groszeWords} ${grosz}`;
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

export async function renderRachunekPdf(
  contract: { number: string; data: Record<string, any> },
): Promise<Uint8Array> {
  const d = (contract.data ?? {}) as Record<string, any>;
  const company = d.company ?? null;
  const contractor = d.contractor ?? null;
  const r = (d.rachunek ?? {}) as Record<string, any>;
  const rachunekDate = plDate(r.date) ?? plDate(d.endDate) ?? "—";
  const kupRate: 0.5 | 0.2 = r.kupRate === 0.2 ? 0.2 : 0.5;
  const bankAccount = (typeof r.bankAccount === "string" && r.bankAccount.trim()) || contractor?.bank_account || "—";
  const paymentTerm = (typeof r.paymentTerm === "string" && r.paymentTerm.trim()) || "płatność z góry";
  const calc = calcRachunek({ netto: Number(d.amountNet ?? 0), kupRate });

  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const regular = await pdf.embedFont(b64ToBytes(ROBOTO_REGULAR_B64), { subset: true });
  const bold = await pdf.embedFont(b64ToBytes(ROBOTO_BOLD_B64), { subset: true });

  const A4: [number, number] = [595.28, 841.89];
  const MARGIN_X = 56.7;
  const MARGIN_Y = 42.5;
  const WIDTH = A4[0] - MARGIN_X * 2;
  const SIZE = 9.5;
  const LEADING = 13;

  const page = pdf.addPage(A4);
  let y = A4[1] - MARGIN_Y;

  const drawCentered = (text: string, size: number, font = regular) => {
    const w = font.widthOfTextAtSize(text, size);
    page.drawText(text, { x: MARGIN_X + (WIDTH - w) / 2, y: y - size, size, font, color: rgb(0, 0, 0) });
    y -= size + 4;
  };

  drawCentered(`Rachunek z dnia ${rachunekDate}`, 12, bold);
  drawCentered(`do umowy o dzieło nr ${contract.number}`, 9);
  y -= 8;

  // Party table (same layout as the umowa)
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
      } else line = candidate;
    }
    if (line) out.push(line);
    return out;
  };

  const leftWrapped = leftLines.flatMap((l) => wrapPlain(l, TSIZE, CELL_W));
  const rightWrapped = rightLines.flatMap((l) => wrapPlain(l, TSIZE, CELL_W));
  const headerH = TLEAD + CELL_PAD;
  const bodyH = Math.max(leftWrapped.length, rightWrapped.length) * TLEAD + CELL_PAD * 2;
  const tableH = headerH + bodyH;
  const tableTop = y;
  const tableBottom = tableTop - tableH;

  page.drawRectangle({ x: MARGIN_X, y: tableBottom, width: WIDTH, height: tableH, borderColor: rgb(0, 0, 0), borderWidth: 1 });
  page.drawLine({ start: { x: MARGIN_X, y: tableTop - headerH }, end: { x: MARGIN_X + WIDTH, y: tableTop - headerH }, thickness: 1, color: rgb(0, 0, 0) });
  page.drawLine({ start: { x: MARGIN_X + COL_W, y: tableTop }, end: { x: MARGIN_X + COL_W, y: tableBottom }, thickness: 1, color: rgb(0, 0, 0) });
  page.drawText("ZAMAWIAJĄCY", { x: MARGIN_X + CELL_PAD, y: tableTop - CELL_PAD - TSIZE, size: TSIZE, font: bold });
  page.drawText("WYKONAWCA", { x: MARGIN_X + COL_W + CELL_PAD, y: tableTop - CELL_PAD - TSIZE, size: TSIZE, font: bold });

  const drawColumn = (lines: string[], x: number) => {
    let ly = tableTop - headerH - CELL_PAD;
    for (const l of lines) {
      page.drawText(l, { x, y: ly - TSIZE, size: TSIZE, font: regular });
      ly -= TLEAD;
    }
  };
  drawColumn(leftWrapped, MARGIN_X + CELL_PAD);
  drawColumn(rightWrapped, MARGIN_X + COL_W + CELL_PAD);

  y = tableBottom - 18;

  drawCentered("Numer rachunku bankowego", SIZE, bold);
  drawCentered(bankAccount, SIZE);
  y -= 10;

  const zero = "0,00 zł";
  const rows: [string, string, boolean][] = [
    ["Kwota rachunku brutto", formatPln(calc.brutto), true],
    ["Składka emerytalna (9,76%)", zero, false],
    ["Składka rentowa (1,50%)", zero, false],
    ["Składka chorobowa (2,45%)", zero, false],
    ["Przychód", formatPln(calc.brutto), true],
    [`Koszt uzyskania przychodu (${kupRate === 0.5 ? "50" : "20"}%)`, formatPln(calc.kup), false],
    ["Podstawa opodatkowania", `${calc.podstawa} zł`, false],
    ["Naliczony podatek (12,00%)", formatPln(calc.podatekNaliczony), false],
    ["Składka na ubezpieczenie zdrowotne (9,00%)", zero, false],
    ["Do odliczenia (-1,00%)", zero, false],
    ["Podatek do Urzędu Skarbowego", `${calc.podatekUS} zł`, false],
    ["Wypłacono zaliczkę", zero, false],
    ["Do wypłaty", formatPln(calc.doWyplaty), true],
  ];

  for (const [label, value, isBold] of rows) {
    const font = isBold ? bold : regular;
    page.drawText(label, { x: MARGIN_X, y: y - SIZE, size: SIZE, font });
    const vw = font.widthOfTextAtSize(value, SIZE);
    page.drawText(value, { x: MARGIN_X + WIDTH - vw, y: y - SIZE, size: SIZE, font });
    page.drawLine({
      start: { x: MARGIN_X, y: y - SIZE - 3 },
      end: { x: MARGIN_X + WIDTH, y: y - SIZE - 3 },
      thickness: 0.4,
      color: rgb(0.8, 0.8, 0.8),
    });
    y -= LEADING;
  }

  y -= 12;
  page.drawText(`Słownie: ${amountInWordsGroszePl(calc.doWyplaty)}`, { x: MARGIN_X, y: y - SIZE, size: SIZE, font: regular });
  y -= LEADING;
  page.drawText(`Termin płatności: ${paymentTerm}`, { x: MARGIN_X, y: y - SIZE, size: SIZE, font: regular });
  y -= LEADING;

  // Signatures
  y -= 40;
  const line = "............................................";
  const lw = regular.widthOfTextAtSize(line, SIZE);
  const leftX = MARGIN_X;
  const rightX = MARGIN_X + WIDTH - lw;
  const center = (txt: string, blockX: number) => blockX + (lw - regular.widthOfTextAtSize(txt, SIZE)) / 2;

  page.drawText("Potwierdzam wykonanie umowy", { x: center("Potwierdzam wykonanie umowy", leftX), y: y - SIZE, size: SIZE, font: regular });
  page.drawText("Kwituję odbiór w/w kwoty", { x: center("Kwituję odbiór w/w kwoty", rightX), y: y - SIZE, size: SIZE, font: regular });
  y -= LEADING + 12;
  page.drawText(line, { x: leftX, y: y - SIZE, size: SIZE, font: regular });
  page.drawText(line, { x: rightX, y: y - SIZE, size: SIZE, font: regular });
  y -= LEADING;
  page.drawText("Podpis zamawiającego", { x: center("Podpis zamawiającego", leftX), y: y - SIZE, size: SIZE, font: regular });
  page.drawText("Podpis wykonawcy", { x: center("Podpis wykonawcy", rightX), y: y - SIZE, size: SIZE, font: regular });

  return await pdf.save();
}
