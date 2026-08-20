import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { renderContractPdf } from "./render.ts";
import { renderRachunekPdf } from "./renderRachunek.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;


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

    const bytes = await renderContractPdf(contract as any);
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
