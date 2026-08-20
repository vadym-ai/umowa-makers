import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  Calendar,
  CheckCircle,
  FileDown,
  Save,
  User,
  UserCheck,
  AlertTriangle,
  X,
  Pencil,
  RotateCcw,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DocumentPreviewFrame,
  DocumentPreviewFrameHandle,
} from "@/components/DocumentPreviewFrame";
import { MobileCollapsibleCard } from "@/components/MobileCollapsibleCard";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ZgodaPreview } from "@/components/ZgodaPreview";
import { EditableDocument } from "@/components/EditableDocument";
import { sanitizeDocumentHtml } from "@/lib/documentHtml";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useOrg } from "@/hooks/useOrg";
import { useAuth } from "@/hooks/useAuth";
import { Company, Contractor } from "@/lib/parties";
import { ContractRow, ContractSnapshot } from "@/lib/contracts";
import {
  addPeriod,
  PeriodUnit,
  polishPeriodPhrase,
  representativeLines,
  representativeName,
} from "@/lib/zgoda";
import { toast } from "@/hooks/use-toast";

const DOC_TYPE = "zgoda_materialy";

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatDatePolish(isoDate: string) {
  const [y, m, d] = (isoDate || "").split("-");
  return y && m && d ? `${d}.${m}.${y}` : "—";
}

interface ZgodaTabProps {
  editingContract?: ContractRow | null;
  onExitEdit?: () => void;
}

