import { useState, useRef, useMemo } from "react";
import { FileDown, Sparkles, Calendar, DollarSign, FileText, CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ContractPreview } from "@/components/ContractPreview";
import { loadClient, loadContractor, loadSettings, getCurrentCounter, incrementCounter } from "@/lib/contractDefaults";
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

export function GeneratorTab() {
  const now = new Date();
  const [amountNet, setAmountNet] = useState(8000);
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [subject, setSubject] = useState("");
  const [counter, setCounter] = useState(() => getCurrentCounter(now.getMonth() + 1, now.getFullYear()));
  const previewRef = useRef<HTMLDivElement>(null);

  const client = loadClient();
  const contractor = loadContractor();
  const settings = loadSettings();

  const contractNumber = `${settings.prefix}${pad(counter)}/${pad(selectedMonth)}/${selectedYear.toString().slice(-2)}`;
  const startDate = `02.${pad(selectedMonth)}.${selectedYear}`;
  const lastDay = getLastDay(selectedMonth, selectedYear);
  const endDate = `${pad(lastDay)}.${pad(selectedMonth)}.${selectedYear}`;
  const amountWords = useMemo(() => numberToPolishWords(amountNet), [amountNet]);

  const currentYear = now.getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];

  // Update counter when month/year changes
  const handleMonthChange = (v: string) => {
    const m = Number(v);
    setSelectedMonth(m);
    setCounter(getCurrentCounter(m, selectedYear));
  };

  const handleYearChange = (v: string) => {
    const y = Number(v);
    setSelectedYear(y);
    setCounter(getCurrentCounter(selectedMonth, y));
  };

  const handleConfirmContract = () => {
    const nextCounter = incrementCounter(selectedMonth, selectedYear);
    setCounter(nextCounter);
    toast({
      title: "Umowa zatwierdzona",
      description: `Następna umowa w ${pad(selectedMonth)}/${selectedYear} będzie miała numer ${settings.prefix}${pad(nextCounter)}/${pad(selectedMonth)}/${selectedYear.toString().slice(-2)}`,
    });
  };

  const handleDownloadPdf = async () => {
    if (!previewRef.current) return;
    const html2pdf = (await import("html2pdf.js")).default;
    const opt = {
      margin: 0,
      filename: `UOD-${pad(selectedMonth)}-${selectedYear}.pdf`,
      image: { type: "jpeg" as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm" as const, format: "a4" as const, orientation: "portrait" as const },
    };
    html2pdf().set(opt).from(previewRef.current).save();
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
            <span className="font-medium text-foreground">{startDate}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Termin wykonania:</span>
            <span className="font-medium text-foreground">{endDate}</span>
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
            startDate={startDate}
            endDate={endDate}
            client={client}
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
