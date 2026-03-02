import { useEffect, useState } from "react";
import { Building2, User, Save, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  ClientData,
  ContractorData,
  loadClient,
  loadContractor,
  saveClient,
  saveContractor,
} from "@/lib/contractDefaults";

export function SettingsTab() {
  const [client, setClient] = useState<ClientData>(loadClient);
  const [contractor, setContractor] = useState<ContractorData>(loadContractor);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    saveClient(client);
    saveContractor(contractor);
  }, [client, contractor]);

  const handleSave = () => {
    saveClient(client);
    saveContractor(contractor);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dane Stron</h1>
        <p className="text-muted-foreground mt-1">
          Uzupełnij dane zamawiającego i wykonawcy. Są zapisywane automatycznie.
        </p>
      </div>

      {/* Client */}
      <div className="bg-card rounded-xl border p-6 space-y-4">
        <div className="flex items-center gap-2 text-foreground font-semibold text-lg">
          <Building2 className="h-5 w-5 text-primary" />
          Zamawiający
        </div>
        <div className="space-y-3">
          <div>
            <Label htmlFor="companyName">Nazwa firmy</Label>
            <Input
              id="companyName"
              value={client.companyName}
              onChange={(e) => setClient({ ...client, companyName: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="companyAddress">Adres firmy</Label>
            <Input
              id="companyAddress"
              value={client.companyAddress}
              onChange={(e) => setClient({ ...client, companyAddress: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="representative">Reprezentowany przez</Label>
            <Input
              id="representative"
              value={client.representative}
              onChange={(e) => setClient({ ...client, representative: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Contractor */}
      <div className="bg-card rounded-xl border p-6 space-y-4">
        <div className="flex items-center gap-2 text-foreground font-semibold text-lg">
          <User className="h-5 w-5 text-primary" />
          Wykonawca
        </div>
        <div className="space-y-3">
          <div>
            <Label htmlFor="fullName">Imię i Nazwisko</Label>
            <Input
              id="fullName"
              value={contractor.fullName}
              onChange={(e) => setContractor({ ...contractor, fullName: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="address">Adres zamieszkania</Label>
            <Input
              id="address"
              value={contractor.address}
              onChange={(e) => setContractor({ ...contractor, address: e.target.value })}
            />
          </div>
        </div>
      </div>

      <Button onClick={handleSave} className="w-full">
        {saved ? (
          <>
            <Check className="mr-2 h-4 w-4" /> Zapisano
          </>
        ) : (
          <>
            <Save className="mr-2 h-4 w-4" /> Zapisz dane
          </>
        )}
      </Button>
    </div>
  );
}
