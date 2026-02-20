"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { DashboardSkeleton } from "@/components/shared/loading-skeleton";
import { Building2 } from "lucide-react";

const ORG_TYPE_LABELS: Record<string, string> = {
  apartment: "Apartment",
  rwa: "RWA",
  techpark: "Tech Park",
};

interface OrgWithCounts {
  id: string;
  name: string;
  org_type: string;
  address: string;
  city: string;
  pincode: string | null;
  created_at: string;
  member_count: number;
  pickup_count: number;
}

export default function AdminOrganizationsPage() {
  const supabase = createClient();
  const [orgs, setOrgs] = useState<OrgWithCounts[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrgs() {
      const { data } = await supabase
        .from("organizations")
        .select("id, name, org_type, address, city, pincode, created_at")
        .order("created_at", { ascending: false });

      if (!data) {
        setLoading(false);
        return;
      }

      const orgsWithCounts = await Promise.all(
        data.map(async (org) => {
          const { count: memberCount } = await supabase
            .from("organization_members")
            .select("*", { count: "exact", head: true })
            .eq("organization_id", org.id);

          const { count: pickupCount } = await supabase
            .from("pickups")
            .select("*", { count: "exact", head: true })
            .eq("organization_id", org.id);

          return {
            ...org,
            member_count: memberCount || 0,
            pickup_count: pickupCount || 0,
          };
        })
      );

      setOrgs(orgsWithCounts);
      setLoading(false);
    }
    fetchOrgs();
  }, [supabase]);

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organizations"
        description="All registered organizations on the platform"
      />

      {orgs.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={Building2}
              title="No organizations"
              description="No organizations have been created yet."
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Pickups</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orgs.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell className="font-medium">{org.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {ORG_TYPE_LABELS[org.org_type] || org.org_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {org.address}
                      {org.pincode ? ` - ${org.pincode}` : ""}
                    </TableCell>
                    <TableCell>{org.member_count}</TableCell>
                    <TableCell>{org.pickup_count}</TableCell>
                    <TableCell>
                      {new Date(org.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
