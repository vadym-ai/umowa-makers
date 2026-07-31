import { useEffect, useMemo, useState } from "react";
import { Search, History, MoreHorizontal, FileDown, Loader2, Archive, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const { orgId, isAdmin } = useOrg();
  const [rows, setRows] = useState<ContractRow[]>([]);
  const [authors, setAuthors] = useState<Record<string, string>>({});
  const [authorFilter, setAuthorFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"active" | "archived" | "all">("active");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<ContractRow | null>(null);

  const archiveContract = async (row: ContractRow) => {
    setBusyId(row.id);
    const { error } = await supabase
      .from("contracts")
      .update({ status: "archived" })
      .eq("id", row.id);
    setBusyId(null);
    if (error) {
      toast({ title: "Nie udało się zarchiwizować", description: error.message, variant: "destructive" });
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, status: "archived" } : r)));
    toast({ title: "Umowa zarchiwizowana", description: row.number });
  };

  const deleteContract = async (row: ContractRow) => {
    setBusyId(row.id);
    const { error } = await supabase.from("contracts").delete().eq("id", row.id);
    setBusyId(null);
    setToDelete(null);
    if (error) {
      toast({ title: "Nie udało się usunąć umowy", description: error.message, variant: "destructive" });
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== row.id));
    toast({ title: "Umowa usunięta", description: `${row.number} — licznik numeracji pozostał bez zmian.` });
  };


  const handleServerPdf = async (row: ContractRow) => {
    setDownloadingId(row.id);
    try {
      const { data, error } = await supabase.functions.invoke("generate-contract-pdf", {
        body: { contract_id: row.id },
      });
      if (error) throw error;
      const blob = data instanceof Blob ? data : new Blob([data as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `UOD-${row.number.replace(/[^\p{L}\p{N}\-_.]/gu, "-")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast({
        title: "Nie udało się pobrać PDF",
        description: e instanceof Error ? e.message : "Nieznany błąd",
        variant: "destructive",
      });
    } finally {
      setDownloadingId(null);
    }
  };



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

  useEffect(() => {
    if (!isAdmin) return;
    const ids = Array.from(new Set(rows.map((r) => r.created_by).filter(Boolean))) as string[];
    if (ids.length === 0) return;
    let active = true;
    supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", ids)
      .then(({ data }) => {
        if (!active || !data) return;
        const map: Record<string, string> = {};
        data.forEach((p) => {
          map[p.id] = p.full_name || p.email || "—";
        });
        setAuthors(map);
      });
    return () => {
      active = false;
    };
  }, [rows, isAdmin]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter === "active" && r.status === "archived") return false;
      if (statusFilter === "archived" && r.status !== "archived") return false;
      if (isAdmin && authorFilter !== "all" && r.created_by !== authorFilter) return false;
      if (!q) return true;
      return (
        r.number.toLowerCase().includes(q) ||
        (r.data?.contractor?.full_name ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, query, isAdmin, authorFilter, statusFilter]);


  const authorOptions = useMemo(
    () => Array.from(new Set(rows.map((r) => r.created_by).filter(Boolean))) as string[],
    [rows]
  );

  const colCount = isAdmin ? 8 : 7;

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

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Szukaj po numerze lub wykonawcy…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {isAdmin && (
          <Select value={authorFilter} onValueChange={setAuthorFilter}>
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue placeholder="Autor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszyscy autorzy</SelectItem>
              {authorOptions.map((id) => (
                <SelectItem key={id} value={id}>
                  {authors[id] ?? "—"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Aktywne</SelectItem>
            <SelectItem value="archived">Archiwalne</SelectItem>
            <SelectItem value="all">Wszystkie</SelectItem>
          </SelectContent>
        </Select>
      </div>


      <div className="bg-card rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="text-left font-medium px-4 py-3">Numer</th>
              <th className="text-left font-medium px-4 py-3 whitespace-nowrap">Data zawarcia</th>
              <th className="text-left font-medium px-4 py-3">Wykonawca</th>
              <th className="text-left font-medium px-4 py-3">Zamawiający</th>
              {isAdmin && <th className="text-left font-medium px-4 py-3">Autor</th>}
              <th className="text-right font-medium px-4 py-3">Kwota</th>
              <th className="text-left font-medium px-4 py-3 whitespace-nowrap">Utworzono</th>
              <th className="w-10 px-2 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={colCount} className="px-4 py-6 text-muted-foreground">Wczytywanie…</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={colCount} className="px-4 py-6 text-muted-foreground">Brak umów.</td></tr>
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
                {isAdmin && (
                  <td className="px-4 py-3">{(r.created_by && authors[r.created_by]) || "—"}</td>
                )}
                <td className="px-4 py-3 text-right whitespace-nowrap">{formatPln(r.data?.amountNet ?? 0)}</td>
                <td className="px-4 py-3 whitespace-nowrap">{formatDate(r.created_at)}</td>
                <td className="px-2 py-3" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Akcje umowy">
                        {downloadingId === r.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <MoreHorizontal className="h-4 w-4" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onSelect={(e) => {
                          e.preventDefault();
                          handleServerPdf(r);
                        }}
                        disabled={downloadingId === r.id}
                      >
                        <FileDown className="mr-2 h-4 w-4" />
                        Pobierz PDF (serwer)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}

          </tbody>
        </table>
      </div>
    </div>
  );
}
