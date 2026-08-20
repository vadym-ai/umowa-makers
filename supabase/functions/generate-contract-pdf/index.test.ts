import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { renderContractPdf } from "./render.ts";
import { renderRachunekPdf } from "./renderRachunek.ts";

const POLISH_CHARS = ["ą", "ć", "ę", "ł", "ń", "ó", "ś", "ź", "ż"];

const sampleContract = {
  number: "1/07/2026",
  data: {
    startDate: "01.07.2026",
    endDate: "31.07.2026",
    city: "Warszawa",
    paymentDays: 3,
    subject:
      "opracowanie graficzne materiałów reklamowych — źródła, ćwiczenia, żagle, ślązak, ĄĆĘŁŃÓŚŹŻ",
    amountNet: 2800,
    amountWords: "dwa tysiące osiemset",
    company: {
      name: "Przykładowa Firma Sp. z o.o.",
      address: "ul. Kwiatowa 1, 00-001 Warszawa",
      nip: "1234567890",
      krs: "0000123456",
      regon: "123456789",
      city: "Warszawa",
      representative: "Łucja Żółć – Członek Zarządu",
    },
    contractor: {
      full_name: "Michał Śliwiński",
      address: "ul. Zielona 5, 00-002 Warszawa",
      pesel: "90010112345",
      document_number: "GM408049",
      tax_office: "Warszawa-Bemowo",
    },
  },
};

async function inflate(bytes: Uint8Array): Promise<Uint8Array | null> {
  for (const fmt of ["deflate", "deflate-raw"] as const) {
    try {
      const src = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(bytes.slice());
          controller.close();
        },
      });
      // deno-lint-ignore no-explicit-any
      const stream = (src as any).pipeThrough(new DecompressionStream(fmt));
      return new Uint8Array(await new Response(stream).arrayBuffer());
    } catch {
      // try next format
    }
  }
  return null;
}

/**
 * Collects all text decodable from the PDF: raw bytes plus every
 * inflated stream (ToUnicode CMaps live in compressed streams).
 */
async function extractDecodedText(pdf: Uint8Array): Promise<string> {
  const latin = new TextDecoder("latin1");
  const raw = latin.decode(pdf);
  let all = raw;

  for (const m of raw.matchAll(/(?:^|>)\s*stream\r?\n/g)) {
    const start = m.index! + m[0].length;
    let end = raw.indexOf("endstream", start);
    if (end === -1) continue;
    while (end > start && (raw[end - 1] === "\n" || raw[end - 1] === "\r")) end--;
    const inflated = await inflate(pdf.slice(start, end));
    if (inflated) all += latin.decode(inflated);
  }
  return all;
}


Deno.test("renders a contract PDF with Polish diacritics", async () => {
  const bytes = await renderContractPdf(sampleContract as never);

  assert(bytes.length > 1000, "PDF should not be empty");
  assertEquals(
    new TextDecoder().decode(bytes.subarray(0, 5)),
    "%PDF-",
    "output should be a PDF file",
  );

  const text = await extractDecodedText(bytes);

  const missing: string[] = [];
  for (const ch of POLISH_CHARS) {
    // ToUnicode CMaps map glyph ids to UTF-16BE hex codes, e.g. <0105> for "ą"
    const hex = ch.charCodeAt(0).toString(16).padStart(4, "0");
    const found = text.toLowerCase().includes(`<${hex}>`) || text.includes(ch);
    if (!found) missing.push(ch);
  }

  assertEquals(
    missing,
    [],
    `missing Polish characters in generated PDF: ${missing.join(" ")}`,
  );
});


/**
 * Decodes the drawn text: builds a glyph-id -> unicode map from the ToUnicode
 * CMaps, then decodes every hex string of the content streams.
 */
