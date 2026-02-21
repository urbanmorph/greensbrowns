"use client";

import { Fragment, useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { DashboardSkeleton } from "@/components/shared/loading-skeleton";
import { Building2, Package, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { formatPaise } from "@/lib/utils";

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

interface PlanOption {
  id: string;
  name: string;
  pickup_count: number;
  validity_days: number;
}

interface AssignedPackageRow {
  id: string;
  plan_id: string;
  price_paise: number;
  is_active: boolean;
  created_at: string;
  prepaid_package_plans: { name: string; pickup_count: number } | null;
}

export default function AdminOrganizationsPage() {
  const supabase = createClient();
  const [orgs, setOrgs] = useState<OrgWithCounts[]>([]);
  const [loading, setLoading] = useState(true);

  // Assign dialog state
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<OrgWithCounts | null>(null);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [priceInr, setPriceInr] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Expanded rows for viewing assigned packages
  const [expandedOrgId, setExpandedOrgId] = useState<string | null>(null);
  const [assignedPackages, setAssignedPackages] = useState<
    Record<string, AssignedPackageRow[]>
  >({});
  const [loadingPackages, setLoadingPackages] = useState<string | null>(null);

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

      const orgIds = data.map((o) => o.id);

      // Batch count: members per org
      const { data: memberCounts } = await supabase
        .from("organization_members")
        .select("organization_id")
        .in("organization_id", orgIds);

      const memberMap = new Map<string, number>();
      for (const m of memberCounts || []) {
        memberMap.set(m.organization_id, (memberMap.get(m.organization_id) || 0) + 1);
      }

      // Batch count: pickups per org
      const { data: pickupRows } = await supabase
        .from("pickups")
        .select("organization_id")
        .in("organization_id", orgIds);

      const pickupMap = new Map<string, number>();
      for (const p of pickupRows || []) {
        pickupMap.set(p.organization_id, (pickupMap.get(p.organization_id) || 0) + 1);
      }

      const orgsWithCounts = data.map((org) => ({
        ...org,
        member_count: memberMap.get(org.id) || 0,
        pickup_count: pickupMap.get(org.id) || 0,
      }));

      setOrgs(orgsWithCounts);
      setLoading(false);
    }
    fetchOrgs();
  }, [supabase]);

  const fetchPlans = useCallback(async () => {
    const { data } = await supabase
      .from("prepaid_package_plans")
      .select("id, name, pickup_count, validity_days")
      .eq("is_active", true)
      .order("name");

    if (data) setPlans(data);
  }, [supabase]);

  const fetchAssignedPackages = useCallback(
    async (orgId: string) => {
      setLoadingPackages(orgId);
      const { data } = await supabase
        .from("assigned_packages")
        .select("id, plan_id, price_paise, is_active, created_at, prepaid_package_plans(name, pickup_count)")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });

      if (data) {
        setAssignedPackages((prev) => ({
          ...prev,
          [orgId]: data as unknown as AssignedPackageRow[],
        }));
      }
      setLoadingPackages(null);
    },
    [supabase]
  );

  function openAssignDialog(org: OrgWithCounts) {
    setSelectedOrg(org);
    setSelectedPlanId("");
    setPriceInr("");
    setAssignDialogOpen(true);
    fetchPlans();
  }

  function toggleExpanded(orgId: string) {
    if (expandedOrgId === orgId) {
      setExpandedOrgId(null);
    } else {
      setExpandedOrgId(orgId);
      if (!assignedPackages[orgId]) {
        fetchAssignedPackages(orgId);
      }
    }
  }

  async function handleAssignSubmit() {
    if (!selectedOrg || !selectedPlanId || !priceInr) {
      toast.error("Please fill in all fields");
      return;
    }

    const priceFloat = parseFloat(priceInr);
    if (isNaN(priceFloat) || priceFloat <= 0) {
      toast.error("Please enter a valid price");
      return;
    }

    const pricePaise = Math.round(priceFloat * 100);

    setSubmitting(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Unable to verify admin user");
      setSubmitting(false);
      return;
    }

    const { error } = await supabase.from("assigned_packages").insert({
      organization_id: selectedOrg.id,
      plan_id: selectedPlanId,
      price_paise: pricePaise,
      assigned_by: user.id,
    });

    if (error) {
      toast.error("Failed to assign package");
      setSubmitting(false);
      return;
    }

    toast.success(`Package assigned to ${selectedOrg.name}`);
    setAssignDialogOpen(false);
    setSubmitting(false);

    // Refresh assigned packages if this org is expanded
    if (expandedOrgId === selectedOrg.id) {
      fetchAssignedPackages(selectedOrg.id);
    }
    // Clear cached data so it refreshes on next expand
    setAssignedPackages((prev) => {
      const updated = { ...prev };
      delete updated[selectedOrg.id];
      return updated;
    });
  }

  async function handleToggleActive(
    orgId: string,
    packageId: string,
    currentActive: boolean
  ) {
    const { error } = await supabase
      .from("assigned_packages")
      .update({ is_active: !currentActive })
      .eq("id", packageId);

    if (error) {
      toast.error("Failed to update package status");
      return;
    }

    setAssignedPackages((prev) => ({
      ...prev,
      [orgId]: prev[orgId].map((pkg) =>
        pkg.id === packageId ? { ...pkg, is_active: !currentActive } : pkg
      ),
    }));

    toast.success(
      `Package ${!currentActive ? "activated" : "deactivated"}`
    );
  }

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
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Pickups</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orgs.map((org) => (
                  <Fragment key={org.id}>
                    <TableRow>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => toggleExpanded(org.id)}
                        >
                          {expandedOrgId === org.id ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
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
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openAssignDialog(org)}
                        >
                          <Package className="mr-1 h-3 w-3" />
                          Assign Package
                        </Button>
                      </TableCell>
                    </TableRow>

                    {expandedOrgId === org.id && (
                      <TableRow key={`${org.id}-packages`}>
                        <TableCell colSpan={8} className="bg-muted/50 p-4">
                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold">
                              Assigned Packages
                            </h4>
                            {loadingPackages === org.id ? (
                              <p className="text-sm text-muted-foreground">
                                Loading...
                              </p>
                            ) : !assignedPackages[org.id] ||
                              assignedPackages[org.id].length === 0 ? (
                              <p className="text-sm text-muted-foreground">
                                No packages assigned to this organization yet.
                              </p>
                            ) : (
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Plan</TableHead>
                                    <TableHead>Pickups</TableHead>
                                    <TableHead>Price</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Assigned On</TableHead>
                                    <TableHead>Action</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {assignedPackages[org.id].map((pkg) => (
                                    <TableRow key={pkg.id}>
                                      <TableCell className="font-medium">
                                        {pkg.prepaid_package_plans?.name ||
                                          "\u2014"}
                                      </TableCell>
                                      <TableCell>
                                        {pkg.prepaid_package_plans
                                          ?.pickup_count || "\u2014"}
                                      </TableCell>
                                      <TableCell>
                                        {formatPaise(pkg.price_paise)}
                                      </TableCell>
                                      <TableCell>
                                        <Badge
                                          variant="secondary"
                                          className={
                                            pkg.is_active
                                              ? "bg-green-100 text-green-800"
                                              : "bg-gray-100 text-gray-600"
                                          }
                                        >
                                          {pkg.is_active
                                            ? "Active"
                                            : "Inactive"}
                                        </Badge>
                                      </TableCell>
                                      <TableCell>
                                        {new Date(
                                          pkg.created_at
                                        ).toLocaleDateString()}
                                      </TableCell>
                                      <TableCell>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() =>
                                            handleToggleActive(
                                              org.id,
                                              pkg.id,
                                              pkg.is_active
                                            )
                                          }
                                        >
                                          {pkg.is_active
                                            ? "Deactivate"
                                            : "Activate"}
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Assign Package Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Package</DialogTitle>
            <DialogDescription>
              Assign a prepaid package plan to{" "}
              <span className="font-semibold">{selectedOrg?.name}</span> with
              custom pricing.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="plan">Package Plan</Label>
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                <SelectTrigger id="plan">
                  <SelectValue placeholder="Select a plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} ({plan.pickup_count} pickups,{" "}
                      {plan.validity_days} days)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Price (INR)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  ₹
                </span>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="pl-7"
                  value={priceInr}
                  onChange={(e) => setPriceInr(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Enter the price in rupees. It will be stored as paise internally.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAssignDialogOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button onClick={handleAssignSubmit} disabled={submitting}>
              {submitting ? "Assigning..." : "Assign Package"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
