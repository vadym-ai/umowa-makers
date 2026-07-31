import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { PDFDocument, rgb } from "npm:pdf-lib@1.17.1";
import fontkit from "npm:@pdf-lib/fontkit@1.1.1";
import { ROBOTO_REGULAR_B64, ROBOTO_BOLD_B64 } from "./fonts.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const contractId = typeof body?.contract_id === "string" ? body.contract_id : null;
    if (!contractId) return json({ error: "contract_id is required" }, 400);

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    let userId: string | null = null;
    if (token === SERVICE_ROLE_KEY) {
      // internal call: user_id must be passed explicitly for the permission check
      if (typeof body?.user_id !== "string") return json({ error: "user_id is required for internal calls" }, 400);
      userId = body.user_id;
    } else {
      const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { data, error } = await anon.auth.getClaims(token);
      if (error || !data?.claims?.sub) return json({ error: "Unauthorized" }, 401);
      userId = data.claims.sub as string;
    }

    const { data: contract, error: cErr } = await admin
      .from("contracts")
      .select("*")
      .eq("id", contractId)
      .maybeSingle();
    if (cErr) return json({ error: cErr.message }, 500);
    if (!contract) return json({ error: "Not found" }, 404);

    const { data: membership, error: mErr } = await admin
      .from("organization_members")
      .select("role")
      .eq("org_id", contract.org_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (mErr) return json({ error: mErr.message }, 500);
    if (!membership) return json({ error: "Forbidden" }, 403);
    const privileged = membership.role === "owner" || membership.role === "admin";
    if (!privileged && contract.created_by !== userId) return json({ error: "Forbidden" }, 403);

    const d = (contract.data ?? {}) as Record<string, any>;
    const company = d.company ?? null;
    const contractor = d.contractor ?? null;
    const dash = "—";

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
    drawSegs([{ text: `UMOWA O DZIEŁO ${contract.number}`, b: true }], { size: 12, align: "center", leading: 15 });
    drawSegs([{ text: "wraz z przeniesieniem praw autorskich" }], { size: 8.5, align: "center", gapAfter: 10 });

    p(`Umowa zawarta w dniu ${d.startDate ?? dash} r., w Warszawie, pomiędzy:`);
    drawSegs([
      { text: company?.name || dash, b: true },
      { text: `, ${company?.address || dash}` },
    ]);
    if (company?.nip) p(`NIP: ${company.nip}`);
    drawSegs([
      { text: `Reprezentowanym przez p. ${company?.representative || dash} zwanym dalej ` },
      { text: "Zamawiającym", b: true },
      { text: ", a" },
    ]);
    drawSegs([
      { text: "p. " },
      { text: contractor?.full_name || dash, b: true },
      { text: `, ${contractor?.address || dash}` },
    ]);
    drawSegs([{ text: "zwanym dalej " }, { text: "Wykonawcą", b: true }, { text: ", o następującej treści:" }]);

    section("§ 1");
    p(`Zamawiający powierza wykonanie, a Wykonawca zobowiązuje się wykonać dzieło polegające na: ${d.subject ?? ""}`);

    section("§ 2");
    p("1. Wykonawca oświadcza, iż posiada wiedzę, kwalifikacje i umiejętności niezbędne dla wykonania dzieła.");
    p("2. Wykonawca oświadcza, że wykona dzieło w sposób staranny, sumienny i prawidłowy, zgodnie ze specyfiką dzieła oraz informacjami i wytycznymi ze strony Zamawiającego.");
    p("3. Wykonawca oświadcza, że dzieło będzie wynikiem jego oryginalnej twórczości i nie będzie naruszać praw osób trzecich.");

    section("§ 3");
    p("1. W razie stwierdzenia nieprawidłowości oświadczeń z § 2 lub wad prawnych dzieła, Zamawiający będzie uprawniony do odstąpienia od umowy lub żądania zwrotu wypłaconego wynagrodzenia.");
    p("2. Dzieło ma charakter indywidualny i jest przedmiotem prawa autorskiego.");

    section("§ 4");
    p(`Termin rozpoczęcia dzieła strony ustaliły na dzień ${d.startDate ?? dash} r., a wykonania na dzień ${d.endDate ?? dash} r.`);

    section("§ 5");
    p(`Wykonawcy przysługuje wynagrodzenie za wykonanie dzieła w wysokości ${d.amountNet ?? 0},00 zł netto (słownie: ${d.amountWords ?? ""} złotych) i jest płatne z góry.`);

    section("§ 6");
    p("1. Wykonawca zobowiązuje się przenieść na Zamawiającego całość autorskich praw majątkowych do dzieła, bez ograniczeń czasowych i terytorialnych.");
    p("2. Wykonawca upoważnia Zamawiającego do rozporządzania i korzystania z opracowań dzieła.");
    p("3. Przejście praw autorskich nastąpi z momentem przekazania dzieła Zamawiającemu.");

    section("§ 7");
    p("1. W sprawach nieuregulowanych mają zastosowanie przepisy Kodeksu cywilnego oraz ustawy o prawie autorskim.");
    p("2. Spory rozpoznawane będą przez sąd właściwy dla siedziby Zamawiającego.");

    section("§ 8");
    p("Umowę sporządzono w 2 jednobrzmiących egzemplarzach.");

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
    page.drawText("Zamawiający", { x: center("Zamawiający", leftX), y: y - SIZE, size: SIZE, font: regular });
    page.drawText("Wykonawca", { x: center("Wykonawca", rightX), y: y - SIZE, size: SIZE, font: regular });
    y -= LEADING;

    // RODO
    y -= 20;
    drawSegs(
      [{
        text: "Wyrażam zgodę na przetwarzanie moich danych osobowych dla potrzeb niezbędnych do realizacji procesu zatrudnienia zgodnie z Rozporządzeniem Parlamentu Europejskiego i Rady (UE) 2016/679 z dnia 27 kwietnia 2016 r. (RODO).",
      }],
      { size: 6.5, leading: 8.5, gapAfter: 14 },
    );
    drawSegs([{ text: line }], { size: 6.5, leading: 8.5 });
    drawSegs([{ text: "Podpis Wykonawcy" }], { size: 6.5, leading: 8.5 });

    const bytes = await pdf.save();
    const safeNumber = String(contract.number ?? "umowa").replace(/[^\p{L}\p{N}\-_.]/gu, "-");

    return new Response(bytes, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="UOD-${safeNumber}.pdf"`,
      },
    });
  } catch (e) {
    console.error("generate-contract-pdf error", e);
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
