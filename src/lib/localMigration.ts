import { supabase } from "@/integrations/supabase/client";

const DONE_KEY = "uod_migrated_to_cloud";
const COUNTERS_KEY = "uod_counters";

/** One-time import of legacy localStorage contract counters into the database. */
async function migrateCounters(orgId: string) {
  const raw = localStorage.getItem(COUNTERS_KEY);
  if (!raw) return;
  try {
    const counters = JSON.parse(raw);
    if (counters && typeof counters === "object" && Object.keys(counters).length > 0) {
      const { error } = await supabase.rpc("import_local_counters", {
        _org_id: orgId,
        _counters: counters,
      });
      if (error) return;
    }
  } catch {
    // corrupted payload — drop it
  }
  localStorage.removeItem(COUNTERS_KEY);
}

/**
 * One-time import of legacy localStorage party/numbering data into the database.
 * Runs only when the org has no companies/contractors yet.
 */
export async function migrateLocalStorageData(orgId: string) {
  await migrateCounters(orgId);

  if (localStorage.getItem(DONE_KEY)) return;

  const rawClient = localStorage.getItem("uod_client");
  const rawContractor = localStorage.getItem("uod_contractor");
  const rawSettings = localStorage.getItem("uod_settings");
  if (!rawClient && !rawContractor && !rawSettings) return;

  const [{ count: companyCount }, { count: contractorCount }] = await Promise.all([
    supabase.from("companies").select("id", { count: "exact", head: true }).eq("org_id", orgId),
    supabase.from("contractors").select("id", { count: "exact", head: true }).eq("org_id", orgId),
  ]);

  if ((companyCount ?? 0) > 0 || (contractorCount ?? 0) > 0) {
    localStorage.setItem(DONE_KEY, "1");
    return;
  }

  try {
    if (rawClient) {
      const c = JSON.parse(rawClient);
      await supabase.from("companies").insert({
        org_id: orgId,
        name: c.companyName ?? "Firma",
        address: c.companyAddress ?? null,
        representative: c.representative ?? null,
        nip: c.nip ?? null,
      });
    }
    if (rawContractor) {
      const c = JSON.parse(rawContractor);
      await supabase.from("contractors").insert({
        org_id: orgId,
        full_name: c.fullName ?? "Wykonawca",
        address: c.address ?? null,
        pesel: c.pesel ?? null,
      });
    }
    if (rawSettings) {
      const s = JSON.parse(rawSettings);
      if (s.prefix) {
        await supabase.from("numbering_rules").update({ prefix: s.prefix }).eq("org_id", orgId);
      }
    }
  } catch {
    return;
  }

  localStorage.removeItem("uod_client");
  localStorage.removeItem("uod_contractor");
  localStorage.removeItem("uod_settings");
  localStorage.setItem(DONE_KEY, "1");
}
