import { useEffect, useState } from "react";
import { Send, Link2, Unlink, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateCode(length = 6) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

const BOT_USERNAME = "UmowaMaker_Bot";

export function TelegramCard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [linked, setLinked] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("telegram_links")
      .select("chat_id")
      .eq("user_id", user.id)
      .maybeSingle();
    setLoading(false);
    if (error) {
      toast({ title: "Błąd Telegrama", description: error.message, variant: "destructive" });
      return;
    }
    setLinked(!!data);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const createCode = async () => {
    if (!user) return;
    setBusy(true);
    const newCode = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const { error } = await supabase
      .from("telegram_link_codes")
      .insert({ code: newCode, user_id: user.id, expires_at: expiresAt });
    setBusy(false);
    if (error) {
      toast({ title: "Nie udało się wygenerować kodu", description: error.message, variant: "destructive" });
      return;
    }
    setCode(newCode);
  };

  const unlink = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("telegram_links").delete().eq("user_id", user.id);
    setBusy(false);
    if (error) {
      toast({ title: "Nie udało się rozłączyć", description: error.message, variant: "destructive" });
      return;
    }
    setLinked(false);
    setCode(null);
    toast({ title: "Rozłączono Telegram" });
  };

  return (
    <section className="bg-card rounded-xl border p-6 space-y-4">
      <div className="flex items-center gap-2 text-foreground font-semibold text-lg">
        <Send className="h-5 w-5 text-primary" />
        Telegram
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Ładowanie…</p>
      ) : linked ? (
        <div className="space-y-3">
          <p className="text-sm text-foreground">
            Konto jest połączone z Telegramem ✅ — wystawiaj umowy komendą <code>/umowa 8000 Opis</code>.
          </p>
          <Button variant="outline" onClick={unlink} disabled={busy}>
            <Unlink className="mr-2 h-4 w-4" /> Rozłącz
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Połącz konto, aby wystawiać umowy przez bota na Telegramie.
          </p>
          {code ? (
            <div className="space-y-2">
              <div className="rounded-lg border bg-muted p-3 text-sm">
                Wyślij botowi: <strong>/start {code}</strong>
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-1 h-7 w-7"
                  onClick={() => {
                    navigator.clipboard.writeText(`/start ${code}`);
                    toast({ title: "Skopiowano" });
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Kod jest jednorazowy i wygasa po 10 minutach.</p>
              <Button asChild>
                <a href={`https://t.me/${BOT_USERNAME}?start=${code}`} target="_blank" rel="noopener noreferrer">
                  <Send className="mr-2 h-4 w-4" /> Otwórz Telegram
                </a>
              </Button>
              <Button variant="ghost" onClick={load} className="ml-2">
                Sprawdź status
              </Button>
            </div>
          ) : (
            <Button onClick={createCode} disabled={busy}>
              <Link2 className="mr-2 h-4 w-4" /> Połącz z Telegramem
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
