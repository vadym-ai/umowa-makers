import { useCallback, useEffect, useState } from "react";
import { Users, Save, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/hooks/useOrg";
import { useAuth } from "@/hooks/useAuth";
import { roleLabel } from "@/lib/roles";
import { toast } from "@/hooks/use-toast";

interface MemberRow {
  user_id: string;
  role: string;
  email: string | null;
  full_name: string | null;
}

const Organization = () => {
  const { orgId, orgName, isOwner, loading } = useOrg();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (orgName) setName(orgName);
  }, [orgName]);

  const reload = useCallback(async () => {
    if (!orgId) return;
    const { data, error } = await supabase
      .from("organization_members")
      .select("user_id, role")
      .eq("org_id", orgId)
      .order("created_at");
    if (error) {
      toast({ title: "Błąd wczytywania członków", description: error.message, variant: "destructive" });
      return;
    }
    const ids = (data ?? []).map((m) => m.user_id);
    const { data: profiles, error: pErr } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    if (pErr) {
      toast({ title: "Błąd wczytywania profili", description: pErr.message, variant: "destructive" });
    }
    setMembers(
      (data ?? []).map((m) => {
        const p = profiles?.find((x) => x.id === m.user_id);
        return { user_id: m.user_id, role: m.role, email: p?.email ?? null, full_name: p?.full_name ?? null };
      })
    );
  }, [orgId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const saveName = async () => {
    if (!orgId || !name.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("organizations").update({ name: name.trim() }).eq("id", orgId);
    setBusy(false);
    if (error) {
      toast({ title: "Nie udało się zapisać nazwy", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Nazwa organizacji zapisana" });
  };

  const changeRole = async (userId: string, role: string) => {
    if (!orgId) return;
    const { error } = await supabase
      .from("organization_members")
      .update({ role })
      .eq("org_id", orgId)
      .eq("user_id", userId);
    if (error) {
      toast({ title: "Nie udało się zmienić roli", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Rola zaktualizowana" });
    reload();
  };

  const removeMember = async (userId: string) => {
    if (!orgId) return;
    const { error } = await supabase
      .from("organization_members")
      .delete()
      .eq("org_id", orgId)
      .eq("user_id", userId);
    if (error) {
      toast({ title: "Nie udało się usunąć członka", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Członek usunięty z organizacji" });
    reload();
  };

  if (loading) {
    return <p className="text-muted-foreground">Wczytywanie…</p>;
  }

  if (!isOwner) {
    return (
      <p className="text-muted-foreground">
        Tylko właściciel organizacji ma dostęp do tej sekcji.
      </p>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          Organizacja
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Zarządzaj nazwą organizacji i rolami członków.
        </p>
      </div>

      <div className="bg-card rounded-xl border p-4 lg:p-5 space-y-3">
        <Label htmlFor="orgname">Nazwa organizacji</Label>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input id="orgname" value={name} onChange={(e) => setName(e.target.value)} />
          <Button onClick={saveName} disabled={busy}>
            <Save className="mr-2 h-4 w-4" />
            Zapisz
          </Button>
        </div>
      </div>

      {/* Mobile: stacked member cards */}
      <div className="space-y-3 lg:hidden">
        {members.length === 0 && (
          <p className="text-sm text-muted-foreground">Brak członków.</p>
        )}
        {members.map((m) => {
          const isSelf = m.user_id === user?.id;
          return (
            <div key={m.user_id} className="bg-card rounded-xl border p-4 space-y-3">
              <div>
                <p className="font-medium text-foreground break-words">{m.full_name ?? "—"}</p>
                <p className="text-sm text-muted-foreground break-all">{m.email ?? "—"}</p>
              </div>
              {isSelf || m.role === "owner" ? (
                <span className="inline-block rounded-full bg-accent text-accent-foreground px-2 py-0.5 text-xs font-medium">
                  {roleLabel(m.role)}
                </span>
              ) : (
                <div className="space-y-2">
                  <Select value={m.role} onValueChange={(v) => changeRole(m.user_id, v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrator</SelectItem>
                      <SelectItem value="standard">Standard</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => removeMember(m.user_id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                    Usuń z organizacji
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-card rounded-xl border overflow-x-auto hidden lg:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="text-left font-medium px-4 py-3">Imię i nazwisko</th>
              <th className="text-left font-medium px-4 py-3">E-mail</th>
              <th className="text-left font-medium px-4 py-3">Rola</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {members.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-muted-foreground">
                  Brak członków.
                </td>
              </tr>
            )}
            {members.map((m) => {
              const isSelf = m.user_id === user?.id;
              return (
                <tr key={m.user_id} className="border-b last:border-0">
                  <td className="px-4 py-3">{m.full_name ?? "—"}</td>
                  <td className="px-4 py-3">{m.email ?? "—"}</td>
                  <td className="px-4 py-3">
                    {isSelf || m.role === "owner" ? (
                      <span className="rounded-full bg-accent text-accent-foreground px-2 py-0.5 text-xs font-medium">
                        {roleLabel(m.role)}
                      </span>
                    ) : (
                      <Select value={m.role} onValueChange={(v) => changeRole(m.user_id, v)}>
                        <SelectTrigger className="w-[170px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Administrator</SelectItem>
                          <SelectItem value="standard">Standard</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!isSelf && m.role !== "owner" && (
                      <Button variant="ghost" size="sm" onClick={() => removeMember(m.user_id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        Dodawanie członków przez zaproszenia pojawi się wkrótce.
      </p>
    </div>
  );
};

export default Organization;
