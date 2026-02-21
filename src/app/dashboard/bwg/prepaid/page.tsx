"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { DashboardSkeleton } from "@/components/shared/loading-skeleton";
import { StatCard } from "@/components/shared/stat-card";
import { PREPAID_STATUS_LABELS, PREPAID_STATUS_COLORS } from "@/lib/constants";
import { CreditCard, Clock } from "lucide-react";
import { toast } from "sonner";

interface PrepaidPackage {
  id: string;
  organization_id: string;
  requested_by: string;
  pickup_count: number;
  used_count: number;
  status: string;
  notes: string | null;
  expires_at: string | null;
  created_at: string;
}

export default function BwgPrepaidPage() {
  const { user, loading: userLoading } = useUser();
  const supabase = createClient();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [packages, setPackages] = useState<PrepaidPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pickupCount, setPickupCount] = useState<number>(1);
  const [notes, setNotes] = useState("");

  async function fetchPackages(organizationId: string) {
    const { data } = await supabase
      .from("prepaid_packages")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });

    if (data) setPackages(data as PrepaidPackage[]);
  }

  useEffect(() => {
    if (!user) return;
    async function fetchData() {
      const { data: membership } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (!membership) {
        setLoading(false);
        return;
      }

      setOrgId(membership.organization_id);
      await fetchPackages(membership.organization_id);
      setLoading(false);
    }
    fetchData();
  }, [user, supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId || !user) return;

    setSubmitting(true);
    const { error } = await supabase.from("prepaid_packages").insert({
      organization_id: orgId,
      requested_by: user.id,
      pickup_count: pickupCount,
      notes: notes || null,
    });

    if (error) {
      toast.error("Failed to submit request. Please try again.");
      setSubmitting(false);
      return;
    }

    toast.success("Prepaid request submitted! Awaiting admin approval.");
    setPickupCount(1);
    setNotes("");
    await fetchPackages(orgId);
    setSubmitting(false);
  }

  const availableCredits = packages
    .filter(
      (pkg) =>
        pkg.status === "approved" &&
        pkg.expires_at &&
        new Date(pkg.expires_at) > new Date()
    )
    .reduce((sum, pkg) => sum + (pkg.pickup_count - pkg.used_count), 0);

  const pendingRequests = packages.filter(
    (pkg) => pkg.status === "pending"
  ).length;

  const hasActivePackage = packages.some(
    (pkg) =>
      pkg.status === "approved" &&
      pkg.expires_at &&
      new Date(pkg.expires_at) > new Date() &&
      pkg.pickup_count > pkg.used_count
  );

  const hasPendingRequest = pendingRequests > 0;

  const canRequestNew = !hasActivePackage && !hasPendingRequest;

  if (userLoading || loading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Prepaid Packages"
        description="Purchase and manage prepaid pickup credits"
      />

      <div className="grid gap-4 md:grid-cols-2">
        <StatCard
          title="Available Credits"
          value={availableCredits}
          icon={CreditCard}
        />
        <StatCard
          title="Pending Requests"
          value={pendingRequests}
          icon={Clock}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Request Prepaid Package</CardTitle>
        </CardHeader>
        <CardContent>
          {!canRequestNew ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              {hasActivePackage
                ? "You have an active prepaid package with remaining credits. You can request a new package once your credits are used up or the validity period ends."
                : "You have a pending prepaid request awaiting admin approval. Please wait for it to be processed before submitting another."}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pickupCount">Number of Pickups</Label>
                <Input
                  id="pickupCount"
                  type="number"
                  min={1}
                  value={pickupCount}
                  onChange={(e) => setPickupCount(Number(e.target.value))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Reference number, payment details..."
                />
              </div>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Request"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Packages</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {packages.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={CreditCard}
                title="No prepaid packages"
                description="Submit a request above to purchase prepaid pickup credits."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Pickups</TableHead>
                  <TableHead>Used</TableHead>
                  <TableHead>Remaining</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packages.map((pkg) => (
                  <TableRow key={pkg.id}>
                    <TableCell>
                      {new Date(pkg.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{pkg.pickup_count}</TableCell>
                    <TableCell>{pkg.used_count}</TableCell>
                    <TableCell>
                      {pkg.status === "approved"
                        ? pkg.pickup_count - pkg.used_count
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={PREPAID_STATUS_COLORS[pkg.status]}
                      >
                        {PREPAID_STATUS_LABELS[pkg.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {pkg.expires_at
                        ? new Date(pkg.expires_at).toLocaleDateString()
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
