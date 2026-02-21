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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { DashboardSkeleton } from "@/components/shared/loading-skeleton";
import { PICKUP_STATUS_LABELS, PICKUP_STATUS_COLORS, VEHICLE_TYPE_LABELS } from "@/lib/constants";
import { Truck, UserPlus, Eye, CheckCircle } from "lucide-react";
import Link from "next/link";
import type { VehicleType, PickupStatus } from "@/types";
import { toast } from "sonner";

interface PickupWithOrg {
  id: string;
  pickup_number: string | null;
  status: PickupStatus;
  scheduled_date: string;
  scheduled_slot: string | null;
  estimated_weight_kg: number | null;
  vehicle_id: string | null;
  farmer_id: string | null;
  organizations: { name: string } | null;
  pickup_trips: { count: number }[] | null;
}

interface ProfileOption {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface VehicleOption {
  id: string;
  registration_number: string;
  vehicle_type: VehicleType;
}

export default function AdminPickupsPage() {
  const supabase = createClient();
  const [pickups, setPickups] = useState<PickupWithOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedPickup, setSelectedPickup] = useState<PickupWithOrg | null>(null);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [farmers, setFarmers] = useState<ProfileOption[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [selectedFarmer, setSelectedFarmer] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [markingDeliveredId, setMarkingDeliveredId] = useState<string | null>(null);
  const [markingProcessedId, setMarkingProcessedId] = useState<string | null>(null);

  // Realtime: pickup updates (all pickups)
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
        .select("id, pickup_number, status, scheduled_date, scheduled_slot, estimated_weight_kg, vehicle_id, farmer_id, organizations(name), pickup_trips(count)")
        .order("scheduled_date", { ascending: false });

      if (data) setPickups(data as unknown as PickupWithOrg[]);

      // Fetch vehicles and farmers for assignment
      const { data: vehicleData } = await supabase
        .from("vehicles")
        .select("id, registration_number, vehicle_type")
        .eq("is_active", true)
        .order("registration_number");
      if (vehicleData) setVehicles(vehicleData as VehicleOption[]);

      const { data: farmerData } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("role", "farmer");
      if (farmerData) setFarmers(farmerData);

      setLoading(false);
    }
    fetchData();
  }, [supabase]);

  function openAssignDialog(pickup: PickupWithOrg) {
    setSelectedPickup(pickup);
    setSelectedVehicle(pickup.vehicle_id || "");
    setSelectedFarmer(pickup.farmer_id || "");
    setAssignDialogOpen(true);
  }

  async function handleAssign() {
    if (!selectedPickup || !selectedVehicle || !selectedFarmer) {
      toast.error("Please select both a vehicle and farmer");
      return;
    }
    setAssigning(true);

    const { error } = await supabase
      .from("pickups")
      .update({
        vehicle_id: selectedVehicle,
        farmer_id: selectedFarmer,
        status: "assigned",
      })
      .eq("id", selectedPickup.id);

    if (error) {
      toast.error("Failed to assign pickup");
      setAssigning(false);
      return;
    }

    // Get admin user for event
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      await supabase.from("pickup_events").insert({
        pickup_id: selectedPickup.id,
        status: "assigned",
        changed_by: user.id,
        notes: "Vehicle and farmer assigned by admin",
      });
    }

    // Update local state
    setPickups((prev) =>
      prev.map((p) =>
        p.id === selectedPickup.id
          ? { ...p, status: "assigned", vehicle_id: selectedVehicle, farmer_id: selectedFarmer }
          : p
      )
    );

    toast.success("Pickup assigned successfully");
    setAssignDialogOpen(false);
    setAssigning(false);
  }

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

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader title="All Pickups" description="Monitor and assign pickups" />

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
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pickups.map((pickup) => (
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
                            onClick={() => openAssignDialog(pickup)}
                          >
                            <UserPlus className="mr-1 h-3 w-3" /> Assign
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
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Assign Pickup {selectedPickup?.pickup_number}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Vehicle</Label>
              <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.registration_number} — {VEHICLE_TYPE_LABELS[v.vehicle_type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Farmer</Label>
              <Select value={selectedFarmer} onValueChange={setSelectedFarmer}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a farmer" />
                </SelectTrigger>
                <SelectContent>
                  {farmers.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.full_name || f.email || f.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAssignDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleAssign} disabled={assigning}>
              {assigning ? "Assigning..." : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
