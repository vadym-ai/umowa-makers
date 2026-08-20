import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Briefcase, Building2, Hash, CalendarCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrg } from "@/hooks/useOrg";

const contractTypes = [
  {
    id: "umowa-o-dzielo",
    title: "Umowa o dzieło",
    description: "Umowa z przeniesieniem praw autorskich",
    icon: FileText,
    active: true,
  },
  {
    id: "umowa-zlecenie",
    title: "Umowa zlecenie",
    description: "Rozliczenie za staranne wykonanie usługi",
    icon: Briefcase,
    active: false,
  },
  {
    id: "umowa-b2b",
    title: "Umowa B2B",
    description: "Współpraca pomiędzy firmami",
    icon: Building2,
    active: false,
  },
];

const Start = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { orgId } = useOrg();
  const [fullName, setFullName] = useState<string>("");
  const [orgName, setOrgName] = useState<string>("");
  const [monthCount, setMonthCount] = useState<number | null>(null);
  const [lastNumber, setLastNumber] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setFullName(data?.full_name ?? ""));
  }, [user]);

  useEffect(() => {
    if (!orgId) return;
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    supabase
      .from("organizations")
      .select("name")
      .eq("id", orgId)
      .maybeSingle()
      .then(({ data }) => setOrgName(data?.name ?? ""));

    supabase
      .from("contracts")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .gte("created_at", start)
      .then(({ count }) => setMonthCount(count ?? 0));

    supabase
      .from("contracts")
      .select("number")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setLastNumber(data?.number ?? null));
  }, [orgId]);

  const greetingName = fullName || user?.email?.split("@")[0] || "";

  return (
    <div className="max-w-5xl mx-auto">
      <section className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
          Cześć{greetingName ? `, ${greetingName}` : ""}
        </h1>
        {orgName && <p className="text-muted-foreground mt-1">{orgName}</p>}

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border bg-card p-4 flex items-center gap-3 brand-shadow">
            <CalendarCheck className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Umowy w tym miesiącu</p>
              <p className="text-lg font-semibold">{monthCount ?? "—"}</p>
            </div>
          </div>
          <div className="rounded-xl border bg-card p-4 flex items-center gap-3 brand-shadow">
            <Hash className="h-5 w-5 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Ostatni numer umowy</p>
              <p className="text-lg font-semibold truncate">{lastNumber ?? "—"}</p>
            </div>
          </div>
        </div>
      </section>

      <h2 className="text-lg font-semibold mb-4">Wybierz typ umowy</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {contractTypes.map((type) => {
          const Icon = type.icon;
          if (!type.active) {
            return (
              <div
                key={type.id}
                aria-disabled="true"
                className="relative rounded-xl border bg-card p-6 brand-shadow opacity-60 cursor-not-allowed"
              >
                <span className="absolute top-3 right-3 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  Wkrótce
                </span>
                <div className="h-14 w-14 rounded-xl bg-accent flex items-center justify-center mb-4">
                  <Icon className="h-7 w-7 text-accent-foreground" />
                </div>
                <h3 className="font-semibold text-foreground">{type.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{type.description}</p>
              </div>
            );
          }
          return (
            <button
              key={type.id}
              onClick={() => navigate(`/generator/${type.id}`)}
              className="text-left rounded-xl border bg-card p-6 brand-shadow transition-all duration-200 hover:border-primary hover:brand-shadow-lg hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <div className="h-14 w-14 rounded-xl bg-accent flex items-center justify-center mb-4">
                <Icon className="h-7 w-7 text-accent-foreground" />
              </div>
              <h3 className="font-semibold text-foreground">{type.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{type.description}</p>
            </button>
          );
        })}
      </div>

    </div>
  );
};

export default Start;
