import { useState, useRef, useMemo, useEffect } from "react";
import { FileDown, Sparkles, Calendar, DollarSign, FileText, CheckCircle, Building2, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ContractPreview } from "@/components/ContractPreview";
import { getCurrentCounter, incrementCounter, formatContractNumber, ResetPeriod } from "@/lib/contractDefaults";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/hooks/useOrg";
import { Company, Contractor } from "@/lib/parties";
import { numberToPolishWords } from "@/lib/numberToWords";
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

export function GeneratorTab() {
  const now = new Date();
  const { orgId } = useOrg();
  const [amountNet, setAmountNet] = useState(8000);
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [subject, setSubject] = useState("");
  const [counter, setCounter] = useState(() => getCurrentCounter(now.getMonth() + 1, now.getFullYear()));
  const [startDate, setStartDate] = useState(() => formatDateForInput(now));
  const [endDate, setEndDate] = useState(() => {
    const last = getLastDay(now.getMonth() + 1, now.getFullYear());
    return formatDateForInput(new Date(now.getFullYear(), now.getMonth(), last));
  });
  const previewRef = useRef<HTMLDivElement>(null);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [companyId, setCompanyId] = useState<string>("");
  const [contractorId, setContractorId] = useState<string>("");
  const [prefix, setPrefix] = useState("W-");
  const [numberFormat, setNumberFormat] = useState("{prefix}{NN}/{MM}/{YY}");
  const [resetPeriod, setResetPeriod] = useState<ResetPeriod>("monthly");

  useEffect(() => {
    if (!orgId) return;
    let active = true;
    (async () => {
      const [c1, c2, n] = await Promise.all([
        supabase.from("companies").select("*").eq("org_id", orgId).order("created_at"),
        supabase.from("contractors").select("*").eq("org_id", orgId).order("created_at"),
        supabase.from("numbering_rules").select("prefix, format, reset_period").eq("org_id", orgId).maybeSingle(),
      ]);
      if (!active) return;
      const comps = (c1.data as Company[]) ?? [];
      const cons = (c2.data as Contractor[]) ?? [];
      setCompanies(comps);
      setContractors(cons);
      setCompanyId((prev) => prev || comps[0]?.id || "");
      setContractorId((prev) => prev || cons[0]?.id || "");
      if (n.data?.prefix) setPrefix(n.data.prefix);
      if (n.data?.format) setNumberFormat(n.data.format);
      if (n.data?.reset_period) {
        const rp = n.data.reset_period as ResetPeriod;
        setResetPeriod(rp);
        setCounter(getCurrentCounter(selectedMonth, selectedYear, rp));
      }
    })();
    return () => {
      active = false;
    };
  }, [orgId]);

  const company = companies.find((c) => c.id === companyId) ?? null;
  const contractor = contractors.find((c) => c.id === contractorId) ?? null;

  const contractNumber = formatContractNumber(numberFormat, {
    prefix,
    counter,
    month: selectedMonth,
    year: selectedYear,
  });
  const startDateFormatted = formatDatePolish(startDate);
  const endDateFormatted = formatDatePolish(endDate);
  const amountWords = useMemo(() => numberToPolishWords(amountNet), [amountNet]);

  const currentYear = now.getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];

  const handleMonthChange = (v: string) => {
    const m = Number(v);
    setSelectedMonth(m);
    setCounter(getCurrentCounter(m, selectedYear, resetPeriod));
    const last = getLastDay(m, selectedYear);
    setEndDate(formatDateForInput(new Date(selectedYear, m - 1, last)));
  };

  const handleYearChange = (v: string) => {
    const y = Number(v);
    setSelectedYear(y);
    setCounter(getCurrentCounter(selectedMonth, y, resetPeriod));
    const last = getLastDay(selectedMonth, y);
    setEndDate(formatDateForInput(new Date(y, selectedMonth - 1, last)));
  };

  const bumpCounter = () => {
    const nextCounter = incrementCounter(selectedMonth, selectedYear, resetPeriod);
    setCounter(nextCounter);
    return formatContractNumber(numberFormat, {
      prefix,
      counter: nextCounter,
      month: selectedMonth,
      year: selectedYear,
    });
  };

  const handleConfirmContract = () => {
    const nextNumber = bumpCounter();
    toast({
      title: "Umowa zatwierdzona",
      description: `Następna umowa będzie miała numer ${nextNumber}`,
    });
  };

  const handleDownloadPdf = async () => {
    if (!previewRef.current) return;
    const html2pdf = (await import("html2pdf.js")).default;
    const opt = {
      margin: 0,
      filename: `UOD-${contractNumber.replace(/[\\/\\\\]/g, "-")}.pdf`,
      image: { type: "jpeg" as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm" as const, format: "a4" as const, orientation: "portrait" as const },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
    };
    await html2pdf().set(opt).from(previewRef.current).save();
    const nextNumber = bumpCounter();
    toast({
      title: "PDF pobrany",
      description: `Licznik zaktualizowany — następny numer: ${nextNumber}`,
    });
  };

  return (
    <div className="flex gap-6 h-full">
      {/* Control Panel */}
      <div className="w-80 shrink-0 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Generator Umowy</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Wypełnij dane i pobierz gotowy PDF.
          </p>
        </div>

        <div className="bg-card rounded-xl border p-5 space-y-4">
          <div>
            <Label className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-primary" />
              Zamawiający
            </Label>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger>
                <SelectValue placeholder="Wybierz firmę" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-primary" />
              Wykonawca
            </Label>
            <Select value={contractorId} onValueChange={setContractorId}>
              <SelectTrigger>
                <SelectValue placeholder="Wybierz wykonawcę" />
              </SelectTrigger>
              <SelectContent>
                {contractors.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(companies.length === 0 || contractors.length === 0) && (
            <p className="text-xs text-muted-foreground">
              Uzupełnij listy w zakładce „Dane Stron”.
            </p>
          )}
        </div>

        <div className="bg-card rounded-xl border p-5 space-y-4">
          <div>
            <Label htmlFor="amount" className="flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-primary" />
              Kwota netto (PLN)
            </Label>
            <Input
              id="amount"
              type="number"
              value={amountNet}
              onChange={(e) => setAmountNet(Number(e.target.value))}
              min={0}
            />
            {amountNet > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Słownie: {amountWords} złotych
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
              <Label>Rok</Label>
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
                className="text-xs"
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
                className="text-xs"
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
              placeholder="Opisz przedmiot umowy..."
            />
            <Button
              variant="outline"
              size="sm"
              className="mt-2 w-full"
              onClick={() => setSubject(getRandomDescription())}
            >
              <Sparkles className="mr-2 h-3.5 w-3.5" />
              Zaproponuj unikalne dzieło
            </Button>
          </div>
        </div>

        <div className="bg-card rounded-xl border p-5 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Nr umowy:</span>
            <span className="font-medium text-foreground">{contractNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Data zawarcia:</span>
            <span className="font-medium text-foreground">{startDateFormatted}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Termin wykonania:</span>
            <span className="font-medium text-foreground">{endDateFormatted}</span>
          </div>
        </div>

        <div className="flex gap-3">
          <Button onClick={handleDownloadPdf} className="flex-1" size="lg">
            <FileDown className="mr-2 h-5 w-5" />
            Pobierz PDF
          </Button>
          <Button onClick={handleConfirmContract} variant="outline" size="lg">
            <CheckCircle className="mr-2 h-5 w-5" />
            Zatwierdź
          </Button>
        </div>
      </div>

      {/* A4 Preview */}
      <div className="flex-1 overflow-auto bg-muted/50 rounded-xl p-6 flex justify-center">
        <div className="shadow-2xl">
          <ContractPreview
            ref={previewRef}
            contractNumber={contractNumber}
            startDate={startDateFormatted}
            endDate={endDateFormatted}
            company={company}
            contractor={contractor}
            subject={subject || "—"}
            amountNet={amountNet}
            amountWords={amountWords}
          />
        </div>
      </div>
    </div>
  );
}
