import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FileText, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

const Signup = () => {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName, org_name: orgName },
      },
    });
    setLoading(false);
    if (error) {
      toast({
        title: "Nie udało się utworzyć konta",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    if (data.session) {
      navigate("/", { replace: true });
      return;
    }
    setSent(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-muted/40">
      <div className="w-full max-w-md bg-card border rounded-xl p-8 space-y-6">
        <div className="flex items-center gap-2 font-bold text-foreground">
          <FileText className="h-5 w-5 text-primary" />
          <span>UOD Generator</span>
        </div>

        {sent ? (
          <div className="space-y-4">
            <h1 className="text-2xl font-bold text-foreground">Sprawdź skrzynkę</h1>
            <p className="text-muted-foreground text-sm">
              Wysłaliśmy link potwierdzający na adres <strong>{email}</strong>. Kliknij go, aby
              aktywować konto, a następnie zaloguj się.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link to="/login">Przejdź do logowania</Link>
            </Button>
          </div>
        ) : (
          <>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Załóż konto</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Utwórz konto i organizację dla swojego zespołu.
              </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="fullName">Imię i nazwisko</Label>
                <Input
                  id="fullName"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="orgName">Nazwa firmy / zespołu</Label>
                <Input
                  id="orgName"
                  required
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Przykładowa Firma Sp. z o.o."
                />
              </div>
              <div>
                <Label htmlFor="email">Adres e-mail</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="password">Hasło</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                <UserPlus className="mr-2 h-4 w-4" />
                {loading ? "Tworzenie konta..." : "Zarejestruj się"}
              </Button>
            </form>
            <p className="text-sm text-muted-foreground text-center">
              Masz już konto?{" "}
              <Link to="/login" className="text-primary font-medium hover:underline">
                Zaloguj się
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default Signup;
