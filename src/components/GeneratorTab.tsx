import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { FileDown, Sparkles, Calendar, DollarSign, FileText, CheckCircle, Building2, User, Save, X, Pencil, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ContractPreview } from "@/components/ContractPreview";
import { RachunekPreview } from "@/components/RachunekPreview";
import { EditableDocument } from "@/components/EditableDocument";
import {
  DocumentPreviewFrame,
  DocumentPreviewFrameHandle,
} from "@/components/DocumentPreviewFrame";
import { MobileCollapsibleCard } from "@/components/MobileCollapsibleCard";
import { sanitizeDocumentHtml } from "@/lib/documentHtml";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useOrg } from "@/hooks/useOrg";
import { useAuth } from "@/hooks/useAuth";
import { Company, Contractor } from "@/lib/parties";
import { ContractRow, ContractSnapshot } from "@/lib/contracts";
import { numberToPolishWords, amountInWordsPl } from "@/lib/numberToWords";
import { getRandomDescription } from "@/lib/contractDescriptions";
import { toast } from "@/hooks/use-toast";


const months = [
  "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień",
];

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function getLastDay(month: number, year: number) {
  return new Date(year, month, 0).getDate();
}

function formatDateForInput(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatDatePolish(isoDate: string) {
  const [y, m, d] = isoDate.split("-");
  return `${d}.${m}.${y}`;
}

interface GeneratorTabProps {
  editingContract?: ContractRow | null;
  onExitEdit?: () => void;
}

export function GeneratorTab({ editingContract = null, onExitEdit }: GeneratorTabProps) {
  const now = new Date();
  const { orgId } = useOrg();
  const { user } = useAuth();
  const [amountNet, setAmountNet] = useState(8000);
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [subject, setSubject] = useState("");
  const [city, setCity] = useState("Warszawa");
  const [paymentDays, setPaymentDays] = useState(3);
  const [previewNumber, setPreviewNumber] = useState("—");
  const [docMode, setDocMode] = useState<"umowa" | "rachunek">("umowa");
  const [rachunekDate, setRachunekDate] = useState("");
  const [kupRate, setKupRate] = useState<0.5 | 0.2>(0.5);
  const [bankAccount, setBankAccount] = useState("");
  const [paymentTerm, setPaymentTerm] = useState("płatność z góry");
  const [saving, setSaving] = useState(false);

  // Manual document editing — kept per document kind so umowa edits never leak
  // into the rachunek and vice versa.
  const [edited, setEdited] = useState<{ umowa: string | null; rachunek: string | null }>({
    umowa: null,
    rachunek: null,
  });
  const [editingKind, setEditingKind] = useState<"umowa" | "rachunek" | null>(null);


  const [startDate, setStartDate] = useState(() => formatDateForInput(now));
  const [endDate, setEndDate] = useState(() => {
    const last = getLastDay(now.getMonth() + 1, now.getFullYear());
    return formatDateForInput(new Date(now.getFullYear(), now.getMonth(), last));
  });
  const previewRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<DocumentPreviewFrameHandle>(null);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [companyId, setCompanyId] = useState<string>("");
  const [contractorId, setContractorId] = useState<string>("");

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

  // Prefill from an existing contract (edit mode)
  useEffect(() => {
    if (!editingContract) return;
    const d = editingContract.data ?? ({} as ContractSnapshot);
    setAmountNet(d.amountNet ?? 0);
    setSubject(d.subject ?? "");
    if (d.startDate) setStartDate(d.startDate);
    if (d.endDate) setEndDate(d.endDate);
    setSelectedMonth(editingContract.period_month ?? d.month ?? now.getMonth() + 1);
    setSelectedYear(editingContract.period_year ?? d.year ?? now.getFullYear());
    setCompanyId(editingContract.company_id ?? "");
    setContractorId(editingContract.contractor_id ?? "");
    setPreviewNumber(editingContract.number);
    if (d.city) setCity(d.city);
    if (typeof d.paymentDays === "number") setPaymentDays(d.paymentDays);
    const r = d.rachunek;
    if (r) {
      if (r.date) setRachunekDate(r.date);
      if (r.kupRate === 0.2 || r.kupRate === 0.5) setKupRate(r.kupRate);
      if (typeof r.bankAccount === "string") setBankAccount(r.bankAccount);
      if (r.paymentTerm) setPaymentTerm(r.paymentTerm);
    }
    // Restore manual edits (HTML from the database must be sanitised).
    const storedUmowa = d.editedHtml ? sanitizeDocumentHtml(d.editedHtml) : null;
    const storedRachunek = r?.editedHtml ? sanitizeDocumentHtml(r.editedHtml) : null;
    setEdited({ umowa: storedUmowa, rachunek: storedRachunek });
    if (storedUmowa) setEditingKind("umowa");
    else if (storedRachunek) {
      setDocMode("rachunek");
      setEditingKind("rachunek");
    }
  }, [editingContract]);


  const refreshPreviewNumber = useCallback(async () => {
    if (!orgId || isEditing) return;
    const { data, error } = await supabase.rpc("preview_contract_number", {
      _org_id: orgId,
      _month: selectedMonth,
      _year: selectedYear,
    });
    if (error) {
      toast({ title: "Błąd numeracji", description: error.message, variant: "destructive" });
      return;
    }
    setPreviewNumber((data as string) ?? "—");
  }, [orgId, selectedMonth, selectedYear, isEditing]);

  useEffect(() => {
    refreshPreviewNumber();
  }, [refreshPreviewNumber]);

  // Preselect the first entry once lists load, if nothing is selected yet
  useEffect(() => {
    if (!isEditing && !companyId && companies.length > 0) setCompanyId(companies[0].id);
  }, [companies, companyId, isEditing]);

  useEffect(() => {
    if (!isEditing && !contractorId && contractors.length > 0) setContractorId(contractors[0].id);
  }, [contractors, contractorId, isEditing]);

  const company = companies.find((c) => c.id === companyId) ?? null;
  const contractor = contractors.find((c) => c.id === contractorId) ?? null;

  // Default place of signing follows the selected company
  useEffect(() => {
    if (!isEditing && company?.city) setCity(company.city);
  }, [company?.city, isEditing]);

  // Rachunek defaults follow the contract
  useEffect(() => {
    setRachunekDate((prev) => prev || endDate);
  }, [endDate]);

  useEffect(() => {
    if (contractor?.bank_account) setBankAccount((prev) => prev || contractor.bank_account || "");
  }, [contractor?.bank_account]);

  const startDateFormatted = formatDatePolish(startDate);
  const endDateFormatted = formatDatePolish(endDate);
  const amountWords = useMemo(() => numberToPolishWords(amountNet), [amountNet]);

  const currentYear = now.getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];

  const handleMonthChange = (v: string) => {
    const m = Number(v);
    setSelectedMonth(m);
    const last = getLastDay(m, selectedYear);
    setEndDate(formatDateForInput(new Date(selectedYear, m - 1, last)));
  };

  const handleYearChange = (v: string) => {
    const y = Number(v);
    setSelectedYear(y);
    const last = getLastDay(selectedMonth, y);
    setEndDate(formatDateForInput(new Date(y, selectedMonth - 1, last)));
  };

  const isTextEditing = editingKind === docMode;
  const currentEditedHtml = edited[docMode];

  const setCurrentEditedHtml = (html: string) =>
    setEdited((prev) => ({ ...prev, [docMode]: html }));

  /** Read the live DOM of the editable surface (used before export / save). */
  const syncEditedFromDom = () => {
    if (!isTextEditing || !previewRef.current) return edited;
    const next = { ...edited, [docMode]: previewRef.current.innerHTML };
    setEdited(next);
    return next;
  };

  const startTextEditing = () => {
    if (previewRef.current && !edited[docMode]) {
      setEdited((prev) => ({ ...prev, [docMode]: previewRef.current!.innerHTML }));
    }
    setEditingKind(docMode);
  };

  const finishTextEditing = () => {
    syncEditedFromDom();
    setEditingKind(null);
  };

  const resetTextEditing = () => {
    setEdited((prev) => ({ ...prev, [docMode]: null }));
    setEditingKind(null);
  };

  const buildSnapshot = (latest = edited): ContractSnapshot => ({

    amountNet,
    amountWords,
    subject,
    startDate,
    endDate,
    month: selectedMonth,
    year: selectedYear,
    city,
    paymentDays,
    editedHtml: latest.umowa ?? null,
    editedAt: latest.umowa ? new Date().toISOString() : null,
    rachunek: {
      date: rachunekDate || endDate,
      kupRate,
      bankAccount,
      paymentTerm,
      editedHtml: latest.rachunek ?? null,
      editedAt: latest.rachunek ? new Date().toISOString() : null,
    },

    company: company
      ? {
          id: company.id,
          name: company.name,
          address: company.address,
          nip: company.nip,
          representative: company.representative,
          krs: company.krs ?? null,
          regon: company.regon ?? null,
          city: company.city ?? null,
        }
      : editingContract?.data?.company ?? null,
    contractor: contractor
      ? {
          id: contractor.id,
          full_name: contractor.full_name,
          address: contractor.address,
          pesel: contractor.pesel,
          document_number: contractor.document_number ?? null,
          tax_office: contractor.tax_office ?? null,
          bank_account: contractor.bank_account ?? null,
        }
      : editingContract?.data?.contractor ?? null,
  });


  const handleConfirmContract = async () => {
    if (!orgId) return;
    const latest = syncEditedFromDom();
    setSaving(true);
    const { data: num, error } = await supabase.rpc("next_contract_number", {
      _org_id: orgId,
      _month: selectedMonth,
      _year: selectedYear,
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
      number: num as string,
      period_month: selectedMonth,
      period_year: selectedYear,
      data: buildSnapshot(latest) as unknown as Json,
      created_by: user?.id ?? null,
    });
    setSaving(false);
    if (insErr) {
      toast({ title: "Błąd zapisu umowy", description: insErr.message, variant: "destructive" });
      return;
    }
    toast({ title: "Umowa zatwierdzona", description: `Numer umowy: ${num}` });
    setSubject("");
    refreshPreviewNumber();
  };

  const handleSaveChanges = async () => {
    if (!editingContract) return;
    const latest = syncEditedFromDom();
    setSaving(true);
    const { error } = await supabase
      .from("contracts")
      .update({
        company_id: companyId || null,
        contractor_id: contractorId || null,
        period_month: selectedMonth,
        period_year: selectedYear,
        data: buildSnapshot(latest) as unknown as Json,
      })
      .eq("id", editingContract.id);
    setSaving(false);
    if (error) {
      toast({ title: "Błąd zapisu", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Zapisano zmiany", description: `Umowa ${editingContract.number}` });
  };

  const contractNumber = previewNumber;

  const handleDownloadPdf = async () => {
    if (!previewRef.current) return;
    const el = previewRef.current;
    // Manual edits live in the DOM; capture them right before exporting.
    if (isTextEditing) setCurrentEditedHtml(el.innerHTML);
    const html2pdf = (await import("html2pdf.js")).default;
    const opt = {
      margin: 0,
      filename:
        docMode === "rachunek"
          ? `RACHUNEK-${contractNumber.replace(/[/\\]/g, "-")}.pdf`
          : `UOD-${contractNumber.replace(/[/\\]/g, "-")}.pdf`,
      image: { type: "jpeg" as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm" as const, format: "a4" as const, orientation: "portrait" as const },
      pagebreak: { mode: ["avoid-all", "css"] },
    };
    const runExport = async () => {
      // The preview uses min-height: 297mm + 30mm padding, which overflows A4 and
      // produces a trailing blank page. Collapse it to natural height for export.
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
    // The mobile preview may be transform-scaled; export must run at scale 1.
    if (frameRef.current) await frameRef.current.runUnscaled(runExport);
    else await runExport();
  };



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
        } as Contractor)
      : null);


  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      {/* Control Panel */}
      <div className="w-full lg:w-80 lg:shrink-0 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {isEditing ? "Edycja umowy" : "Generator Umowy"}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {isEditing
              ? `Edytujesz umowę ${editingContract?.number}.`
              : "Wypełnij dane i pobierz gotowy PDF."}
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
              Zamawiający
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
              <User className="h-3.5 w-3.5 text-primary shrink-0" />
              Wykonawca
            </Label>
            <Select value={contractorId} onValueChange={setContractorId}>
              <SelectTrigger>
                <SelectValue placeholder="Wybierz wykonawcę" />
              </SelectTrigger>
              {contractors.length > 0 && (
                <SelectContent>
                  {contractors.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                  ))}
                </SelectContent>
              )}
            </Select>
          </div>

          {(companies.length === 0 || contractors.length === 0) && (
            <p className="text-xs text-muted-foreground">
              Uzupełnij listy w zakładce „Dane Stron”.
            </p>
          )}
        </div>

        <div className="bg-card rounded-xl border p-4 lg:p-5 space-y-4">
          <div>
            <Label htmlFor="amount" className="flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-primary" />
              Kwota netto (PLN)
            </Label>
            <Input
              id="amount"
              type="number"
              inputMode="decimal"
              value={amountNet}
              onChange={(e) => setAmountNet(Number(e.target.value))}
              min={0}
            />
            {amountNet > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Słownie: {amountInWordsPl(amountNet)}
              </p>
            )}
          </div>

          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Label className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                Miesiąc
              </Label>
              <Select
                value={selectedMonth.toString()}
                onValueChange={handleMonthChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((m, i) => (
                    <SelectItem key={i} value={(i + 1).toString()}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-24">
              <Label className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                Rok
              </Label>
              <Select
                value={selectedYear.toString()}
                onValueChange={handleYearChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0">
              <Label htmlFor="startDate" className="flex items-center gap-1.5 text-xs">
                <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                Data rozpoczęcia
              </Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-base md:text-xs"
              />
            </div>
            <div className="min-w-0">
              <Label htmlFor="endDate" className="flex items-center gap-1.5 text-xs">
                <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                Termin wykonania
              </Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-base md:text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0">
              <Label htmlFor="city" className="text-xs">Miejscowość</Label>
              <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} className="text-base md:text-xs" />
            </div>
            <div className="min-w-0">
              <Label htmlFor="paymentDays" className="text-xs">Termin płatności (dni)</Label>
              <Input
                id="paymentDays"
                type="number"
                inputMode="numeric"
                min={0}
                value={paymentDays}
                onChange={(e) => setPaymentDays(Number(e.target.value))}
                className="text-base md:text-xs"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="subject" className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-primary" />
              Przedmiot umowy
            </Label>
            <Textarea
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              rows={4}
              placeholder="np. przygotowaniu pakietu grafik..."
            />

            <Button
              variant="outline"
              size="sm"
              className="mt-2 w-full"
              onClick={() => setSubject(getRandomDescription(amountNet || undefined))}
            >
              <Sparkles className="mr-2 h-3.5 w-3.5" />
              Zaproponuj unikalne dzieło
            </Button>
          </div>
        </div>

        {docMode === "rachunek" && (
          <MobileCollapsibleCard title="Rachunek">
            <div>
              <Label htmlFor="rachunekDate" className="text-xs">Data rachunku</Label>
              <Input
                id="rachunekDate"
                type="date"
                value={rachunekDate || endDate}
                onChange={(e) => setRachunekDate(e.target.value)}
                className="text-base md:text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Koszty uzyskania przychodu</Label>
              <Select value={String(kupRate)} onValueChange={(v) => setKupRate(Number(v) as 0.5 | 0.2)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.5">50% (przeniesienie praw autorskich)</SelectItem>
                  <SelectItem value="0.2">20%</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="bankAccount" className="text-xs">Nr konta bankowego</Label>
              <Input
                id="bankAccount"
                value={bankAccount}
                autoCapitalize="off"
                autoCorrect="off"
                onChange={(e) => setBankAccount(e.target.value)}
                className="text-base md:text-xs"
              />
            </div>
            <div>
              <Label htmlFor="paymentTerm" className="text-xs">Termin płatności</Label>
              <Input
                id="paymentTerm"
                value={paymentTerm}
                onChange={(e) => setPaymentTerm(e.target.value)}
                className="text-base md:text-xs"
              />
            </div>
          </MobileCollapsibleCard>
        )}

        <MobileCollapsibleCard title="Podsumowanie" hideTitleOnDesktop>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Nr umowy:</span>
              <span className="font-medium text-foreground">{contractNumber}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Data zawarcia:</span>
              <span className="font-medium text-foreground">{startDateFormatted}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Termin wykonania:</span>
              <span className="font-medium text-foreground">{endDateFormatted}</span>
            </div>
          </div>
        </MobileCollapsibleCard>

        {/* Desktop actions — on mobile these live in the sticky bottom bar */}
        <div className="hidden lg:flex flex-col sm:flex-row gap-3">
          <Button onClick={handleDownloadPdf} className="w-full sm:flex-1 brand-gradient text-white border-0 hover:opacity-90" size="lg">
            <FileDown className="mr-2 h-5 w-5" />
            Pobierz PDF
          </Button>
          {isEditing ? (
            <Button onClick={handleSaveChanges} variant="outline" size="lg" className="w-full sm:w-auto" disabled={saving}>
              <Save className="mr-2 h-5 w-5" />
              Zapisz zmiany
            </Button>
          ) : (
            <Button onClick={handleConfirmContract} variant="outline" size="lg" className="w-full sm:w-auto" disabled={saving || !orgId}>
              <CheckCircle className="mr-2 h-5 w-5" />
              Zatwierdź
            </Button>
          )}
        </div>
      </div>

      {/* A4 Preview */}
      <div className="flex-1 min-w-0 overflow-x-hidden bg-muted/50 rounded-xl p-3 lg:p-6 flex justify-start lg:justify-center">
        <div className="w-full lg:w-auto min-w-0 lg:shrink-0 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-lg border bg-card p-1">
              {(["umowa", "rachunek"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setDocMode(m)}
                  className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
                    docMode === m ? "brand-gradient text-white" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {m === "umowa" ? "Umowa" : "Rachunek"}
                </button>
              ))}
            </div>
            {!isTextEditing ? (
              <Button variant="outline" size="sm" onClick={startTextEditing}>
                <Pencil className="mr-2 h-4 w-4" />
                Edytuj tekst
              </Button>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={finishTextEditing}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Zakończ edycję
                </Button>
                <Button variant="ghost" size="sm" onClick={resetTextEditing}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Przywróć oryginał
                </Button>
              </div>
            )}
          </div>

          {isTextEditing && (
            <div className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs text-foreground">
              Tryb edycji ręcznej — zmiany w formularzu nie aktualizują tekstu dokumentu.
            </div>
          )}
          {!isTextEditing && currentEditedHtml && (
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

          <DocumentPreviewFrame ref={frameRef} editing={isTextEditing}>
          <div className="shadow-2xl w-fit">
          <EditableDocument
            editing={isTextEditing}
            html={currentEditedHtml}
            onHtmlChange={setCurrentEditedHtml}
            exportRef={previewRef}
          >
          {docMode === "rachunek" ? (
            <RachunekPreview
              ref={previewRef}
              contractNumber={contractNumber}
              rachunekDate={formatDatePolish(rachunekDate || endDate)}
              company={previewCompany}
              contractor={previewContractor}
              amountNet={amountNet}
              kupRate={kupRate}
              bankAccount={bankAccount || previewContractor?.bank_account || ""}
              paymentTerm={paymentTerm}
            />
          ) : (
          <ContractPreview
            ref={previewRef}
            contractNumber={contractNumber}
            signDate={startDateFormatted}
            city={city}
            startDate={startDateFormatted}
            endDate={endDateFormatted}
            company={previewCompany}
            contractor={previewContractor}
            subject={subject || "—"}
            amountNet={amountNet}
            paymentDays={paymentDays}
          />
          )}
          </EditableDocument>
          </div>
          </DocumentPreviewFrame>

          {/* Sticky mobile action bar */}
          <div className="mobile-action-bar lg:hidden border-t bg-card px-3 pt-3">
            <div className="flex gap-2">
              <Button
                onClick={handleDownloadPdf}
                className="flex-1 brand-gradient text-white border-0 hover:opacity-90"
              >
                <FileDown className="mr-2 h-4 w-4" />
                {docMode === "rachunek" ? "Rachunek PDF" : "Pobierz PDF"}
              </Button>
              {isEditing ? (
                <Button onClick={handleSaveChanges} variant="outline" disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  Zapisz
                </Button>
              ) : (
                <Button onClick={handleConfirmContract} variant="outline" disabled={saving || !orgId}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Zatwierdź
                </Button>
              )}
            </div>
          </div>
          {/* Spacer so the sticky bar never covers the document */}
          <div className="h-20 lg:hidden" aria-hidden />
        </div>
      </div>
    </div>
  );
}

