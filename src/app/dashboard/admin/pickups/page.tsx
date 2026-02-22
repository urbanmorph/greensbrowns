"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRealtime } from "@/hooks/use-realtime";
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
import { PICKUP_STATUS_LABELS, PICKUP_STATUS_COLORS } from "@/lib/constants";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Truck, Eye, CheckCircle, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { PickupStatus } from "@/types";
import { toast } from "sonner";

interface PickupWithOrg {
  id: string;
  pickup_number: string | null;
  status: PickupStatus;
  scheduled_date: string;
  scheduled_slot: string | null;
  estimated_weight_kg: number | null;
  estimated_volume_m3: number | null;
  vehicle_id: string | null;
  farmer_id: string | null;
  organizations: { name: string } | null;
  pickup_trips: { count: number }[] | null;
  job_pickups: { jobs: { job_number: string } | null }[] | null;
}

export default function AdminPickupsPage() {
  const supabase = createClient();
  const [pickups, setPickups] = useState<PickupWithOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingDeliveredId, setMarkingDeliveredId] = useState<string | null>(null);
  const [markingProcessedId, setMarkingProcessedId] = useState<string | null>(null);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [verifyingPickup, setVerifyingPickup] = useState<PickupWithOrg | null>(null);
  const [verifyWeight, setVerifyWeight] = useState("");
  const [verifyVolume, setVerifyVolume] = useState("");
  const [verifying, setVerifying] = useState(false);

  useRealtime({
    table: "pickups",
    event: "UPDATE",
    channelName: "admin-pickups-all",
    onData: (payload) => {
      const updated = payload.new as Record<string, unknown>;
      setPickups((prev) =>
        prev.map((p) =>
          p.id === updated.id
            ? {
                ...p,
                status: updated.status as PickupStatus,
                vehicle_id: (updated.vehicle_id as string) ?? p.vehicle_id,
                farmer_id: (updated.farmer_id as string) ?? p.farmer_id,
                estimated_weight_kg: (updated.estimated_weight_kg as number) ?? p.estimated_weight_kg,
                estimated_volume_m3: (updated.estimated_volume_m3 as number) ?? p.estimated_volume_m3,
                scheduled_date: (updated.scheduled_date as string) ?? p.scheduled_date,
                scheduled_slot: (updated.scheduled_slot as string) ?? p.scheduled_slot,
              }
            : p
        )
      );
    },
  });

  useEffect(() => {
    async function fetchData() {
      const { data } = await supabase
        .from("pickups")
        .select("id, pickup_number, status, scheduled_date, scheduled_slot, estimated_weight_kg, estimated_volume_m3, vehicle_id, farmer_id, organizations(name), pickup_trips(count), job_pickups(jobs(job_number))")
        .order("scheduled_date", { ascending: false });

      if (data) setPickups(data as unknown as PickupWithOrg[]);
      setLoading(false);
    }
    fetchData();
  }, [supabase]);

  async function handleMarkDelivered(pickupId: string) {
    setMarkingDeliveredId(pickupId);
    const { error } = await supabase
      .from("pickups")
      .update({ status: "delivered" })
      .eq("id", pickupId);

    if (error) {
      toast.error("Failed to mark as delivered");
      setMarkingDeliveredId(null);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("pickup_events").insert({
        pickup_id: pickupId,
        status: "delivered",
        changed_by: user.id,
        notes: "Marked delivered by admin after farmer verification",
      });
    }

    setPickups((prev) =>
      prev.map((p) => (p.id === pickupId ? { ...p, status: "delivered" } : p))
    );
    toast.success("Pickup marked as delivered");
    setMarkingDeliveredId(null);
  }

  async function handleMarkProcessed(pickupId: string) {
    setMarkingProcessedId(pickupId);
    const { error } = await supabase
      .from("pickups")
      .update({ status: "processed" })
      .eq("id", pickupId);

    if (error) {
      toast.error("Failed to mark as processed");
      setMarkingProcessedId(null);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("pickup_events").insert({
        pickup_id: pickupId,
        status: "processed",
        changed_by: user.id,
        notes: "Marked processed by admin",
      });
    }

    setPickups((prev) =>
      prev.map((p) => (p.id === pickupId ? { ...p, status: "processed" } : p))
    );
    toast.success("Pickup marked as processed");
    setMarkingProcessedId(null);
  }

  function openVerifyDialog(pickup: PickupWithOrg) {
    setVerifyingPickup(pickup);
    setVerifyWeight(pickup.estimated_weight_kg?.toString() ?? "");
    setVerifyVolume(pickup.estimated_volume_m3?.toString() ?? "");
    setVerifyDialogOpen(true);
  }

  async function handleVerify() {
    if (!verifyingPickup) return;
    setVerifying(true);

    const weight = verifyWeight ? Number(verifyWeight) : null;
    const volume = verifyVolume ? Number(verifyVolume) : null;

    const { error } = await supabase
      .from("pickups")
      .update({
        status: "verified",
        estimated_weight_kg: weight,
        estimated_volume_m3: volume,
      })
      .eq("id", verifyingPickup.id);

    if (error) {
      toast.error("Failed to verify pickup");
      setVerifying(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("pickup_events").insert({
        pickup_id: verifyingPickup.id,
        status: "verified",
        changed_by: user.id,
        notes: `Verified by admin — weight: ${weight ?? "N/A"} kg, volume: ${volume ?? "N/A"} m³`,
      });
    }

    setPickups((prev) =>
      prev.map((p) =>
        p.id === verifyingPickup.id
          ? { ...p, status: "verified" as PickupStatus, estimated_weight_kg: weight, estimated_volume_m3: volume }
          : p
      )
    );
    toast.success("Pickup verified");
    setVerifying(false);
    setVerifyDialogOpen(false);
  }

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader title="All Pickups" description="Monitor pickups and track status" />

      {pickups.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={Truck}
              title="No pickups"
              description="No pickups have been scheduled yet."
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pickup #</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Est. Weight</TableHead>
                  <TableHead>Trips</TableHead>
                  <TableHead>Job</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pickups.map((pickup) => {
                  const jobNumbers = pickup.job_pickups
                    ?.map((jp) => jp.jobs?.job_number)
                    .filter(Boolean) as string[] | undefined;

                  return (
                    <TableRow key={pickup.id}>
                      <TableCell className="font-medium">
                        {pickup.pickup_number}
                      </TableCell>
                      <TableCell>
                        {pickup.organizations?.name || "—"}
                      </TableCell>
                      <TableCell>
                        {new Date(pickup.scheduled_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {pickup.estimated_weight_kg
                          ? `${pickup.estimated_weight_kg} kg`
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {pickup.pickup_trips?.[0]?.count ?? 0}
                      </TableCell>
                      <TableCell>
                        {jobNumbers && jobNumbers.length > 0 ? (
                          <div className="flex flex-col gap-0.5">
                            {jobNumbers.map((jn) => (
                              <Link
                                key={jn}
                                href="/dashboard/admin/jobs"
                                className="text-sm text-blue-600 hover:underline"
                              >
                                {jn}
                              </Link>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={PICKUP_STATUS_COLORS[pickup.status]}
                        >
                          {PICKUP_STATUS_LABELS[pickup.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {pickup.status === "requested" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openVerifyDialog(pickup)}
                            >
                              <ShieldCheck className="mr-1 h-3 w-3" />
                              Verify
                            </Button>
                          )}
                          {pickup.status === "picked_up" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMarkDelivered(pickup.id)}
                              disabled={markingDeliveredId === pickup.id}
                            >
                              <CheckCircle className="mr-1 h-3 w-3" />
                              {markingDeliveredId === pickup.id ? "..." : "Mark Delivered"}
                            </Button>
                          )}
                          {pickup.status === "delivered" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMarkProcessed(pickup.id)}
                              disabled={markingProcessedId === pickup.id}
                            >
                              <CheckCircle className="mr-1 h-3 w-3" />
                              {markingProcessedId === pickup.id ? "..." : "Mark Processed"}
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" asChild>
                            <Link href={`/dashboard/admin/pickups/${pickup.id}`}>
                              <Eye className="h-3 w-3" />
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Verify Pickup Dialog */}
      <Dialog open={verifyDialogOpen} onOpenChange={setVerifyDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Verify Pickup</DialogTitle>
            <DialogDescription>
              Review and confirm the estimated weight and volume for {verifyingPickup?.pickup_number}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="text-sm text-muted-foreground">
              Organization: <strong>{verifyingPickup?.organizations?.name ?? "—"}</strong>
            </div>
            <div className="space-y-2">
              <Label htmlFor="verifyWeight">Estimated Weight (kg)</Label>
              <Input
                id="verifyWeight"
                type="number"
                min="0"
                value={verifyWeight}
                onChange={(e) => setVerifyWeight(e.target.value)}
                placeholder="Enter weight in kg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="verifyVolume">Estimated Volume (m³)</Label>
              <Input
                id="verifyVolume"
                type="number"
                min="0"
                step="0.1"
                value={verifyVolume}
                onChange={(e) => setVerifyVolume(e.target.value)}
                placeholder="Enter volume in m³"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVerifyDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleVerify} disabled={verifying}>
              <ShieldCheck className="mr-2 h-4 w-4" />
              {verifying ? "Verifying..." : "Verify Pickup"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
