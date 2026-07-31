import { useEffect, useMemo, useState } from "react";
import { Search, History } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/hooks/useOrg";
import { ContractRow } from "@/lib/contracts";
import { toast } from "@/hooks/use-toast";

function formatPln(v: number) {
  return new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" }).format(v || 0);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pl-PL");
}

interface HistoryTabProps {
  onOpenContract: (contract: ContractRow) => void;
}

export function HistoryTab({ onOpenContract }: HistoryTabProps) {
  const { orgId } = useOrg();
  const [rows, setRows] = useState<ContractRow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    let active = true;
    setLoading(true);
    supabase
      .from("contracts")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (!active) return;
        setLoading(false);
        if (error) {
          toast({ title: "Błąd wczytywania historii", description: error.message, variant: "destructive" });
          return;
        }
        setRows((data as unknown as ContractRow[]) ?? []);
      });
    return () => {
      active = false;
    };
  }, [orgId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.number.toLowerCase().includes(q) ||
        (r.data?.contractor?.full_name ?? "").toLowerCase().includes(q)
    );
  }, [rows, query]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <History className="h-6 w-6 text-primary" />
          Historia umów
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Kliknij umowę, aby otworzyć ją w generatorze do edycji.
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Szukaj po numerze lub wykonawcy…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="bg-card rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="text-left font-medium px-4 py-3">Numer</th>
              <th className="text-left font-medium px-4 py-3 whitespace-nowrap">Data zawarcia</th>
              <th className="text-left font-medium px-4 py-3">Wykonawca</th>
              <th className="text-left font-medium px-4 py-3">Zamawiający</th>
              <th className="text-right font-medium px-4 py-3">Kwota</th>
              <th className="text-left font-medium px-4 py-3 whitespace-nowrap">Utworzono</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="px-4 py-6 text-muted-foreground">Wczytywanie…</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-muted-foreground">Brak umów.</td></tr>
            )}
            {filtered.map((r) => (
              <tr
                key={r.id}
                onClick={() => onOpenContract(r)}
                className="border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">{r.number}</td>
                <td className="px-4 py-3 whitespace-nowrap">{r.data?.startDate ?? "—"}</td>
                <td className="px-4 py-3">{r.data?.contractor?.full_name ?? "—"}</td>
                <td className="px-4 py-3">{r.data?.company?.name ?? "—"}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">{formatPln(r.data?.amountNet ?? 0)}</td>
                <td className="px-4 py-3 whitespace-nowrap">{formatDate(r.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
