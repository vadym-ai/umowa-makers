import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { renderContractPdf } from "./render.ts";

const POLISH_CHARS = ["ą", "ć", "ę", "ł", "ń", "ó", "ś", "ź", "ż"];

const sampleContract = {
  number: "W-01/07/26",
  data: {
    startDate: "01.07.2026",
    endDate: "31.07.2026",
    subject:
      "opracowanie graficzne materiałów reklamowych — źródła, ćwiczenia, żagle, ślązak, ĄĆĘŁŃÓŚŹŻ",
    amountNet: 1500,
    amountWords: "tysiąc pięćset",
    company: {
      name: "Przykładowa Firma Sp. z o.o.",
      address: "ul. Kwiatowa 1, 00-001 Warszawa",
      nip: "1234567890",
      representative: "Łucja Żółć",
    },
    contractor: {
      full_name: "Michał Śliwiński",
      address: "ul. Zielona 5, 00-002 Warszawa",
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
