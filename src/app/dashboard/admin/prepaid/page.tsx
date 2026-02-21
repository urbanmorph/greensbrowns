"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { PREPAID_STATUS_LABELS, PREPAID_STATUS_COLORS } from "@/lib/constants";
import { CreditCard, Check, X } from "lucide-react";
import { toast } from "sonner";

interface PrepaidWithDetails {
  id: string;
  organization_id: string;
  pickup_count: number;
  used_count: number;
  status: string;
  requested_by: string;
  approved_by: string | null;
  approved_at: string | null;
  expires_at: string | null;
  notes: string | null;
  created_at: string;
  organizations: { name: string } | null;
  profiles: { full_name: string | null; email: string | null } | null;
}

export default function AdminPrepaidPage() {
  const supabase = createClient();
  const [packages, setPackages] = useState<PrepaidWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPackages() {
      const { data } = await supabase
        .from("prepaid_packages")
        .select(
          "*, organizations(name), profiles!prepaid_packages_requested_by_fkey(full_name, email)"
        )
        .order("created_at", { ascending: false });

      if (data) setPackages(data as unknown as PrepaidWithDetails[]);
      setLoading(false);
    }
    fetchPackages();
  }, [supabase]);

  async function handleApprove(pkg: PrepaidWithDetails) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Unable to verify admin user");
      return;
    }

    const now = new Date().toISOString();
    const expiresAt = new Date(
      Date.now() + 365 * 24 * 60 * 60 * 1000
    ).toISOString();

    const { error } = await supabase
      .from("prepaid_packages")
      .update({
        status: "approved",
        approved_by: user.id,
        approved_at: now,
        expires_at: expiresAt,
      })
      .eq("id", pkg.id);

    if (error) {
      toast.error("Failed to approve package");
      return;
    }

    setPackages((prev) =>
      prev.map((p) =>
        p.id === pkg.id
          ? {
              ...p,
              status: "approved",
              approved_by: user.id,
              approved_at: now,
              expires_at: expiresAt,
            }
          : p
      )
    );
    toast.success("Package approved");
  }

  async function handleReject(pkg: PrepaidWithDetails) {
    const { error } = await supabase
      .from("prepaid_packages")
      .update({ status: "rejected" })
      .eq("id", pkg.id);

    if (error) {
      toast.error("Failed to reject package");
      return;
    }

    setPackages((prev) =>
      prev.map((p) => (p.id === pkg.id ? { ...p, status: "rejected" } : p))
    );
    toast.success("Package rejected");
  }

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Prepaid Packages"
        description="Manage prepaid pickup package requests"
      />

      {packages.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={CreditCard}
              title="No prepaid packages"
              description="No prepaid package requests have been submitted yet."
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Requested By</TableHead>
                  <TableHead>Pickups</TableHead>
                  <TableHead>Used</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packages.map((pkg) => (
                  <TableRow key={pkg.id}>
                    <TableCell className="font-medium">
                      {pkg.organizations?.name || "—"}
                    </TableCell>
                    <TableCell>
                      {pkg.profiles?.full_name || pkg.profiles?.email || "—"}
                    </TableCell>
                    <TableCell>{pkg.pickup_count}</TableCell>
                    <TableCell>{pkg.used_count}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={PREPAID_STATUS_COLORS[pkg.status]}
                      >
                        {PREPAID_STATUS_LABELS[pkg.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(pkg.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {pkg.status === "pending" ? (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 border-green-600 hover:bg-green-50"
                            onClick={() => handleApprove(pkg)}
                          >
                            <Check className="mr-1 h-3 w-3" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReject(pkg)}
                          >
                            <X className="mr-1 h-3 w-3" /> Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
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