async function extractDrawnText(pdf: Uint8Array): Promise<string> {
  const latin = new TextDecoder("latin1");
  const raw = latin.decode(pdf);
  const chunks: string[] = [];
  for (const m of raw.matchAll(/(?:^|>)\s*stream\r?\n/g)) {
    const start = m.index! + m[0].length;
    let end = raw.indexOf("endstream", start);
    if (end === -1) continue;
    while (end > start && (raw[end - 1] === "\n" || raw[end - 1] === "\r")) end--;
    const inflated = await inflate(pdf.slice(start, end));
    if (inflated) chunks.push(latin.decode(inflated));
  }

  // Each embedded font has its own ToUnicode CMap; glyph ids collide between
  // fonts, so keep the maps separate and pick the best decode per string.
  const maps: Array<Map<string, string>> = [];
  for (const chunk of chunks) {
    for (const block of chunk.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
      const map = new Map<string, string>();
      for (const pair of block[1].matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g)) {
        map.set(pair[1].toLowerCase(), String.fromCharCode(parseInt(pair[2].slice(0, 4), 16)));
      }
      if (map.size) maps.push(map);
    }
  }

  const decode = (hex: string, map: Map<string, string>) => {
    let text = "";
    let misses = 0;
    for (let i = 0; i + 4 <= hex.length; i += 4) {
      const ch = map.get(hex.slice(i, i + 4));
      if (ch === undefined) misses++;
      else text += ch;
    }
    return { text, misses };
  };

  let out = "";
  for (const chunk of chunks) {
    for (const block of chunk.matchAll(/BT([\s\S]*?)ET/g)) {
      for (const hexStr of block[1].matchAll(/<([0-9a-fA-F]+)>/g)) {
        const hex = hexStr[1].toLowerCase();
        let best = { text: "", misses: Number.MAX_SAFE_INTEGER };
        for (const map of maps) {
          const candidate = decode(hex, map);
          if (candidate.misses < best.misses) best = candidate;
        }
        out += best.text + " ";
      }
    }
  }
  return out.replace(/\s+/g, " ");
}

Deno.test("renders the new template wording", async () => {
  const bytes = await renderContractPdf(sampleContract as never);
  const text = await extractDrawnText(bytes);

  const expected = [
    "polegające na",
    "dzieło",
    "WYKONAWCY",
    "przysługuje",
    "wynagrodzenie",
    "2 800,00",
    "osiemset",
    "00/100",
    "netto.",
    "terminie",
    "przelewem",
  ];
  const missing = expected.filter((w) => !text.includes(w));
  assertEquals(missing, [], `missing §6 wording in PDF: ${missing.join(" | ")}`);

  assert(!text.includes("RODO"), "RODO block must be removed");
});

Deno.test("renders a rachunek PDF with diacritics and the Do wypłaty row", async () => {
  const bytes = await renderRachunekPdf({
    ...sampleContract,
    data: {
      ...sampleContract.data,
      rachunek: {
        date: "2026-07-31",
        kupRate: 0.5,
        bankAccount: "PL61 1090 1014 0000 0712 1981 2874",
        paymentTerm: "płatność z góry",
      },
    },
  } as never);

  assertEquals(new TextDecoder().decode(bytes.subarray(0, 5)), "%PDF-", "output should be a PDF file");

  const decoded = await extractDecodedText(bytes);
  const missingChars = POLISH_CHARS.filter((ch) => {
    const hex = ch.charCodeAt(0).toString(16).padStart(4, "0");
    return !decoded.toLowerCase().includes(`<${hex}>`) && !decoded.includes(ch);
  });
  assertEquals(missingChars, [], `missing Polish characters: ${missingChars.join(" ")}`);

  const text = await extractDrawnText(bytes);
  const expected = ["Rachunek z dnia", "31.07.2026", "Do wypłaty", "2 800,00", "2 979,00", "1 489,50", "179 zł", "Słownie:"];
  const missing = expected.filter((w) => !text.includes(w));
  assertEquals(missing, [], `missing rachunek content: ${missing.join(" | ")}`);
});
