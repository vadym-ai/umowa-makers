import { renderContractPdf } from "./render.ts";
async function inflate(bytes: Uint8Array) {
  for (const fmt of ["deflate", "deflate-raw"] as const) {
    try {
      const src = new ReadableStream<Uint8Array>({ start(c){c.enqueue(bytes.slice());c.close();} });
      // deno-lint-ignore no-explicit-any
      return new Uint8Array(await new Response((src as any).pipeThrough(new DecompressionStream(fmt))).arrayBuffer());
    } catch { /* next */ }
  }
  return null;
}
Deno.test("dump", async () => {
  const bytes = await renderContractPdf({number:"1/07/2026",data:{startDate:"2026-07-01",endDate:"2026-07-31",city:"Warszawa",paymentDays:3,subject:"opracowaniu grafik",amountNet:2800,company:{name:"Firma"},contractor:{full_name:"Michał"}}} as never);
  const latin = new TextDecoder("latin1");
  const raw = latin.decode(bytes);
  let n=0, ok=0;
  for (const m of raw.matchAll(/(?:^|>)\s*stream\r?\n/g)) {
    n++;
    const start = m.index! + m[0].length;
    let end = raw.indexOf("endstream", start);
    if (end === -1) continue;
    while (end > start && (raw[end-1]==="\n"||raw[end-1]==="\r")) end--;
    const inf = await inflate(bytes.slice(start,end));
    if (inf) { ok++; const t = latin.decode(inf); console.log(n, inf.length, JSON.stringify(t.slice(0,80))); }
  }
  console.log("streams",n,"inflated",ok);
});
