"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRealtime } from "@/hooks/use-realtime";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { DashboardSkeleton } from "@/components/shared/loading-skeleton";
import {
  JOB_STATUS_LABELS,
  JOB_STATUS_COLORS,
  VEHICLE_TYPE_LABELS,
  GREEN_WASTE_DENSITY_KG_PER_M3,
} from "@/lib/constants";
import { ClipboardList, Plus, Eye, AlertTriangle } from "lucide-react";
import Link from "next/link";
import type { JobStatus, VehicleType } from "@/types";
import { toast } from "sonner";

// --- Local types ---

interface JobRow {
  id: string;
  job_number: string;
  vehicle_id: string;
  farmer_id: string;
  driver_id: string | null;
  scheduled_date: string;
  status: JobStatus;
  notes: string | null;
  created_at: string;
  vehicles: { registration_number: string; vehicle_type: VehicleType } | null;
  drivers: { name: string } | null;
  profiles: { full_name: string | null } | null;
  job_pickups: { count: number }[] | null;
}

interface DriverInfo {
  driver_id: string;
  drivers: {
    id: string;
    name: string;
    phone: string;
    license_number: string;
  };
}

interface VehicleOption {
  id: string;
  registration_number: string;
  vehicle_type: VehicleType;
  capacity_kg: number;
  volume_capacity_m3: number | null;
  vehicle_drivers: DriverInfo[];
}

interface FarmerOption {
  id: string;
  full_name: string | null;
  email: string | null;
  farmer_details: {
    farm_name: string | null;
    farm_address: string | null;
    farm_lat: number | null;
    farm_lng: number | null;
    is_active: boolean;
  }[] | null;
}

interface PendingPickup {
  id: string;
  pickup_number: string;
  organization_id: string;
  estimated_weight_kg: number | null;
  estimated_volume_m3: number | null;
  scheduled_date: string;
  org_name: string;
  org_address: string;
  org_type: string;
  lat: number | null;
  lng: number | null;
  distance_km: number | null;
  existing_jobs: string[];
}

// --- Component ---

