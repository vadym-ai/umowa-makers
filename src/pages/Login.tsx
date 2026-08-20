import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { LogIn } from "lucide-react";
import DocGenLogo from "@/components/DocGenLogo";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast({
        title: "Nie udało się zalogować",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    const from = (location.state as { from?: string } | null)?.from ?? "/";
    navigate(from, { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-muted/40">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <DocGenLogo size="lg" />
        </div>
        <div className="bg-card border rounded-xl p-8 space-y-6 brand-shadow">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Zaloguj się</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Podaj adres e-mail i hasło, aby przejść do generatora.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
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
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full brand-gradient text-white border-0 hover:opacity-90" disabled={loading}>
            <LogIn className="mr-2 h-4 w-4" />
            {loading ? "Logowanie..." : "Zaloguj się"}
          </Button>
        </form>
        <p className="text-sm text-muted-foreground text-center">
          Nie masz konta?{" "}
          <Link to="/signup" className="text-primary font-medium hover:underline">
            Zarejestruj się
          </Link>
        </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
