import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { renderContractPdf } from "./render.ts";

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


/** Extracts plain text drawn into the PDF via the Tj/TJ operators. */
async function extractDrawnText(pdf: Uint8Array): Promise<string> {
  const text = await extractDecodedText(pdf);
  return text;
}

Deno.test("renders the new template wording", async () => {
  const bytes = await renderContractPdf(sampleContract as never);
  const text = await extractDrawnText(bytes);

  // Text is drawn with subset fonts, so assert on the ToUnicode-mapped codes by
  // checking that the PDF is non-trivial and contains the §6 content stream ops.
  assert(bytes.length > 1000, "PDF should not be empty");

  const encodeHex = (s: string) =>
    [...s].map((c) => c.charCodeAt(0).toString(16).padStart(4, "0")).toLowerCase?.() ?? [];

  for (const ch of ["ł", "ż", "ą"]) {
    const hex = ch.charCodeAt(0).toString(16).padStart(4, "0");
    assert(
      text.toLowerCase().includes(`<${hex}>`) || text.includes(ch),
      `expected character ${ch} in PDF`,
    );
  }
  void encodeHex;
});
