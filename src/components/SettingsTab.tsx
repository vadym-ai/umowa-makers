import { useEffect, useState } from "react";
import { Building2, User, Hash, Plus, Pencil, Trash2, Save, X, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/hooks/useOrg";
import { Company, Contractor } from "@/lib/parties";
import { toast } from "@/hooks/use-toast";

type CompanyForm = { name: string; address: string; nip: string; representative: string };
type ContractorForm = { full_name: string; address: string; pesel: string };

const emptyCompany: CompanyForm = { name: "", address: "", nip: "", representative: "" };
const emptyContractor: ContractorForm = { full_name: "", address: "", pesel: "" };

export function SettingsTab() {
  const { orgId, isAdmin, loading: orgLoading } = useOrg();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [prefix, setPrefix] = useState("W-");

  const [companyForm, setCompanyForm] = useState<CompanyForm>(emptyCompany);
  const [editingCompany, setEditingCompany] = useState<string | null>(null);
  const [contractorForm, setContractorForm] = useState<ContractorForm>(emptyContractor);
  const [editingContractor, setEditingContractor] = useState<string | null>(null);

  const reload = async (id: string) => {
    const [c1, c2, n] = await Promise.all([
      supabase.from("companies").select("*").eq("org_id", id).order("created_at"),
      supabase.from("contractors").select("*").eq("org_id", id).order("created_at"),
      supabase.from("numbering_rules").select("*").eq("org_id", id).maybeSingle(),
    ]);
    const err = c1.error || c2.error || n.error;
    if (err) {
      toast({ title: "Błąd wczytywania danych", description: err.message, variant: "destructive" });
      return;
    }
    setCompanies((c1.data as Company[]) ?? []);
    setContractors((c2.data as Contractor[]) ?? []);
    if (n.data?.prefix) setPrefix(n.data.prefix);
  };


  useEffect(() => {
    if (orgId) reload(orgId);
  }, [orgId]);

  const saveCompany = async () => {
    if (!orgId || !companyForm.name.trim()) return;
    const payload = { ...companyForm, org_id: orgId };
    const { error } = editingCompany
      ? await supabase.from("companies").update(payload).eq("id", editingCompany)
      : await supabase.from("companies").insert(payload);
    if (error) return toast({ title: "Błąd zapisu", description: error.message, variant: "destructive" });
    setCompanyForm(emptyCompany);
    setEditingCompany(null);
    reload(orgId);
  };

  const saveContractor = async () => {
    if (!orgId || !contractorForm.full_name.trim()) return;
    const payload = { ...contractorForm, org_id: orgId };
    const { error } = editingContractor
      ? await supabase.from("contractors").update(payload).eq("id", editingContractor)
      : await supabase.from("contractors").insert(payload);
    if (error) return toast({ title: "Błąd zapisu", description: error.message, variant: "destructive" });
    setContractorForm(emptyContractor);
    setEditingContractor(null);
    reload(orgId);
  };

  const removeCompany = async (id: string) => {
    const { error } = await supabase.from("companies").delete().eq("id", id);
    if (error) return toast({ title: "Błąd usuwania", description: error.message, variant: "destructive" });
    if (orgId) reload(orgId);
  };

  const removeContractor = async (id: string) => {
    const { error } = await supabase.from("contractors").delete().eq("id", id);
    if (error) return toast({ title: "Błąd usuwania", description: error.message, variant: "destructive" });
    if (orgId) reload(orgId);
  };


  const savePrefix = async () => {
    if (!orgId) return;
    const { error } = await supabase.from("numbering_rules").update({ prefix }).eq("org_id", orgId);
    if (error) return toast({ title: "Błąd zapisu", description: error.message, variant: "destructive" });
    toast({ title: "Zapisano numerację" });
  };

  if (orgLoading) {
    return <p className="text-muted-foreground">Ładowanie…</p>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dane Stron</h1>
        <p className="text-muted-foreground mt-1">
          Zarządzaj listą zamawiających i wykonawców swojej organizacji.
        </p>
      </div>

      {/* Companies */}
      <section className="bg-card rounded-xl border p-6 space-y-4">
        <div className="flex items-center gap-2 text-foreground font-semibold text-lg">
          <Building2 className="h-5 w-5 text-primary" />
          Zamawiający (firmy)
        </div>

        <div className="space-y-2">
          {companies.length === 0 && (
            <p className="text-sm text-muted-foreground">Brak firm. Dodaj pierwszą poniżej.</p>
          )}
          {companies.map((c) => (
            <div key={c.id} className="flex items-start gap-3 rounded-lg border p-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{c.name}</p>
                <p className="text-xs text-muted-foreground truncate">{c.address}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {c.nip && <>NIP: {c.nip} · </>}
                  {c.representative}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setEditingCompany(c.id);
                  setCompanyForm({
                    name: c.name ?? "",
                    address: c.address ?? "",
                    nip: c.nip ?? "",
                    representative: c.representative ?? "",
                  });
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => removeCompany(c.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 border-t pt-4">
          <div>
            <Label htmlFor="cName">Nazwa firmy</Label>
            <Input id="cName" value={companyForm.name} onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="cNip">NIP</Label>
            <Input id="cNip" value={companyForm.nip} onChange={(e) => setCompanyForm({ ...companyForm, nip: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="cAddr">Adres firmy</Label>
            <Input id="cAddr" value={companyForm.address} onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="cRep">Reprezentowany przez</Label>
            <Input id="cRep" value={companyForm.representative} onChange={(e) => setCompanyForm({ ...companyForm, representative: e.target.value })} />
          </div>
          <div className="sm:col-span-2 flex gap-2">
            <Button onClick={saveCompany} className="flex-1">
              {editingCompany ? <Save className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
              {editingCompany ? "Zapisz zmiany" : "Dodaj firmę"}
            </Button>
            {editingCompany && (
              <Button variant="outline" onClick={() => { setEditingCompany(null); setCompanyForm(emptyCompany); }}>
                <X className="mr-2 h-4 w-4" /> Anuluj
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Contractors */}
      <section className="bg-card rounded-xl border p-6 space-y-4">
        <div className="flex items-center gap-2 text-foreground font-semibold text-lg">
          <User className="h-5 w-5 text-primary" />
          Wykonawcy
        </div>

        <div className="space-y-2">
          {contractors.length === 0 && (
            <p className="text-sm text-muted-foreground">Brak wykonawców. Dodaj pierwszego poniżej.</p>
          )}
          {contractors.map((c) => (
            <div key={c.id} className="flex items-start gap-3 rounded-lg border p-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{c.full_name}</p>
                <p className="text-xs text-muted-foreground truncate">{c.address}</p>
                {c.pesel && <p className="text-xs text-muted-foreground truncate">PESEL: {c.pesel}</p>}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setEditingContractor(c.id);
                  setContractorForm({
                    full_name: c.full_name ?? "",
                    address: c.address ?? "",
                    pesel: c.pesel ?? "",
                  });
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => removeContractor(c.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 border-t pt-4">
          <div>
            <Label htmlFor="wName">Imię i Nazwisko</Label>
            <Input id="wName" value={contractorForm.full_name} onChange={(e) => setContractorForm({ ...contractorForm, full_name: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="wPesel">PESEL</Label>
            <Input id="wPesel" value={contractorForm.pesel} onChange={(e) => setContractorForm({ ...contractorForm, pesel: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="wAddr">Adres zamieszkania</Label>
            <Input id="wAddr" value={contractorForm.address} onChange={(e) => setContractorForm({ ...contractorForm, address: e.target.value })} />
          </div>
          <div className="sm:col-span-2 flex gap-2">
            <Button onClick={saveContractor} className="flex-1">
              {editingContractor ? <Save className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
              {editingContractor ? "Zapisz zmiany" : "Dodaj wykonawcę"}
            </Button>
            {editingContractor && (
              <Button variant="outline" onClick={() => { setEditingContractor(null); setContractorForm(emptyContractor); }}>
                <X className="mr-2 h-4 w-4" /> Anuluj
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Numbering */}
      <section className="bg-card rounded-xl border p-6 space-y-4">
        <div className="flex items-center gap-2 text-foreground font-semibold text-lg">
          <Hash className="h-5 w-5 text-primary" />
          Numeracja
        </div>
        <div>
          <Label htmlFor="prefix">Prefiks numeru umowy</Label>
          <Input
            id="prefix"
            value={prefix}
            disabled={!isAdmin}
            onChange={(e) => setPrefix(e.target.value)}
            placeholder="W-"
          />
          <p className="text-xs text-muted-foreground mt-1">Numer umowy: {prefix}01/MM/RR</p>
          {!isAdmin && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Lock className="h-3 w-3" /> Tylko administrator organizacji może zmieniać numerację.
            </p>
          )}
        </div>
        {isAdmin && (
          <Button onClick={savePrefix} className="w-full">
            <Save className="mr-2 h-4 w-4" /> Zapisz numerację
          </Button>
        )}
      </section>
    </div>
  );
}
