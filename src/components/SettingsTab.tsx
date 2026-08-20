import { useEffect, useState } from "react";
import { Building2, User, Hash, Plus, Pencil, Trash2, Save, X, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/hooks/useOrg";
import { Company, Contractor } from "@/lib/parties";
import { TelegramCard } from "@/components/TelegramCard";
import { toast } from "@/hooks/use-toast";


type CompanyForm = {
  name: string; address: string; nip: string; representative: string;
  krs: string; regon: string; city: string;
};
type ContractorForm = {
  full_name: string; address: string; pesel: string;
  document_number: string; tax_office: string; bank_account: string; email: string; phone: string;
};

const emptyCompany: CompanyForm = { name: "", address: "", nip: "", representative: "", krs: "", regon: "", city: "" };
const emptyContractor: ContractorForm = {
  full_name: "", address: "", pesel: "",
  document_number: "", tax_office: "", bank_account: "", email: "", phone: "",
};

type CounterRow = { period_key: string; counter: number };

export function SettingsTab() {
  const { orgId, isAdmin, isOwner, loading: orgLoading } = useOrg();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [prefix, setPrefix] = useState("");
  const [numberFormat, setNumberFormat] = useState("{N}/{MM}/{YYYY}");
  const [counters, setCounters] = useState<CounterRow[]>([]);
  const [counterDrafts, setCounterDrafts] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const [companyForm, setCompanyForm] = useState<CompanyForm>(emptyCompany);
  const [editingCompany, setEditingCompany] = useState<string | null>(null);
  const [contractorForm, setContractorForm] = useState<ContractorForm>(emptyContractor);
  const [editingContractor, setEditingContractor] = useState<string | null>(null);

  const reload = async (id: string) => {
    const [c1, c2, n, cc] = await Promise.all([
      supabase.from("companies").select("*").eq("org_id", id).order("created_at"),
      supabase.from("contractors").select("*").eq("org_id", id).order("created_at"),
      supabase.from("numbering_rules").select("*").eq("org_id", id).maybeSingle(),
      supabase.from("contract_counters").select("period_key, counter").eq("org_id", id).order("period_key"),
    ]);
    const err = c1.error || c2.error || n.error || cc.error;
    if (err) {
      toast({ title: "Błąd wczytywania danych", description: err.message, variant: "destructive" });
      return;
    }
    setCompanies((c1.data as Company[]) ?? []);
    setContractors((c2.data as Contractor[]) ?? []);
    setPrefix(n.data?.prefix ?? "");
    if (n.data?.format) setNumberFormat(n.data.format);
    const rows = (cc.data as CounterRow[]) ?? [];
    setCounters(rows);
    setCounterDrafts(Object.fromEntries(rows.map((r) => [r.period_key, String(r.counter)])));
  };

  const saveCounter = async (periodKey: string, value: number) => {
    if (!orgId) return;
    setSavingKey(periodKey);
    const { error } = await supabase.rpc("set_contract_counter", {
      _org_id: orgId,
      _period_key: periodKey,
      _value: value,
    });
    setSavingKey(null);
    if (error) {
      return toast({ title: "Błąd zapisu licznika", description: error.message, variant: "destructive" });
    }
    toast({ title: "Licznik zaktualizowany", description: `${periodKey}: ${value}` });
    reload(orgId);
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

  const setDefaultParty = async (table: "companies" | "contractors", id: string, value: boolean) => {
    if (!orgId) return;
    if (value) {
      // only one default per organization
      const { error: clearErr } = await supabase
        .from(table)
        .update({ is_default: false })
        .eq("org_id", orgId)
        .eq("is_default", true);
      if (clearErr) {
        return toast({ title: "Błąd zapisu", description: clearErr.message, variant: "destructive" });
      }
    }
    const { error } = await supabase.from(table).update({ is_default: value }).eq("id", id);
    if (error) return toast({ title: "Błąd zapisu", description: error.message, variant: "destructive" });
    reload(orgId);
  };


  const savePrefix = async () => {
    if (!orgId) return;
    const { error } = await supabase.from("numbering_rules").update({ prefix }).eq("org_id", orgId);
    if (error) return toast({ title: "Błąd zapisu", description: error.message, variant: "destructive" });
    toast({ title: "Zapisano numerację" });
  };

  const now = new Date();
  const numberExample = (numberFormat || "{prefix}{NN}/{MM}/{YY}")
    .replace("{prefix}", prefix ?? "")
    .replace("{NNN}", "001")
    .replace("{NN}", "01")
    .replace("{N}", "1")
    .replace("{MM}", String(now.getMonth() + 1).padStart(2, "0"))
    .replace("{YYYY}", String(now.getFullYear()))
    .replace("{YY}", String(now.getFullYear()).slice(-2));

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
            <div key={c.id} className="flex flex-col md:flex-row md:items-start gap-2 md:gap-3 rounded-lg border p-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground break-words md:truncate">{c.name}</p>
                <p className="text-xs text-muted-foreground break-words md:truncate">{c.address}</p>
                <p className="text-xs text-muted-foreground break-words md:truncate">
                  {c.nip && <>NIP: {c.nip} · </>}
                  {c.krs && <>KRS: {c.krs} · </>}
                  {c.regon && <>REGON: {c.regon}</>}
                </p>
              </div>
              <div className="flex items-center gap-1 md:contents">
              <label className="flex items-center gap-2 text-xs text-muted-foreground shrink-0 mr-auto md:mr-0">
                <Switch
                  checked={!!c.is_default}
                  onCheckedChange={(v) => setDefaultParty("companies", c.id, v)}
                />
                Domyślny
              </label>
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
                    krs: c.krs ?? "",
                    regon: c.regon ?? "",
                    city: c.city ?? "",
                  });
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => removeCompany(c.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
              </div>
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
            <Input id="cNip" autoCapitalize="off" autoCorrect="off" value={companyForm.nip} onChange={(e) => setCompanyForm({ ...companyForm, nip: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="cAddr">Adres firmy</Label>
            <Input id="cAddr" value={companyForm.address} onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="cKrs">KRS</Label>
            <Input id="cKrs" autoCapitalize="off" autoCorrect="off" value={companyForm.krs} onChange={(e) => setCompanyForm({ ...companyForm, krs: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="cRegon">REGON</Label>
            <Input id="cRegon" autoCapitalize="off" autoCorrect="off" value={companyForm.regon} onChange={(e) => setCompanyForm({ ...companyForm, regon: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="cCity">Miejscowość</Label>
            <Input id="cCity" value={companyForm.city} onChange={(e) => setCompanyForm({ ...companyForm, city: e.target.value })} placeholder="Warszawa" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="cRep">Reprezentowany przez</Label>
            <Textarea id="cRep" rows={3} value={companyForm.representative} onChange={(e) => setCompanyForm({ ...companyForm, representative: e.target.value })} />
            <p className="text-xs text-muted-foreground mt-1">
              Jedna osoba w jednej linii, np. Vadym Moskalenko – Członek Zarządu
            </p>
          </div>
          <div className="sm:col-span-2 flex gap-2">
            <Button onClick={saveCompany} className="flex-1 brand-gradient text-white border-0 hover:opacity-90">
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
            <div key={c.id} className="flex flex-col md:flex-row md:items-start gap-2 md:gap-3 rounded-lg border p-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground break-words md:truncate">{c.full_name}</p>
                <p className="text-xs text-muted-foreground break-words md:truncate">{c.address}</p>
                {c.pesel && <p className="text-xs text-muted-foreground break-words md:truncate">PESEL: {c.pesel}</p>}
              </div>
              <div className="flex items-center gap-1 md:contents">
              <label className="flex items-center gap-2 text-xs text-muted-foreground shrink-0 mr-auto md:mr-0">
                <Switch
                  checked={!!c.is_default}
                  onCheckedChange={(v) => setDefaultParty("contractors", c.id, v)}
                />
                Domyślny
              </label>
              <Button

                variant="ghost"
                size="icon"
                onClick={() => {
                  setEditingContractor(c.id);
                  setContractorForm({
                    full_name: c.full_name ?? "",
                    address: c.address ?? "",
                    pesel: c.pesel ?? "",
                    document_number: c.document_number ?? "",
                    tax_office: c.tax_office ?? "",
                    bank_account: c.bank_account ?? "",
                    email: c.email ?? "",
                    phone: c.phone ?? "",
                  });
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => removeContractor(c.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
              </div>
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
            <Input id="wPesel" autoCapitalize="off" autoCorrect="off" value={contractorForm.pesel} onChange={(e) => setContractorForm({ ...contractorForm, pesel: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="wAddr">Adres zamieszkania</Label>
            <Input id="wAddr" value={contractorForm.address} onChange={(e) => setContractorForm({ ...contractorForm, address: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="wDoc">Dokument (paszport / karta pobytu)</Label>
            <Input id="wDoc" autoCapitalize="off" autoCorrect="off" value={contractorForm.document_number} onChange={(e) => setContractorForm({ ...contractorForm, document_number: e.target.value })} placeholder="GM408049" />
          </div>
          <div>
            <Label htmlFor="wTax">Urząd Skarbowy</Label>
            <Input id="wTax" value={contractorForm.tax_office} onChange={(e) => setContractorForm({ ...contractorForm, tax_office: e.target.value })} placeholder="Warszawa-Bemowo" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="wBank">Nr konta bankowego</Label>
            <Input id="wBank" autoCapitalize="off" autoCorrect="off" value={contractorForm.bank_account} onChange={(e) => setContractorForm({ ...contractorForm, bank_account: e.target.value })} placeholder="PL00 0000 0000 0000 0000 0000 0000" />
          </div>
          <div>
            <Label htmlFor="wEmail">E-mail</Label>
            <Input id="wEmail" type="email" value={contractorForm.email} onChange={(e) => setContractorForm({ ...contractorForm, email: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="wPhone">Telefon</Label>
            <Input id="wPhone" value={contractorForm.phone} onChange={(e) => setContractorForm({ ...contractorForm, phone: e.target.value })} />
          </div>
          <div className="sm:col-span-2 flex gap-2">
            <Button onClick={saveContractor} className="flex-1 brand-gradient text-white border-0 hover:opacity-90">
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
            placeholder="(bez prefiksu)"
          />
          <p className="text-xs text-muted-foreground mt-1">Numer umowy: {numberExample}</p>
          <p className="text-xs text-muted-foreground">Format: {numberFormat}</p>
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

        {isOwner && (
          <div className="border-t pt-4 space-y-3">
            <div>
              <p className="font-medium text-foreground text-sm">Liczniki numeracji</p>
              <p className="text-xs text-muted-foreground">
                Wartość licznika to numer ostatnio nadanej umowy w danym okresie. Kolejna umowa
                otrzyma numer o jeden większy.
              </p>
            </div>
            {counters.length === 0 && (
              <p className="text-sm text-muted-foreground">Brak liczników dla tej organizacji.</p>
            )}
            {counters.map((c) => (
              <div key={c.period_key} className="flex flex-col md:flex-row md:items-center gap-2 rounded-lg border p-3">
                <span className="font-medium text-foreground text-sm md:w-24 md:shrink-0">{c.period_key}</span>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  className="w-full md:w-28"
                  value={counterDrafts[c.period_key] ?? ""}
                  onChange={(e) =>
                    setCounterDrafts({ ...counterDrafts, [c.period_key]: e.target.value })
                  }
                />
                <div className="flex gap-2 md:contents">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 md:flex-none"
                  disabled={savingKey === c.period_key}
                  onClick={() => {
                    const v = Number(counterDrafts[c.period_key]);
                    if (!Number.isInteger(v) || v < 0) {
                      return toast({
                        title: "Nieprawidłowa wartość",
                        description: "Podaj liczbę całkowitą nie mniejszą niż 0.",
                        variant: "destructive",
                      });
                    }
                    saveCounter(c.period_key, v);
                  }}
                >
                  <Save className="mr-2 h-4 w-4" /> Zapisz
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="flex-1 md:flex-none"
                  disabled={savingKey === c.period_key}
                  onClick={() => saveCounter(c.period_key, 0)}
                >
                  Wyzeruj
                </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>


      <TelegramCard />
    </div>

  );
}
