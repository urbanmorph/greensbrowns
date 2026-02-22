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
import {
  ClipboardList,
  Plus,
  Eye,
  AlertTriangle,
  Sparkles,
  Truck,
  MapPin,
  Weight,
  Package,
  Route,
  IndianRupee,
  Check,
  X,
} from "lucide-react";
import Link from "next/link";
import type { JobStatus, VehicleType } from "@/types";
import { toast } from "sonner";
import {
  optimizeJobs,
  type JobSuggestion,
  type OptimizerPickup,
  type OptimizerFarmer,
  type OptimizerRate,
  type OptimizerVehicle,
} from "@/lib/job-optimizer";
import type { SupabaseClient } from "@supabase/supabase-js";

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

// --- Shared job creation helper ---

async function createJobFromSuggestion(
  supabase: SupabaseClient,
  params: {
    scheduledDate: string;
    vehicleId: string;
    driverId: string | null;
    farmerId: string;
    pickupIds: string[];
    notes?: string | null;
  },
): Promise<{ jobNumber: string } | { error: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { scheduledDate, vehicleId, driverId, farmerId, pickupIds, notes } = params;

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
      vehicle_id: vehicleId,
      driver_id: driverId,
      farmer_id: farmerId,
      scheduled_date: scheduledDate,
      notes: notes || null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (jobErr || !job) return { error: "Failed to create job" };

  // Create job_pickups
  const { error: jpErr } = await supabase.from("job_pickups").insert(
    pickupIds.map((pid) => ({ job_id: job.id, pickup_id: pid })),
  );

  if (jpErr) return { error: "Job created but failed to link pickups" };

  // Update linked pickups: status -> assigned, vehicle_id, farmer_id
  await supabase
    .from("pickups")
    .update({ status: "assigned", vehicle_id: vehicleId, farmer_id: farmerId })
    .in("id", pickupIds);

  // Insert pickup events
  await supabase.from("pickup_events").insert(
    pickupIds.map((pid) => ({
      pickup_id: pid,
      status: "assigned",
      changed_by: user.id,
      notes: `Assigned via ${jobNumber}`,
    })),
  );

  return { jobNumber };
}

// --- Component ---

export default function AdminJobsPage() {
  const supabase = createClient();
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [optimizeOpen, setOptimizeOpen] = useState(false);

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
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOptimizeOpen(true)}>
              <Sparkles className="mr-2 h-4 w-4" /> Auto-Optimize
            </Button>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Create Job
            </Button>
          </div>
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

      <OptimizeSuggestionsDialog
        open={optimizeOpen}
        onOpenChange={setOptimizeOpen}
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

    const result = await createJobFromSuggestion(supabase, {
      scheduledDate,
      vehicleId: selectedVehicle,
      driverId: selectedDriver,
      farmerId: selectedFarmer,
      pickupIds: Array.from(selectedPickupIds),
      notes: notes || null,
    });

    if ("error" in result) {
      toast.error(result.error);
      setCreating(false);
      return;
    }

    toast.success(`${result.jobNumber} created with ${selectedPickupIds.size} pickup(s)`);
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
                    {farmerDetail.farm_name}
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

// --- Auto-Optimize Suggestions Dialog ---

function OptimizeSuggestionsDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const supabase = createClient();

  const [scheduledDate, setScheduledDate] = useState("");
  const [minDate, setMinDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<JobSuggestion[]>([]);
  const [skippedPickups, setSkippedPickups] = useState<OptimizerPickup[]>([]);
  const [dismissedIndices, setDismissedIndices] = useState<Set<number>>(new Set());
  const [acceptingIndex, setAcceptingIndex] = useState<number | null>(null);
  const [hasRun, setHasRun] = useState(false);

  // Available vehicles with drivers (for resolving physical vehicle + driver on accept)
  const [vehiclesWithDrivers, setVehiclesWithDrivers] = useState<VehicleOption[]>([]);
  const [busyVehicleIds, setBusyVehicleIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setMinDate(tomorrow.toISOString().split("T")[0]);
  }, []);

  useEffect(() => {
    if (!open) return;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setScheduledDate(tomorrow.toISOString().split("T")[0]);
    setSuggestions([]);
    setSkippedPickups([]);
    setDismissedIndices(new Set());
    setHasRun(false);
  }, [open]);

  // Re-run optimization when date changes and dialog is open
  useEffect(() => {
    if (!open || !scheduledDate) return;
    runOptimizer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduledDate, open]);

  async function runOptimizer() {
    setLoading(true);
    setDismissedIndices(new Set());

    const [
      { data: pickupData },
      { data: farmerData },
      { data: rateData },
      { data: vehicleData },
      { data: busyData },
    ] = await Promise.all([
      supabase
        .from("pickups")
        .select("id, pickup_number, estimated_weight_kg, estimated_volume_m3, organizations(name, lat, lng)")
        .eq("status", "verified"),
      supabase
        .from("profiles")
        .select("id, full_name, farmer_details(farm_lat, farm_lng, is_active)")
        .eq("role", "farmer"),
      supabase.from("vehicle_type_rates").select("vehicle_type, base_fare_rs, per_km_rs"),
      supabase
        .from("vehicles")
        .select("id, vehicle_type, capacity_kg, volume_capacity_m3, vehicle_drivers(driver_id, drivers(id, name, phone, license_number))")
        .eq("is_active", true),
      supabase
        .from("jobs")
        .select("vehicle_id")
        .eq("scheduled_date", scheduledDate)
        .in("status", ["pending", "dispatched", "in_progress"]),
    ]);

    const busyIds = new Set((busyData ?? []).map((j) => j.vehicle_id));
    setBusyVehicleIds(busyIds);

    // Vehicles with at least one driver
    const allVehiclesWithDrivers = (vehicleData ?? []).filter(
      (v: Record<string, unknown>) => {
        const drivers = v.vehicle_drivers as unknown[];
        return drivers && drivers.length > 0;
      },
    ) as unknown as VehicleOption[];
    setVehiclesWithDrivers(allVehiclesWithDrivers);

    // Map data into optimizer input types
    const optimizerPickups: OptimizerPickup[] = (pickupData ?? []).map(
      (p: Record<string, unknown>) => {
        const org = p.organizations as Record<string, unknown> | null;
        return {
          id: p.id as string,
          pickup_number: p.pickup_number as string,
          org_name: (org?.name as string) ?? "",
          estimated_weight_kg: p.estimated_weight_kg as number | null,
          estimated_volume_m3: p.estimated_volume_m3 as number | null,
          lat: (org?.lat as number) ?? null,
          lng: (org?.lng as number) ?? null,
        };
      },
    );

    const optimizerFarmers: OptimizerFarmer[] = (farmerData ?? [])
      .filter((f: Record<string, unknown>) => {
        const details = f.farmer_details as Record<string, unknown>[] | null;
        return details?.[0]?.is_active !== false;
      })
      .map((f: Record<string, unknown>) => {
        const details = f.farmer_details as Record<string, unknown>[] | null;
        return {
          id: f.id as string,
          full_name: f.full_name as string | null,
          farm_lat: (details?.[0]?.farm_lat as number) ?? null,
          farm_lng: (details?.[0]?.farm_lng as number) ?? null,
        };
      });

    const optimizerRates: OptimizerRate[] = (rateData ?? []).map(
      (r: Record<string, unknown>) => ({
        vehicle_type: r.vehicle_type as VehicleType,
        base_fare_rs: r.base_fare_rs as number,
        per_km_rs: r.per_km_rs as number,
      }),
    );

    // Available (not busy) vehicles for the optimizer
    const availableVehicles: OptimizerVehicle[] = allVehiclesWithDrivers
      .filter((v) => !busyIds.has(v.id))
      .map((v) => ({
        id: v.id,
        vehicle_type: v.vehicle_type,
        capacity_kg: v.capacity_kg,
        volume_capacity_m3: v.volume_capacity_m3,
      }));

    const result = optimizeJobs(
      optimizerPickups,
      optimizerFarmers,
      optimizerRates,
      availableVehicles,
      GREEN_WASTE_DENSITY_KG_PER_M3,
    );

    setSuggestions(result.suggestions);
    setSkippedPickups(result.skippedPickups);
    setHasRun(true);
    setLoading(false);
  }

  async function handleAccept(index: number) {
    const suggestion = suggestions[index];
    setAcceptingIndex(index);

    // Find a physical vehicle of the winning type that is available
    const availableOfType = vehiclesWithDrivers.filter(
      (v) =>
        v.vehicle_type === suggestion.vehicleType &&
        !busyVehicleIds.has(v.id),
    );

    if (availableOfType.length === 0) {
      toast.error(`No available ${VEHICLE_TYPE_LABELS[suggestion.vehicleType]} for this date`);
      setAcceptingIndex(null);
      return;
    }

    const vehicle = availableOfType[0];
    const driver = vehicle.vehicle_drivers[0]?.drivers;

    const result = await createJobFromSuggestion(supabase, {
      scheduledDate,
      vehicleId: vehicle.id,
      driverId: driver?.id ?? null,
      farmerId: suggestion.farmerId,
      pickupIds: suggestion.pickupIds,
      notes: `Auto-optimized: ${suggestion.pickups.length} pickups, est. ${suggestion.estimatedTrips} trip(s), ~${suggestion.estimatedDistanceKm} km`,
    });

    if ("error" in result) {
      toast.error(result.error);
      setAcceptingIndex(null);
      return;
    }

    toast.success(`${result.jobNumber} created with ${suggestion.pickupIds.length} pickup(s)`);

    // Mark this vehicle as busy now and dismiss the card
    setBusyVehicleIds((prev) => new Set([...prev, vehicle.id]));
    setDismissedIndices((prev) => new Set([...prev, index]));
    setAcceptingIndex(null);
    onCreated();
  }

  const visibleSuggestions = suggestions.filter((_, i) => !dismissedIndices.has(i));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" /> Auto-Optimize Jobs
          </DialogTitle>
          <DialogDescription>
            Clusters verified pickups by proximity, assigns nearest farmer, and picks the cheapest vehicle type.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Scheduled Date</Label>
            <Input
              type="date"
              value={scheduledDate}
              min={minDate}
              onChange={(e) => setScheduledDate(e.target.value)}
            />
          </div>

          {loading && (
            <p className="text-sm text-muted-foreground">
              Running optimizer...
            </p>
          )}

          {!loading && hasRun && (
            <>
              {/* Skipped pickups warning */}
              {skippedPickups.length > 0 && (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">
                  <div className="flex items-center gap-2 font-medium text-amber-800">
                    <AlertTriangle className="h-4 w-4" />
                    {skippedPickups.length} pickup{skippedPickups.length !== 1 ? "s" : ""} skipped (no organization coordinates)
                  </div>
                  <div className="mt-1 text-xs text-amber-700">
                    {skippedPickups.map((p) => p.pickup_number).join(", ")}
                  </div>
                </div>
              )}

              {/* Suggestions */}
              {visibleSuggestions.length === 0 && suggestions.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No optimization suggestions. Make sure there are verified pickups with organization locations set.
                </p>
              )}

              {visibleSuggestions.length === 0 && suggestions.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  All suggestions have been accepted or dismissed.
                </p>
              )}

              {suggestions.map((suggestion, index) => {
                if (dismissedIndices.has(index)) return null;

                const availableOfType = vehiclesWithDrivers.filter(
                  (v) =>
                    v.vehicle_type === suggestion.vehicleType &&
                    !busyVehicleIds.has(v.id),
                );
                const noVehicle = availableOfType.length === 0;

                return (
                  <SuggestionCard
                    key={index}
                    suggestion={suggestion}
                    index={index}
                    noVehicleAvailable={noVehicle}
                    accepting={acceptingIndex === index}
                    onAccept={() => handleAccept(index)}
                    onDismiss={() =>
                      setDismissedIndices((prev) => new Set([...prev, index]))
                    }
                  />
                );
              })}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Suggestion Card ---

