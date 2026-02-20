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
import { ROLES } from "@/lib/constants";
import { Users } from "lucide-react";
import type { Profile, UserRole } from "@/types";

const KYC_COLORS: Record<string, string> = {
  pending: "bg-gray-100 text-gray-800",
  submitted: "bg-blue-100 text-blue-800",
  verified: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

export default function AdminUsersPage() {
  const supabase = createClient();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUsers() {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (data) setProfiles(data as Profile[]);
      setLoading(false);
    }
    fetchUsers();
  }, [supabase]);

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader title="User Management" description="View all platform users" />

      {profiles.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={Users}
              title="No users"
              description="No users have registered yet."
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
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>KYC Status</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell className="font-medium">
                      {profile.full_name || "—"}
                    </TableCell>
                    <TableCell>{profile.email || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {ROLES[profile.role as UserRole]?.label || profile.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={KYC_COLORS[profile.kyc_status]}
                      >
                        {profile.kyc_status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(profile.created_at).toLocaleDateString()}
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
