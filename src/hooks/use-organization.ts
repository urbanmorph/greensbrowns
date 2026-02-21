"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "./use-user";

export function useOrganization() {
  const { user, loading: userLoading } = useUser();
  const supabase = createClient();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      if (!userLoading) setLoading(false);
      return;
    }
    async function fetchOrg() {
      const { data } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user!.id)
        .maybeSingle();

      setOrgId(data?.organization_id ?? null);
      setLoading(false);
    }
    fetchOrg();
  }, [user, userLoading, supabase]);

  return { user, orgId, loading: userLoading || loading, supabase };
}