function SuggestionCard({
  suggestion,
  index,
  noVehicleAvailable,
  accepting,
  onAccept,
  onDismiss,
}: {
  suggestion: JobSuggestion;
  index: number;
  noVehicleAvailable: boolean;
  accepting: boolean;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Cluster {index + 1}</p>
        <Badge variant="secondary">
          {VEHICLE_TYPE_LABELS[suggestion.vehicleType]}
        </Badge>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="flex items-center gap-1 text-muted-foreground">
          <Package className="h-3 w-3" />
          {suggestion.pickups.length} pickup{suggestion.pickups.length !== 1 ? "s" : ""}
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <Weight className="h-3 w-3" />
          {suggestion.totalWeightKg.toLocaleString()} kg
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <Package className="h-3 w-3" />
          {suggestion.totalVolumeM3} m³
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <Truck className="h-3 w-3" />
          {suggestion.estimatedTrips} trip{suggestion.estimatedTrips !== 1 ? "s" : ""}
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <Route className="h-3 w-3" />
          {suggestion.estimatedDistanceKm} km
        </div>
        <div className="flex items-center gap-1 font-medium">
          <IndianRupee className="h-3 w-3" />
          {suggestion.estimatedCostRs.toLocaleString()}
        </div>
      </div>

      {/* Pickup list */}
      <div className="text-xs text-muted-foreground space-y-0.5">
        {suggestion.pickups.map((p) => (
          <div key={p.id} className="flex items-center gap-1">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="font-medium">{p.pickup_number}</span> — {p.org_name}
          </div>
        ))}
      </div>

      {/* Farmer */}
      <p className="text-xs text-muted-foreground">
        Farmer: <span className="font-medium">{suggestion.farmerName}</span>
      </p>

      {/* No vehicle warning */}
      {noVehicleAvailable && (
        <p className="text-xs text-amber-700 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          No available {VEHICLE_TYPE_LABELS[suggestion.vehicleType]} for this date
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          onClick={onAccept}
          disabled={noVehicleAvailable || accepting}
        >
          {accepting ? (
            "Creating..."
          ) : (
            <>
              <Check className="mr-1 h-3 w-3" /> Accept
            </>
          )}
        </Button>
        <Button size="sm" variant="ghost" onClick={onDismiss} disabled={accepting}>
          <X className="mr-1 h-3 w-3" /> Dismiss
        </Button>
      </div>
    </div>
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
