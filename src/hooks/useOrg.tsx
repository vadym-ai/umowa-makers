import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { migrateLocalStorageData } from "@/lib/localMigration";
import { toast } from "@/hooks/use-toast";

export function useOrg() {
  const { user } = useAuth();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!user) {
      setOrgId(null);
      setRole(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from("organization_members")
      .select("org_id, role")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle()
      .then(async ({ data, error }) => {
        if (!active) return;
        if (error) {
          toast({
            title: "Błąd wczytywania organizacji",
            description: error.message,
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
        setOrgId(data?.org_id ?? null);
        setRole(data?.role ?? null);
        if (data?.org_id) {
          await migrateLocalStorageData(data.org_id);
        }
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user]);

  return { orgId, role, isAdmin: role === "admin", loading };
}

