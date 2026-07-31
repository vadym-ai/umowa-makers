import { createClient } from "npm:@supabase/supabase-js@2";
import { numberToPolishWords } from "./words.ts";
import { getRandomDescription } from "./descriptions.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
const WEBHOOK_SECRET = Deno.env.get("TELEGRAM_WEBHOOK_SECRET") ?? "";

const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

const HELP = [
  "Dostępne komendy:",
  "",
  "/start KOD — połącz konto z aplikacją",
  "/umowa KWOTA [opis] [MM/RR] [Nd] [@fragment]",
  "",
  "Przykłady:",
  "/umowa 500 — losowy przedmiot, bieżący miesiąc, start wg kolejki",
  "/umowa 500 07/26 — umowa za lipiec 2026",
  "/umowa 800 Projekt logo 07/26 14d — 14 dni od daty startu",
  "/umowa 800 Projekt logo @Kowal — wskazany wykonawca",
  "",
  "/pomoc — ta wiadomość",
].join("\n");


function safeEqual(a: string | null, b: string): boolean {
  if (!a || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function sendMessage(chatId: number, text: string) {
  const res = await fetch(`${TG_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  if (!res.ok) console.error("telegram sendMessage failed", res.status, await res.text());
}

async function sendDocument(chatId: number, filename: string, bytes: Uint8Array, caption: string) {
  const form = new FormData();
  form.append("chat_id", String(chatId));
  form.append("caption", caption);
  form.append("document", new Blob([bytes], { type: "application/pdf" }), filename);
  const res = await fetch(`${TG_API}/sendDocument`, { method: "POST", body: form });
  if (!res.ok) console.error("telegram sendDocument failed", res.status, await res.text());
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function handleStart(chatId: number, arg: string) {
  const code = arg.trim().toUpperCase();
  if (!code) {
    await sendMessage(chatId, "Podaj kod z aplikacji: /start KOD");
    return;
  }
  const { data: row, error } = await admin
    .from("telegram_link_codes")
    .select("code, user_id, expires_at")
    .eq("code", code)
    .maybeSingle();
  if (error) {
    console.error("link code lookup failed", error.message);
    await sendMessage(chatId, "Błąd serwera. Spróbuj ponownie.");
    return;
  }
  if (!row || new Date(row.expires_at).getTime() < Date.now()) {
    await sendMessage(chatId, "Kod jest nieprawidłowy lub wygasł. Wygeneruj nowy w aplikacji.");
    return;
  }

  // one chat per user and one user per chat
  await admin.from("telegram_links").delete().eq("chat_id", chatId);
  const { error: upErr } = await admin
    .from("telegram_links")
    .upsert({ user_id: row.user_id, chat_id: chatId }, { onConflict: "user_id" });
  if (upErr) {
    console.error("link upsert failed", upErr.message);
    await sendMessage(chatId, "Nie udało się połączyć konta.");
    return;
  }
  await admin.from("telegram_link_codes").delete().eq("code", code);
  await sendMessage(chatId, "Konto połączone ✅");
}

async function handleUmowa(chatId: number, userId: string, args: string) {
  const trimmed = args.trim();
  if (!trimmed) {
    await sendMessage(chatId, "Użycie: /umowa KWOTA [opis] [MM/RR] [Nd] [@fragment]");
    return;
  }

  const parts = trimmed.split(/\s+/);
  const amountNet = Number(parts[0].replace(",", "."));
  if (!Number.isFinite(amountNet) || amountNet <= 0) {
    await sendMessage(chatId, "Nieprawidłowa kwota. Użycie: /umowa 8000 Projekt logo");
    return;
  }

  const now = new Date();
  let month = now.getMonth() + 1;
  let year = now.getFullYear();
  let durationDays: number | null = null;
  let nameFragment: string | null = null;
  const subjectWords: string[] = [];

  for (const token of parts.slice(1)) {
    const period = token.match(/^(\d{1,2})\/(\d{2}|\d{4})$/);
    if (period) {
      const m = Number(period[1]);
      if (m < 1 || m > 12) {
        await sendMessage(chatId, "Nieprawidłowy miesiąc w okresie. Użyj formatu MM/RR, np. 07/26.");
        return;
      }
      month = m;
      year = period[2].length === 2 ? 2000 + Number(period[2]) : Number(period[2]);
      continue;
    }
    const dur = token.match(/^(\d{1,3})d$/i);
    if (dur) {
      durationDays = Number(dur[1]);
      continue;
    }
    if (token.startsWith("@") && token.length > 1) {
      nameFragment = token.slice(1);
      continue;
    }
    subjectWords.push(token);
  }

  const subject = subjectWords.join(" ").trim() || getRandomDescription(amountNet);


  const { data: membership, error: mErr } = await admin
    .from("organization_members")
    .select("org_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (mErr || !membership) {
    console.error("membership lookup failed", mErr?.message);
    await sendMessage(chatId, "Nie znaleziono Twojej organizacji.");
    return;
  }
  const orgId = membership.org_id as string;

  const { data: company } = await admin
    .from("companies")
    .select("*")
    .eq("org_id", orgId)
    .eq("is_default", true)
    .maybeSingle();
  if (!company) {
    await sendMessage(chatId, "Brak domyślnego zamawiającego. Ustaw go w aplikacji (Dane Stron).");
    return;
  }

  let contractor: Record<string, unknown> | null = null;
  if (nameFragment) {
    const { data: matches, error: cErr } = await admin
      .from("contractors")
      .select("*")
      .eq("org_id", orgId)
      .ilike("full_name", `%${nameFragment.replace(/[%_]/g, "")}%`);
    if (cErr) {
      console.error("contractor search failed", cErr.message);
      await sendMessage(chatId, "Błąd wyszukiwania wykonawcy.");
      return;
    }
    if (!matches || matches.length === 0) {
      await sendMessage(chatId, "Nie znaleziono wykonawcy pasującego do podanego fragmentu.");
      return;
    }
    if (matches.length > 1) {
      const list = matches.map((m) => `• ${m.full_name}`).join("\n");
      await sendMessage(chatId, `Pasuje kilku wykonawców — doprecyzuj:\n${list}`);
      return;
    }
    contractor = matches[0];
  } else {
    const { data: def } = await admin
      .from("contractors")
      .select("*")
      .eq("org_id", orgId)
      .eq("is_default", true)
      .maybeSingle();
    if (!def) {
      await sendMessage(chatId, "Brak domyślnego wykonawcy. Ustaw go w aplikacji (Dane Stron) lub użyj @fragment nazwiska.");
      return;
    }
    contractor = def;
  }

  const lastDay = new Date(year, month, 0).getDate();

  const { data: periodContracts, error: pcErr } = await admin
    .from("contracts")
    .select("data")
    .eq("org_id", orgId)
    .eq("period_month", month)
    .eq("period_year", year);
  if (pcErr) {
    console.error("period contracts lookup failed", pcErr.message);
    await sendMessage(chatId, "Błąd odczytu istniejących umów.");
    return;
  }

  let startDay = 1;
  const existingStarts = (periodContracts ?? [])
    .map((c) => (c.data as { startDate?: string } | null)?.startDate)
    .filter((d): d is string => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort();
  if (existingStarts.length > 0) {
    const last = new Date(`${existingStarts[existingStarts.length - 1]}T00:00:00Z`);
    const next = new Date(last.getTime() + 86400000);
    if (next.getUTCFullYear() !== year || next.getUTCMonth() + 1 !== month) {
      await sendMessage(
        chatId,
        `Brak wolnych dat w ${pad(month)}/${year} — ostatnia umowa zaczyna się ${pad(last.getUTCDate())}.${pad(month)}. Użyj innego okresu.`,
      );
      return;
    }
    startDay = next.getUTCDate();
  }

  const startDate = `${year}-${pad(month)}-${pad(startDay)}`;
  let endDate: string;
  if (durationDays && durationDays > 0) {
    const end = new Date(Date.UTC(year, month - 1, startDay) + (durationDays - 1) * 86400000);
    endDate = `${end.getUTCFullYear()}-${pad(end.getUTCMonth() + 1)}-${pad(end.getUTCDate())}`;
  } else {
    endDate = `${year}-${pad(month)}-${pad(lastDay)}`;
  }


  const { data: number, error: nErr } = await admin.rpc("next_contract_number_for_user", {
    _user_id: userId,
    _org_id: orgId,
    _month: month,
    _year: year,
  });
  if (nErr || !number) {
    console.error("numbering failed", nErr?.message);
    await sendMessage(chatId, "Nie udało się nadać numeru umowy.");
    return;
  }

  const snapshot = {
    amountNet,
    amountWords: numberToPolishWords(Math.round(amountNet)),
    subject,
    startDate,
    endDate,
    month,
    year,
    company: {
      id: company.id,
      name: company.name,
      address: company.address,
      nip: company.nip,
      representative: company.representative,
    },
    contractor: {
      id: contractor.id,
      full_name: contractor.full_name,
      address: contractor.address,
      pesel: contractor.pesel,
    },
  };

  const { data: inserted, error: insErr } = await admin
    .from("contracts")
    .insert({
      org_id: orgId,
      company_id: company.id,
      contractor_id: contractor.id,
      number,
      period_month: month,
      period_year: year,
      data: snapshot,
      created_by: userId,
    })
    .select("id")
    .single();
  if (insErr || !inserted) {
    console.error("contract insert failed", insErr?.message);
    await sendMessage(chatId, "Nie udało się zapisać umowy.");
    return;
  }

  const pdfRes = await fetch(`${SUPABASE_URL}/functions/v1/generate-contract-pdf`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ contract_id: inserted.id, user_id: userId }),
  });
  if (!pdfRes.ok) {
    console.error("pdf generation failed", pdfRes.status, await pdfRes.text());
    await sendMessage(chatId, `Umowa ${number} zapisana, ale nie udało się wygenerować PDF.`);
    return;
  }
  const bytes = new Uint8Array(await pdfRes.arrayBuffer());
  const safeNumber = String(number).replace(/[^\p{L}\p{N}\-_.]/gu, "-");
  await sendDocument(chatId, `UOD-${safeNumber}.pdf`, bytes, `Umowa ${number} — ${contractor.full_name}`);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!BOT_TOKEN || !WEBHOOK_SECRET) {
    console.error("telegram secrets not configured");
    return new Response("Not configured", { status: 500 });
  }
  if (!safeEqual(req.headers.get("X-Telegram-Bot-Api-Secret-Token"), WEBHOOK_SECRET)) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const update = await req.json();
    const message = update.message ?? update.edited_message;
    const chatId: number | undefined = message?.chat?.id;
    const text: string = typeof message?.text === "string" ? message.text : "";
    if (!chatId || !text.startsWith("/")) return new Response(JSON.stringify({ ok: true }));

    const spaceIdx = text.indexOf(" ");
    const command = (spaceIdx === -1 ? text : text.slice(0, spaceIdx)).split("@")[0].toLowerCase();
    const args = spaceIdx === -1 ? "" : text.slice(spaceIdx + 1);
    console.log("telegram command", command);

    if (command === "/start") {
      await handleStart(chatId, args);
      return new Response(JSON.stringify({ ok: true }));
    }

    const { data: link, error: lErr } = await admin
      .from("telegram_links")
      .select("user_id")
      .eq("chat_id", chatId)
      .maybeSingle();
    if (lErr) console.error("link lookup failed", lErr.message);

    if (!link) {
      await sendMessage(
        chatId,
        "Twoje konto nie jest połączone. Wejdź w aplikacji do Dane Stron → Telegram, wygeneruj kod i wyślij: /start KOD",
      );
      return new Response(JSON.stringify({ ok: true }));
    }

    if (command === "/umowa") {
      await handleUmowa(chatId, link.user_id as string, args);
    } else if (command === "/pomoc" || command === "/help") {
      await sendMessage(chatId, HELP);
    } else {
      await sendMessage(chatId, `Nieznana komenda.\n\n${HELP}`);
    }

    return new Response(JSON.stringify({ ok: true }));
  } catch (e) {
    console.error("telegram-webhook error", e instanceof Error ? e.message : e);
    return new Response(JSON.stringify({ ok: true }));
  }
});
