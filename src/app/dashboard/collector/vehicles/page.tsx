"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { DashboardSkeleton } from "@/components/shared/loading-skeleton";
import { Plus, Truck } from "lucide-react";
import { toast } from "sonner";
import type { Vehicle, VehicleType } from "@/types";

const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  auto: "Auto",
  mini_truck: "Mini Truck",
  truck: "Truck",
  tempo: "Tempo",
};

export default function VehiclesPage() {
  const { user, loading: userLoading } = useUser();
  const supabase = createClient();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [regNumber, setRegNumber] = useState("");
  const [vehicleType, setVehicleType] = useState<VehicleType>("auto");
  const [capacity, setCapacity] = useState("500");

  useEffect(() => {
    if (!user) return;
    async function fetchVehicles() {
      const { data } = await supabase
        .from("vehicles")
        .select("*")
        .eq("owner_id", user!.id)
        .order("created_at", { ascending: false });

      if (data) setVehicles(data as Vehicle[]);
      setLoading(false);
    }
    fetchVehicles();
  }, [user, supabase]);

  function openAddDialog() {
    setRegNumber("");
    setVehicleType("auto");
    setCapacity("500");
    setDialogOpen(true);
  }

  async function handleAdd() {
    if (!user || !regNumber.trim()) {
      toast.error("Registration number is required");
      return;
    }
    setSaving(true);

    const { data, error } = await supabase
      .from("vehicles")
      .insert({
        owner_id: user.id,
        registration_number: regNumber.trim().toUpperCase(),
        vehicle_type: vehicleType,
        capacity_kg: Number(capacity) || 500,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        toast.error("A vehicle with this registration number already exists");
      } else {
        toast.error("Failed to add vehicle");
      }
      setSaving(false);
      return;
    }

    setVehicles((prev) => [data as Vehicle, ...prev]);
    toast.success("Vehicle added");
    setDialogOpen(false);
    setSaving(false);
  }

  async function toggleActive(vehicle: Vehicle) {
    const { error } = await supabase
      .from("vehicles")
      .update({ is_active: !vehicle.is_active })
      .eq("id", vehicle.id);

    if (error) {
      toast.error("Failed to update vehicle");
      return;
    }

    setVehicles((prev) =>
      prev.map((v) =>
        v.id === vehicle.id ? { ...v, is_active: !v.is_active } : v
      )
    );
    toast.success(
      vehicle.is_active ? "Vehicle deactivated" : "Vehicle activated"
    );
  }

  if (userLoading || loading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Vehicles"
        description="Manage your registered vehicles"
        action={
          <Button onClick={openAddDialog}>
            <Plus className="mr-2 h-4 w-4" /> Add Vehicle
          </Button>
        }
      />

      {vehicles.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={Truck}
              title="No vehicles"
              description="Register your first vehicle to start accepting pickup jobs."
              action={
                <Button onClick={openAddDialog}>
                  <Plus className="mr-2 h-4 w-4" /> Add Vehicle
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Registration</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Capacity (kg)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicles.map((vehicle) => (
                  <TableRow key={vehicle.id}>
                    <TableCell className="font-medium font-mono">
                      {vehicle.registration_number}
                    </TableCell>
                    <TableCell>
                      {VEHICLE_TYPE_LABELS[vehicle.vehicle_type]}
                    </TableCell>
                    <TableCell>{vehicle.capacity_kg}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={
                          vehicle.is_active
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }
                      >
                        {vehicle.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleActive(vehicle)}
                      >
                        {vehicle.is_active ? "Deactivate" : "Activate"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Vehicle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="regNumber">Registration Number</Label>
              <Input
                id="regNumber"
                value={regNumber}
                onChange={(e) => setRegNumber(e.target.value)}
                placeholder="e.g. KA01AB1234"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Vehicle Type</Label>
              <Select
                value={vehicleType}
                onValueChange={(v) => setVehicleType(v as VehicleType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto</SelectItem>
                  <SelectItem value="mini_truck">Mini Truck</SelectItem>
                  <SelectItem value="truck">Truck</SelectItem>
                  <SelectItem value="tempo">Tempo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="capacity">Capacity (kg)</Label>
              <Input
                id="capacity"
                type="number"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                min="50"
                max="10000"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={saving}>
              {saving ? "Adding..." : "Add Vehicle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