export default function AdminJobsPage() {
  const supabase = createClient();
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchJobs = useCallback(async () => {
    const { data } = await supabase
      .from("jobs")
      .select(
        "id, job_number, vehicle_id, farmer_id, driver_id, scheduled_date, status, notes, created_at, vehicles(registration_number, vehicle_type), drivers(name), profiles!jobs_farmer_id_fkey(full_name), job_pickups(count)"
      )
      .order("created_at", { ascending: false });

    if (data) setJobs(data as unknown as JobRow[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  useRealtime({
    table: "jobs",
    channelName: "admin-jobs",
    onData: () => fetchJobs(),
  });

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Jobs"
        description="Dispatch vehicles to pickup waste"
        action={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Create Job
          </Button>
        }
      />

      {jobs.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={ClipboardList}
              title="No jobs"
              description="Create a job to batch-assign pickups to a vehicle and farmer."
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job #</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Farmer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Pickups</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>View</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium">
                      {job.job_number}
                    </TableCell>
                    <TableCell>
                      {job.vehicles?.registration_number ?? "—"}
                    </TableCell>
                    <TableCell>
                      {job.drivers?.name ?? "—"}
                    </TableCell>
                    <TableCell>
                      {job.profiles?.full_name ?? "—"}
                    </TableCell>
                    <TableCell>
                      {new Date(job.scheduled_date).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      })}
                    </TableCell>
                    <TableCell>
                      {job.job_pickups?.[0]?.count ?? 0}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={JOB_STATUS_COLORS[job.status]}
                      >
                        {JOB_STATUS_LABELS[job.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" asChild>
                        <Link href={`/dashboard/admin/jobs`}>
                          <Eye className="h-3 w-3" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <CreateJobDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={fetchJobs}
      />
    </div>
  );
}

// --- Create Job Dialog ---

function CreateJobDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const supabase = createClient();
  const [step, setStep] = useState(1);

  // Step 1 state
  const [scheduledDate, setScheduledDate] = useState("");
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [farmers, setFarmers] = useState<FarmerOption[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [selectedDriver, setSelectedDriver] = useState("");
  const [selectedFarmer, setSelectedFarmer] = useState("");
  const [notes, setNotes] = useState("");
  const [loadingOptions, setLoadingOptions] = useState(false);

  // Step 2 state
  const [nearbyPickups, setNearbyPickups] = useState<PendingPickup[]>([]);
  const [otherPickups, setOtherPickups] = useState<PendingPickup[]>([]);
  const [selectedPickupIds, setSelectedPickupIds] = useState<Set<string>>(
    new Set()
  );
  const [loadingPickups, setLoadingPickups] = useState(false);
  const [creating, setCreating] = useState(false);

  const selectedVehicleObj = vehicles.find((v) => v.id === selectedVehicle);
  const vehicleDrivers = selectedVehicleObj?.vehicle_drivers ?? [];
  const selectedFarmerObj = farmers.find((f) => f.id === selectedFarmer);
  const farmerDetail = selectedFarmerObj?.farmer_details?.[0];

  const allPickups = [...nearbyPickups, ...otherPickups];
  const selectedItems = allPickups.filter((p) => selectedPickupIds.has(p.id));
  const selectedWeight = selectedItems.reduce((sum, p) => sum + (p.estimated_weight_kg ?? 0), 0);
  const selectedVolume = selectedItems.reduce(
    (sum, p) => sum + (p.estimated_volume_m3 ?? (p.estimated_weight_kg ?? 0) / GREEN_WASTE_DENSITY_KG_PER_M3),
    0
  );

  // Trip estimation
  const vehicleVolume = selectedVehicleObj?.volume_capacity_m3;
  const vehicleWeight = selectedVehicleObj?.capacity_kg;
  const tripsByVolume = vehicleVolume ? Math.ceil(selectedVolume / vehicleVolume) : 1;
  const tripsByWeight = vehicleWeight ? Math.ceil(selectedWeight / vehicleWeight) : 1;
  const estimatedTrips = Math.max(tripsByVolume, tripsByWeight);
  const bottleneck = tripsByVolume > tripsByWeight ? "volume" : tripsByWeight > tripsByVolume ? "weight" : null;

  // Compute min date (tomorrow) on the client only
  const [minDate, setMinDate] = useState("");
  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setMinDate(tomorrow.toISOString().split("T")[0]);
  }, []);

  // Fetch vehicles & farmers when dialog opens
  useEffect(() => {
    if (!open) return;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const defaultDate = tomorrow.toISOString().split("T")[0];

    setStep(1);
    setScheduledDate(defaultDate);
    setSelectedVehicle("");
    setSelectedDriver("");
    setSelectedFarmer("");
    setNotes("");
    setSelectedPickupIds(new Set());
    setNearbyPickups([]);
    setOtherPickups([]);

    async function load() {
      setLoadingOptions(true);

      // Vehicles: active, with at least one driver, not on an active job on this date
      // We'll filter active jobs client-side for simplicity
      const [{ data: vehicleData }, { data: farmerData }] = await Promise.all([
        supabase
          .from("vehicles")
          .select("id, registration_number, vehicle_type, capacity_kg, volume_capacity_m3, vehicle_drivers(driver_id, drivers(id, name, phone, license_number))")
          .eq("is_active", true)
          .order("registration_number"),
        supabase
          .from("profiles")
          .select("id, full_name, email, farmer_details(farm_name, farm_address, farm_lat, farm_lng, is_active)")
          .eq("role", "farmer"),
      ]);

      // Filter vehicles that have at least one driver
      const withDrivers = (vehicleData ?? []).filter(
        (v: Record<string, unknown>) => {
          const drivers = v.vehicle_drivers as unknown[];
          return drivers && drivers.length > 0;
        }
      ) as unknown as VehicleOption[];
      setVehicles(withDrivers);

      if (farmerData) setFarmers(farmerData as unknown as FarmerOption[]);
      setLoadingOptions(false);
    }
    load();
  }, [open, supabase]);

  // Fetch active jobs for selected date to filter vehicles
  const [busyVehicleIds, setBusyVehicleIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!scheduledDate) return;
    async function fetchBusy() {
      const { data } = await supabase
        .from("jobs")
        .select("vehicle_id")
        .eq("scheduled_date", scheduledDate)
        .in("status", ["pending", "dispatched", "in_progress"]);

      if (data) {
        setBusyVehicleIds(new Set(data.map((j) => j.vehicle_id)));
      }
    }
    fetchBusy();
  }, [scheduledDate, supabase]);

  const availableVehicles = vehicles.filter((v) => !busyVehicleIds.has(v.id));

  // Fetch pickups for step 2
  async function loadPickups() {
    setLoadingPickups(true);

    // Get farmer location for geo query
    const lat = farmerDetail?.farm_lat;
    const lng = farmerDetail?.farm_lng;

    let nearby: PendingPickup[] = [];

    if (lat && lng) {
      const { data } = await supabase.rpc("nearby_pending_pickups", {
        center_lat: lat,
        center_lng: lng,
        radius_km: 10,
      });
      if (data) {
        nearby = (data as Record<string, unknown>[]).map((r) => ({
          id: r.id as string,
          pickup_number: r.pickup_number as string,
          organization_id: r.organization_id as string,
          estimated_weight_kg: r.estimated_weight_kg as number | null,
          estimated_volume_m3: r.estimated_volume_m3 as number | null,
          scheduled_date: r.scheduled_date as string,
          org_name: r.org_name as string,
          org_address: r.org_address as string,
          org_type: r.org_type as string,
          lat: r.lat as number | null,
          lng: r.lng as number | null,
          distance_km: r.distance_km as number | null,
          existing_jobs: [],
        }));
      }
    }

    // Also get ALL pending pickups (for "other" section — those without geo or outside radius)
    const { data: allPending, error: pendingErr } = await supabase
      .from("pickups")
      .select("id, pickup_number, organization_id, estimated_weight_kg, estimated_volume_m3, scheduled_date, organizations(name, address, org_type, lat, lng)")
      .eq("status", "verified")
      .order("scheduled_date", { ascending: true });

    if (pendingErr) {
      console.error("Failed to fetch pending pickups:", pendingErr);
      toast.error("Failed to load pending pickups");
    }

    const nearbyIds = new Set(nearby.map((p) => p.id));
    const other: PendingPickup[] = (allPending ?? [])
      .filter((p: Record<string, unknown>) => !nearbyIds.has(p.id as string))
      .map((p: Record<string, unknown>) => {
        const org = p.organizations as Record<string, unknown> | null;
        return {
          id: p.id as string,
          pickup_number: p.pickup_number as string,
          organization_id: p.organization_id as string,
          estimated_weight_kg: p.estimated_weight_kg as number | null,
          estimated_volume_m3: p.estimated_volume_m3 as number | null,
          scheduled_date: p.scheduled_date as string,
          org_name: (org?.name as string) ?? "",
          org_address: (org?.address as string) ?? "",
          org_type: (org?.org_type as string) ?? "",
          lat: (org?.lat as number) ?? null,
          lng: (org?.lng as number) ?? null,
          distance_km: null,
          existing_jobs: [],
        };
      });

    // Check if any pickups already belong to a job
    const allIds = [...nearby, ...other].map((p) => p.id);
    if (allIds.length > 0) {
      const { data: existingJps } = await supabase
        .from("job_pickups")
        .select("pickup_id, jobs(job_number)")
        .in("pickup_id", allIds);

      if (existingJps) {
        const jobMap: Record<string, string[]> = {};
        for (const jp of existingJps as unknown as { pickup_id: string; jobs: { job_number: string } | null }[]) {
          if (!jobMap[jp.pickup_id]) jobMap[jp.pickup_id] = [];
          if (jp.jobs?.job_number) jobMap[jp.pickup_id].push(jp.jobs.job_number);
        }
        nearby = nearby.map((p) => ({ ...p, existing_jobs: jobMap[p.id] ?? [] }));
        const updatedOther = other.map((p) => ({ ...p, existing_jobs: jobMap[p.id] ?? [] }));
        setOtherPickups(updatedOther);
      } else {
        setOtherPickups(other);
      }
    } else {
      setOtherPickups(other);
    }

    setNearbyPickups(nearby);
    setLoadingPickups(false);
  }

  function togglePickup(id: string) {
    setSelectedPickupIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleCreate() {
    if (selectedPickupIds.size === 0) {
      toast.error("Select at least one pickup");
      return;
    }

    setCreating(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Not authenticated");
      setCreating(false);
      return;
    }

    // Generate job number: JOB-YYYYMMDD-XXXX
    const dateStr = scheduledDate.replace(/-/g, "");
    const { count } = await supabase
      .from("jobs")
      .select("*", { count: "exact", head: true })
      .eq("scheduled_date", scheduledDate);
    const seq = String((count ?? 0) + 1).padStart(4, "0");
    const jobNumber = `JOB-${dateStr}-${seq}`;

    // Create job
    const { data: job, error: jobErr } = await supabase
      .from("jobs")
      .insert({
        job_number: jobNumber,
        vehicle_id: selectedVehicle,
        driver_id: selectedDriver,
        farmer_id: selectedFarmer,
        scheduled_date: scheduledDate,
        notes: notes || null,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (jobErr || !job) {
      toast.error("Failed to create job");
      setCreating(false);
      return;
    }

    // Create job_pickups
    const pickupIds = Array.from(selectedPickupIds);
    const { error: jpErr } = await supabase.from("job_pickups").insert(
      pickupIds.map((pid) => ({ job_id: job.id, pickup_id: pid }))
    );

    if (jpErr) {
      toast.error("Job created but failed to link pickups");
      setCreating(false);
      onOpenChange(false);
      onCreated();
      return;
    }

    // Update linked pickups: status → assigned, vehicle_id, farmer_id
    const { error: updateErr } = await supabase
      .from("pickups")
      .update({
        status: "assigned",
        vehicle_id: selectedVehicle,
        farmer_id: selectedFarmer,
      })
      .in("id", pickupIds);

    if (updateErr) {
      toast.error("Job created but failed to update pickup statuses");
    }

    // Insert pickup events
    await supabase.from("pickup_events").insert(
      pickupIds.map((pid) => ({
        pickup_id: pid,
        status: "assigned",
        changed_by: user.id,
        notes: `Assigned via ${jobNumber}`,
      }))
    );

    toast.success(`${jobNumber} created with ${pickupIds.length} pickup(s)`);
    setCreating(false);
    onOpenChange(false);
    onCreated();
  }

  function handleNext() {
    if (!selectedVehicle || !selectedDriver || !selectedFarmer) {
      toast.error("Please select a vehicle, driver, and farmer");
      return;
    }
    setStep(2);
    loadPickups();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Job</DialogTitle>
          <DialogDescription>
            Assign a vehicle, driver, and farmer, then select pickups to dispatch.
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <>
            <div className="space-y-4 py-2">
              <p className="text-sm font-medium text-muted-foreground">
                Step 1: Vehicle &amp; Farmer
              </p>

              <div className="space-y-2">
                <Label>Scheduled Date</Label>
                <Input
                  type="date"
                  value={scheduledDate}
                  min={minDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Vehicle</Label>
                {loadingOptions ? (
                  <p className="text-sm text-muted-foreground">Loading...</p>
                ) : (
                  <>
                    <Select
                      value={selectedVehicle}
                      onValueChange={(v) => {
                        setSelectedVehicle(v);
                        // Auto-select driver if vehicle has exactly one
                        const veh = vehicles.find((x) => x.id === v);
                        const drivers = veh?.vehicle_drivers ?? [];
                        setSelectedDriver(
                          drivers.length === 1 ? drivers[0].drivers.id : ""
                        );
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a vehicle" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableVehicles.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.registration_number} —{" "}
                            {VEHICLE_TYPE_LABELS[v.vehicle_type]} (
                            {v.capacity_kg} kg
                            {v.volume_capacity_m3 ? ` / ${v.volume_capacity_m3} m³` : ""})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {availableVehicles.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        No available vehicles with drivers for this date.
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Driver selection — shown when a vehicle is selected */}
              {selectedVehicle && vehicleDrivers.length > 0 && (
                <div className="space-y-2">
                  <Label>Driver</Label>
                  {vehicleDrivers.length === 1 ? (
                    <div className="rounded-md border px-3 py-2 text-sm">
                      <p className="font-medium">{vehicleDrivers[0].drivers.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {vehicleDrivers[0].drivers.phone} · {vehicleDrivers[0].drivers.license_number}
                      </p>
                    </div>
                  ) : (
                    <Select
                      value={selectedDriver}
                      onValueChange={setSelectedDriver}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a driver" />
                      </SelectTrigger>
                      <SelectContent>
                        {vehicleDrivers.map((vd) => (
                          <SelectItem key={vd.drivers.id} value={vd.drivers.id}>
                            {vd.drivers.name} · {vd.drivers.phone}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label>Farmer (Destination)</Label>
                <Select
                  value={selectedFarmer}
                  onValueChange={setSelectedFarmer}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a farmer" />
                  </SelectTrigger>
                  <SelectContent>
                    {farmers
                      .filter((f) => f.farmer_details?.[0]?.is_active !== false)
                      .map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.full_name || f.email || f.id}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {selectedFarmerObj && farmerDetail?.farm_name && (
                  <p className="text-xs text-muted-foreground">
                    🌿 {farmerDetail.farm_name}
                    {farmerDetail.farm_address
                      ? `, ${farmerDetail.farm_address}`
                      : ""}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any notes for this job..."
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter className="flex items-center justify-between sm:justify-between">
              <p className="text-xs text-muted-foreground">Step 1 of 2</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button onClick={handleNext}>Next — Select Pickups →</Button>
              </div>
            </DialogFooter>
          </>
        )}

        {step === 2 && (
          <>
            <div className="space-y-4 py-2">
              <p className="text-sm font-medium text-muted-foreground">
                Step 2: Select Pickups
              </p>

              {loadingPickups ? (
                <p className="text-sm text-muted-foreground">
                  Loading verified pickups...
                </p>
              ) : (
                <>
                  {/* Nearby pickups */}
                  {nearbyPickups.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Nearby verified pickups (within 10 km of farm)
                      </p>
                      {nearbyPickups.map((p) => (
                        <PickupRow
                          key={p.id}
                          pickup={p}
                          checked={selectedPickupIds.has(p.id)}
                          onToggle={() => togglePickup(p.id)}
                          showDistance
                        />
                      ))}
                    </div>
                  )}

                  {/* Other pending pickups */}
                  {otherPickups.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {nearbyPickups.length > 0
                          ? "Other verified pickups"
                          : "Verified pickups"}
                      </p>
                      {otherPickups.map((p) => (
                        <PickupRow
                          key={p.id}
                          pickup={p}
                          checked={selectedPickupIds.has(p.id)}
                          onToggle={() => togglePickup(p.id)}
                        />
                      ))}
                    </div>
                  )}

                  {nearbyPickups.length === 0 && otherPickups.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No verified pickups available.
                    </p>
                  )}
                </>
              )}

              {/* Summary bar */}
              {selectedPickupIds.size > 0 && (
                <div className="rounded-md border p-3 bg-muted/50 text-sm space-y-1">
                  <p>
                    Selected: <strong>{selectedPickupIds.size}</strong> pickup
                    {selectedPickupIds.size !== 1 ? "s" : ""}
                  </p>
                  <p className="text-muted-foreground">
                    Est. weight: <strong>~{selectedWeight.toLocaleString()} kg</strong>
                    {selectedVehicleObj && (
                      <> / {selectedVehicleObj.capacity_kg.toLocaleString()} kg capacity</>
                    )}
                  </p>
                  {vehicleVolume && (
                    <p className="text-muted-foreground">
                      Est. volume: <strong>~{selectedVolume.toFixed(1)} m³</strong>
                      {" "}/ {vehicleVolume} m³ capacity
                    </p>
                  )}
                  {selectedVehicleObj && (
                    <p className="text-muted-foreground">
                      Estimated trips: <strong>{estimatedTrips}</strong>
                    </p>
                  )}
                  {estimatedTrips > 1 && (
                    <p className="text-amber-700 font-medium flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {estimatedTrips} trips needed — {bottleneck === "volume" ? "volume" : bottleneck === "weight" ? "weight" : "both weight and volume"} exceeds single-trip capacity
                    </p>
                  )}
                </div>
              )}
            </div>

            <DialogFooter className="flex items-center justify-between sm:justify-between">
              <p className="text-xs text-muted-foreground">Step 2 of 2</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)}>
                  ← Back
                </Button>
                <Button onClick={handleCreate} disabled={creating}>
                  {creating ? "Creating..." : "Create Job"}
                </Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// --- Pickup Row for step 2 ---

function PickupRow({
  pickup,
  checked,
  onToggle,
  showDistance,
}: {
  pickup: PendingPickup;
  checked: boolean;
  onToggle: () => void;
  showDistance?: boolean;
}) {
  return (
    <label className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors">
      <Checkbox checked={checked} onCheckedChange={onToggle} className="mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{pickup.pickup_number}</span>
          <span className="text-sm text-muted-foreground">
            · {pickup.org_name}
          </span>
          {showDistance && pickup.distance_km != null && (
            <span className="text-xs text-muted-foreground">
              · {pickup.distance_km.toFixed(1)} km
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {pickup.estimated_weight_kg
            ? `Est. ${pickup.estimated_weight_kg} kg`
            : "Weight TBD"}
          {pickup.org_type ? ` · ${capitalize(pickup.org_type)}` : ""}
          {pickup.org_address ? ` · ${pickup.org_address}` : ""}
        </div>
        {pickup.existing_jobs.length > 0 && (
          <div className="flex items-center gap-1 mt-1 text-xs text-yellow-700">
            <AlertTriangle className="h-3 w-3" />
            Already in {pickup.existing_jobs.join(", ")}
          </div>
        )}
      </div>
    </label>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");
}