export function ZgodaTab({ editingContract = null, onExitEdit }: ZgodaTabProps) {
  const { orgId } = useOrg();
  const { user } = useAuth();
  const previewRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<DocumentPreviewFrameHandle>(null);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [contractorId, setContractorId] = useState("");
  const [representative, setRepresentative] = useState("");
  const [city, setCity] = useState("Warszawa");
  const [date, setDate] = useState(todayIso);
  const [periodCount, setPeriodCount] = useState(3);
  const [periodUnit, setPeriodUnit] = useState<PeriodUnit>("years");
  const [paid, setPaid] = useState(false);
  const [amount, setAmount] = useState<number>(0);
  const [previewNumber, setPreviewNumber] = useState("—");
  const [saving, setSaving] = useState(false);
  const [editedHtml, setEditedHtml] = useState<string | null>(null);
  const [textEditing, setTextEditing] = useState(false);

  const isEditing = !!editingContract;

  useEffect(() => {
    if (!orgId) return;
    let active = true;
    (async () => {
      const [c1, c2] = await Promise.all([
        supabase.from("companies").select("*").eq("org_id", orgId).order("created_at"),
        supabase.from("contractors").select("*").eq("org_id", orgId).order("created_at"),
      ]);
      if (!active) return;
      const err = c1.error || c2.error;
      if (err) {
        toast({ title: "Błąd wczytywania danych", description: err.message, variant: "destructive" });
        return;
      }
      setCompanies((c1.data as Company[]) ?? []);
      setContractors((c2.data as Contractor[]) ?? []);
    })();
    return () => {
      active = false;
    };
  }, [orgId]);

  // Prefill in edit mode
  useEffect(() => {
    if (!editingContract) return;
    const d = (editingContract.data ?? {}) as ContractSnapshot;
    const z = d.zgoda;
    setCompanyId(editingContract.company_id ?? "");
    setContractorId(editingContract.contractor_id ?? "");
    setPreviewNumber(editingContract.number);
    if (d.city) setCity(d.city);
    if (d.startDate) setDate(d.startDate);
    if (z) {
      if (z.representative) setRepresentative(z.representative);
      if (z.periodCount) setPeriodCount(z.periodCount);
      if (z.periodUnit) setPeriodUnit(z.periodUnit);
      setPaid(!!z.paid);
      if (typeof z.amount === "number") setAmount(z.amount);
    }
    if (d.editedHtml) {
      setEditedHtml(sanitizeDocumentHtml(d.editedHtml));
      setTextEditing(true);
    }
  }, [editingContract]);

  const refreshPreviewNumber = useCallback(async () => {
    if (!orgId || isEditing) return;
    const [y, m] = date.split("-").map(Number);
    const { data, error } = await supabase.rpc("preview_document_number", {
      _org_id: orgId,
      _month: m || new Date().getMonth() + 1,
      _year: y || new Date().getFullYear(),
      _doc_type: DOC_TYPE,
    });
    if (error) {
      toast({ title: "Błąd numeracji", description: error.message, variant: "destructive" });
      return;
    }
    setPreviewNumber((data as string) ?? "—");
  }, [orgId, date, isEditing]);

  useEffect(() => {
    refreshPreviewNumber();
  }, [refreshPreviewNumber]);

  useEffect(() => {
    if (!isEditing && !companyId && companies.length > 0) setCompanyId(companies[0].id);
  }, [companies, companyId, isEditing]);

  useEffect(() => {
    if (!isEditing && !contractorId && contractors.length > 0) setContractorId(contractors[0].id);
  }, [contractors, contractorId, isEditing]);

  const company = companies.find((c) => c.id === companyId) ?? null;
  const contractor = contractors.find((c) => c.id === contractorId) ?? null;

  const repOptions = useMemo(
    () => representativeLines(company?.representative).map(representativeName).filter(Boolean),
    [company?.representative],
  );

  useEffect(() => {
    if (repOptions.length > 0 && !repOptions.includes(representative)) {
      setRepresentative(repOptions[0]);
    }
  }, [repOptions, representative]);

  useEffect(() => {
    if (!isEditing && company?.city) setCity(company.city);
  }, [company?.city, isEditing]);

  const endDateIso = addPeriod(date, periodCount, periodUnit);
  const periodPhrase = polishPeriodPhrase(periodCount, periodUnit);
  const dateFormatted = formatDatePolish(date);
  const endDateFormatted = formatDatePolish(endDateIso);

  const previewCompany: Company | null =
    company ??
    (editingContract?.data?.company
      ? ({
          id: editingContract.data.company.id ?? "",
          org_id: editingContract.org_id,
          name: editingContract.data.company.name,
          address: editingContract.data.company.address,
          nip: editingContract.data.company.nip,
          representative: editingContract.data.company.representative,
          krs: editingContract.data.company.krs ?? null,
          regon: editingContract.data.company.regon ?? null,
          city: editingContract.data.company.city ?? null,
        } as Company)
      : null);

  const previewContractor: Contractor | null =
    contractor ??
    (editingContract?.data?.contractor
      ? ({
          id: editingContract.data.contractor.id ?? "",
          org_id: editingContract.org_id,
          full_name: editingContract.data.contractor.full_name,
          address: editingContract.data.contractor.address,
          pesel: editingContract.data.contractor.pesel,
          document_number: editingContract.data.contractor.document_number ?? null,
          tax_office: editingContract.data.contractor.tax_office ?? null,
          bank_account: editingContract.data.contractor.bank_account ?? null,
          email: editingContract.data.contractor.email ?? null,
          phone: editingContract.data.contractor.phone ?? null,
        } as Contractor)
      : null);

  const missingContact =
    !!previewContractor && (!previewContractor.email || !previewContractor.phone);

  const syncEditedFromDom = () => {
    if (!textEditing || !previewRef.current) return editedHtml;
    const html = previewRef.current.innerHTML;
    setEditedHtml(html);
    return html;
  };

  const startTextEditing = () => {
    if (previewRef.current && !editedHtml) setEditedHtml(previewRef.current.innerHTML);
    setTextEditing(true);
  };

  const finishTextEditing = () => {
    syncEditedFromDom();
    setTextEditing(false);
  };

  const resetTextEditing = () => {
    setEditedHtml(null);
    setTextEditing(false);
  };

  const buildSnapshot = (latest = editedHtml): ContractSnapshot => ({
    amountNet: paid ? amount : 0,
    amountWords: "",
    subject: "Zgoda na wykorzystanie wizerunku i materiałów wideo",
    startDate: date,
    endDate: endDateIso,
    month: Number(date.split("-")[1]) || new Date().getMonth() + 1,
    year: Number(date.split("-")[0]) || new Date().getFullYear(),
    city,
    paymentDays: 0,
    editedHtml: latest ?? null,
    editedAt: latest ? new Date().toISOString() : null,
    zgoda: {
      representative,
      periodCount,
      periodUnit,
      paid,
      amount: paid ? amount : null,
      endDate: endDateIso,
    },
    company: previewCompany
      ? {
          id: previewCompany.id || null,
          name: previewCompany.name,
          address: previewCompany.address,
          nip: previewCompany.nip,
          representative: previewCompany.representative,
          krs: previewCompany.krs ?? null,
          regon: previewCompany.regon ?? null,
          city: previewCompany.city ?? null,
        }
      : null,
    contractor: previewContractor
      ? {
          id: previewContractor.id || null,
          full_name: previewContractor.full_name,
          address: previewContractor.address,
          pesel: previewContractor.pesel,
          document_number: previewContractor.document_number ?? null,
          tax_office: previewContractor.tax_office ?? null,
          bank_account: previewContractor.bank_account ?? null,
          email: previewContractor.email ?? null,
          phone: previewContractor.phone ?? null,
        }
      : null,
  });

  const handleConfirm = async () => {
    if (!orgId) return;
    const latest = syncEditedFromDom();
    setSaving(true);
    const [y, m] = date.split("-").map(Number);
    const { data: num, error } = await supabase.rpc("next_document_number", {
      _org_id: orgId,
      _month: m,
      _year: y,
      _doc_type: DOC_TYPE,
    });
    if (error || !num) {
      setSaving(false);
      toast({ title: "Błąd numeracji", description: error?.message ?? "Brak numeru", variant: "destructive" });
      return;
    }
    const { error: insErr } = await supabase.from("contracts").insert({
      org_id: orgId,
      company_id: companyId || null,
      contractor_id: contractorId || null,
      contract_type: DOC_TYPE,
      number: num as string,
      period_month: m,
      period_year: y,
      data: buildSnapshot(latest) as unknown as Json,
      created_by: user?.id ?? null,
    });
    setSaving(false);
    if (insErr) {
      toast({ title: "Błąd zapisu zgody", description: insErr.message, variant: "destructive" });
      return;
    }
    toast({ title: "Zgoda zatwierdzona", description: `Numer dokumentu: ${num}` });
    refreshPreviewNumber();
  };

  const handleSaveChanges = async () => {
    if (!editingContract) return;
    const latest = syncEditedFromDom();
    setSaving(true);
    const [y, m] = date.split("-").map(Number);
    const { error } = await supabase
      .from("contracts")
      .update({
        company_id: companyId || null,
        contractor_id: contractorId || null,
        period_month: m,
        period_year: y,
        data: buildSnapshot(latest) as unknown as Json,
      })
      .eq("id", editingContract.id);
    setSaving(false);
    if (error) {
      toast({ title: "Błąd zapisu", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Zapisano zmiany", description: `Zgoda ${editingContract.number}` });
  };

  const handleDownloadPdf = async () => {
    if (!previewRef.current) return;
    const el = previewRef.current;
    if (textEditing) setEditedHtml(el.innerHTML);
    const html2pdf = (await import("html2pdf.js")).default;
    const opt = {
      margin: 0,
      filename: `ZGODA-${previewNumber.replace(/[/\\]/g, "-")}.pdf`,
      image: { type: "jpeg" as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm" as const, format: "a4" as const, orientation: "portrait" as const },
      pagebreak: { mode: ["avoid-all", "css"] },
    };
    const runExport = async () => {
      const prevMinHeight = el.style.minHeight;
      el.style.minHeight = "0";
      const wasEditable = el.getAttribute("contenteditable");
      if (wasEditable !== null) el.removeAttribute("contenteditable");
      try {
        await html2pdf().set(opt).from(el).save();
      } finally {
        el.style.minHeight = prevMinHeight;
        if (wasEditable !== null) el.setAttribute("contenteditable", wasEditable);
      }
    };
    // Export must run unscaled — the mobile preview may be transform-scaled.
    if (frameRef.current) await frameRef.current.runUnscaled(runExport);
    else await runExport();
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      <div className="w-full lg:w-80 lg:shrink-0 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {isEditing ? "Edycja zgody" : "Zgoda na materiały"}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {isEditing
              ? `Edytujesz dokument ${editingContract?.number}.`
              : "Wizerunek i materiały wideo twórcy."}
          </p>
          {isEditing && (
            <Button variant="ghost" size="sm" className="mt-2 -ml-2" onClick={onExitEdit}>
              <X className="mr-2 h-4 w-4" />
              Zakończ edycję
            </Button>
          )}
        </div>

        <div className="bg-card rounded-xl border p-4 lg:p-5 space-y-4">
          <div className="min-w-0">
            <Label className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
              Firma
            </Label>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger>
                <SelectValue placeholder="Wybierz firmę" />
              </SelectTrigger>
              {companies.length > 0 && (
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              )}
            </Select>
          </div>

          <div className="min-w-0">
            <Label className="flex items-center gap-1.5">
              <UserCheck className="h-3.5 w-3.5 text-primary shrink-0" />
              Reprezentant
            </Label>
            <Select value={representative} onValueChange={setRepresentative}>
              <SelectTrigger>
                <SelectValue placeholder="Wybierz reprezentanta" />
              </SelectTrigger>
              {repOptions.length > 0 && (
                <SelectContent>
                  {repOptions.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              )}
            </Select>
            {repOptions.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Brak reprezentantów — uzupełnij pole w „Dane Stron”.
              </p>
            )}
          </div>

          <div className="min-w-0">
            <Label className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-primary shrink-0" />
              Twórca
            </Label>
            <Select value={contractorId} onValueChange={setContractorId}>
              <SelectTrigger>
                <SelectValue placeholder="Wybierz twórcę" />
              </SelectTrigger>
              {contractors.length > 0 && (
                <SelectContent>
                  {contractors.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                  ))}
                </SelectContent>
              )}
            </Select>
            {previewContractor && (
              <div className="mt-2 rounded-lg bg-muted/60 p-2 text-xs text-muted-foreground space-y-0.5">
                <div>Adres: {previewContractor.address || "—"}</div>
                <div>
                  PESEL / nr dokumentu:{" "}
                  {previewContractor.pesel || previewContractor.document_number || "—"}
                </div>
                <div>E-mail: {previewContractor.email || "—"}</div>
                <div>Telefon: {previewContractor.phone || "—"}</div>
              </div>
            )}
            {missingContact && (
              <p className="mt-2 flex items-start gap-1.5 text-xs text-destructive">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>
                  Brakuje e-maila lub telefonu twórcy.{" "}
                  <Link to="/dane-stron" className="underline">
                    Uzupełnij w Dane Stron
                  </Link>
                  .
                </span>
              </p>
            )}
          </div>
        </div>

        <div className="bg-card rounded-xl border p-4 lg:p-5 space-y-4">
          <div>
            <Label htmlFor="zgoda-city">Miejscowość</Label>
            <Input id="zgoda-city" value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="zgoda-date" className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              Data
            </Label>
            <Input
              id="zgoda-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="flex items-end gap-3">
            <div className="w-24">
              <Label htmlFor="zgoda-period">Okres zgody</Label>
              <Input
                id="zgoda-period"
                type="number"
                inputMode="numeric"
                min={1}
                value={periodCount}
                onChange={(e) => setPeriodCount(Math.max(1, Number(e.target.value) || 1))}
              />
            </div>
            <div className="flex-1">
              <Label className="sr-only">Jednostka</Label>
              <Select value={periodUnit} onValueChange={(v) => setPeriodUnit(v as PeriodUnit)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="months">miesiące</SelectItem>
                  <SelectItem value="years">lata</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Wynagrodzenie</Label>
            <div className="mt-1 space-y-1.5 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="zgoda-pay"
                  checked={!paid}
                  onChange={() => setPaid(false)}
                />
                nieodpłatnie
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="zgoda-pay"
                  checked={paid}
                  onChange={() => setPaid(true)}
                />
                odpłatnie
              </label>
            </div>
            {paid && (
              <div className="mt-2">
                <Label htmlFor="zgoda-amount" className="text-xs">Kwota (PLN)</Label>
                <Input
                  id="zgoda-amount"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                />
              </div>
            )}
          </div>
        </div>

        <MobileCollapsibleCard title="Podsumowanie" hideTitleOnDesktop>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Nr dokumentu:</span>
              <span className="font-medium text-foreground">{previewNumber}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Data:</span>
              <span className="font-medium text-foreground">{dateFormatted}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Obowiązuje do:</span>
              <span className="font-medium text-foreground">{endDateFormatted}</span>
            </div>
          </div>
        </MobileCollapsibleCard>

        <div className="hidden lg:flex flex-col sm:flex-row gap-3">
          <Button
            onClick={handleDownloadPdf}
            className="w-full sm:flex-1 brand-gradient text-white border-0 hover:opacity-90"
            size="lg"
          >
            <FileDown className="mr-2 h-5 w-5" />
            Pobierz PDF
          </Button>
          {isEditing ? (
            <Button onClick={handleSaveChanges} variant="outline" size="lg" className="w-full sm:w-auto" disabled={saving}>
              <Save className="mr-2 h-5 w-5" />
              Zapisz zmiany
            </Button>
          ) : (
            <Button onClick={handleConfirm} variant="outline" size="lg" className="w-full sm:w-auto" disabled={saving || !orgId}>
              <CheckCircle className="mr-2 h-5 w-5" />
              Zatwierdź
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 min-w-0 overflow-x-hidden bg-muted/50 rounded-xl p-3 lg:p-6 flex justify-start lg:justify-center">
        <div className="w-full lg:w-auto min-w-0 lg:shrink-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {!textEditing ? (
              <Button variant="outline" size="sm" onClick={startTextEditing}>
                <Pencil className="mr-2 h-4 w-4" />
                Edytuj tekst
              </Button>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={finishTextEditing}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Zakończ edycję
                </Button>
                <Button variant="ghost" size="sm" onClick={resetTextEditing}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Przywróć oryginał
                </Button>
              </>
            )}
          </div>
          {textEditing && (
            <div className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs text-foreground">
              Tryb edycji ręcznej — zmiany w formularzu nie aktualizują tekstu dokumentu.
            </div>
          )}
          {!textEditing && editedHtml && (
            <div className="rounded-lg border bg-card px-3 py-2 text-xs text-muted-foreground">
              Ten dokument zawiera ręczne poprawki.{" "}
              <button type="button" className="underline" onClick={startTextEditing}>
                Wróć do edycji
              </button>
              {" · "}
              <button type="button" className="underline" onClick={resetTextEditing}>
                Przywróć oryginał
              </button>
            </div>
          )}
          <DocumentPreviewFrame ref={frameRef} editing={textEditing}>
          <div className="shadow-2xl w-fit">
          <EditableDocument
            editing={textEditing}
            html={editedHtml}
            onHtmlChange={setEditedHtml}
            exportRef={previewRef}
          >
          <ZgodaPreview
            ref={previewRef}
            documentNumber={previewNumber}
            date={dateFormatted}
            endDate={endDateFormatted}
            city={city}
            company={previewCompany}
            contractor={previewContractor}
            representative={representative}
            periodPhrase={periodPhrase}
            paid={paid}
            amount={paid ? amount : null}
          />
          </EditableDocument>
          </div>
          </DocumentPreviewFrame>

          <div className="mobile-action-bar lg:hidden border-t bg-card px-3 pt-3">
            <div className="flex gap-2">
              <Button
                onClick={handleDownloadPdf}
                className="flex-1 brand-gradient text-white border-0 hover:opacity-90"
              >
                <FileDown className="mr-2 h-4 w-4" />
                Pobierz PDF
              </Button>
              {isEditing ? (
                <Button onClick={handleSaveChanges} variant="outline" disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  Zapisz
                </Button>
              ) : (
                <Button onClick={handleConfirm} variant="outline" disabled={saving || !orgId}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Zatwierdź
                </Button>
              )}
            </div>
          </div>
          <div className="h-20 lg:hidden" aria-hidden />
        </div>
      </div>
    </div>
  );
}
