"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { DashboardSkeleton } from "@/components/shared/loading-skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Truck,
  Upload,
  FileText,
  Download,
  ToggleLeft,
  ToggleRight,
  Eye,
  Users,
  X,
  IndianRupee,
} from "lucide-react";
import { toast } from "sonner";
import {
  VEHICLE_TYPE_LABELS,
  VEHICLE_TYPE_DETAILS,
  VEHICLE_DOC_LABELS,
} from "@/lib/constants";
import { extractRegistrationNumber, extractLicenseDetails } from "@/lib/ocr";
import type { Vehicle, VehicleType, VehicleDocType, VehicleDocument, Driver, VehicleTypeRate } from "@/types";

interface VehicleWithDetails extends Vehicle {
  vehicle_documents?: VehicleDocument[];
  vehicle_drivers?: { driver_id: string; drivers: Driver }[];
}

const DOC_TYPES: VehicleDocType[] = ["rc", "insurance", "tax_receipt", "emission_cert", "fitness_cert"];
const DOC_TYPES_WITH_EXPIRY: VehicleDocType[] = ["insurance", "emission_cert", "fitness_cert"];

export default function AdminCollectorVehiclesPage() {
  const supabase = createClient();
  const [vehicles, setVehicles] = useState<VehicleWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingVehicle, setViewingVehicle] = useState<VehicleWithDetails | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [regNumber, setRegNumber] = useState("");
  const [vehicleType, setVehicleType] = useState<VehicleType>("auto");
  const [capacity, setCapacity] = useState("400");
  const [volumeCapacity, setVolumeCapacity] = useState("2.5");

  // Document state
  const [docFiles, setDocFiles] = useState<Partial<Record<VehicleDocType, File>>>({});
  const [docExpiry, setDocExpiry] = useState<Partial<Record<VehicleDocType, string>>>({});

  // OCR state
  const [ocrProgress, setOcrProgress] = useState<number | null>(null);
  const [ocrRunning, setOcrRunning] = useState(false);

  // Driver dialog state
  const [driverDialogOpen, setDriverDialogOpen] = useState(false);
  const [driverVehicle, setDriverVehicle] = useState<VehicleWithDetails | null>(null);
  const [driverName, setDriverName] = useState("");
  const [driverLicense, setDriverLicense] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [driverValidTill, setDriverValidTill] = useState("");
  const [driverLicenseFile, setDriverLicenseFile] = useState<File | null>(null);
  const [dlOcrRunning, setDlOcrRunning] = useState(false);
  const [dlOcrProgress, setDlOcrProgress] = useState<number | null>(null);
  const [addingDriver, setAddingDriver] = useState(false);

  // Rates state
  const [rates, setRates] = useState<VehicleTypeRate[]>([]);
  const [editedRates, setEditedRates] = useState<Record<string, { base_fare_rs: string; per_km_rs: string }>>({});
  const [savingRates, setSavingRates] = useState(false);

  const fetchVehicles = useCallback(async () => {
    const { data, error } = await supabase
      .from("vehicles")
      .select("*, vehicle_documents(*), vehicle_drivers(driver_id, drivers(*))")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load vehicles");
      console.error(error);
    }
    if (data) setVehicles(data as unknown as VehicleWithDetails[]);
    setLoading(false);
  }, [supabase]);

  const fetchRates = useCallback(async () => {
    const { data, error } = await supabase
      .from("vehicle_type_rates")
      .select("*")
      .order("base_fare_rs", { ascending: true });

    if (error) {
      toast.error("Failed to load rates");
      console.error(error);
    }
    if (data) setRates(data as unknown as VehicleTypeRate[]);
  }, [supabase]);

  useEffect(() => {
    fetchVehicles();
    fetchRates();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function resetForm() {
    setRegNumber("");
    setVehicleType("auto");
    setCapacity(String(VEHICLE_TYPE_DETAILS.auto.capacity));
    setVolumeCapacity(String(VEHICLE_TYPE_DETAILS.auto.volume_m3));
    setDocFiles({});
    setDocExpiry({});
    setOcrProgress(null);
  }

  function openAddDialog() {
    resetForm();
    setDialogOpen(true);
  }

  async function handleRcUpload(file: File) {
    setDocFiles((prev) => ({ ...prev, rc: file }));
    setOcrRunning(true);
    setOcrProgress(0);

    try {
      const regNum = await extractRegistrationNumber(file, setOcrProgress);
      if (regNum) {
        setRegNumber(regNum);
        toast.success(`Extracted: ${regNum}`);
      } else {
        toast.info("Could not extract registration number — please enter manually");
      }
    } catch {
      toast.error("OCR failed — please enter registration number manually");
    } finally {
      setOcrRunning(false);
      setOcrProgress(null);
    }
  }

  async function handleAdd() {
    if (!regNumber.trim()) {
      toast.error("Registration number is required");
      return;
    }

    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // 1. Insert vehicle
    const { data: vehicle, error: vehicleError } = await supabase
      .from("vehicles")
      .insert({
        created_by: user!.id,
        registration_number: regNumber.trim().toUpperCase(),
        vehicle_type: vehicleType,
        capacity_kg: Number(capacity) || 500,
        volume_capacity_m3: Number(volumeCapacity) || null,
      })
      .select()
      .single();

    if (vehicleError) {
      if (vehicleError.code === "23505") {
        toast.error("A vehicle with this registration number already exists");
      } else {
        toast.error("Failed to add vehicle");
        console.error(vehicleError);
      }
      setSaving(false);
      return;
    }

    const vehicleId = (vehicle as Vehicle).id;

    // 2. Upload documents and insert records
    const docEntries = Object.entries(docFiles) as [VehicleDocType, File][];

    for (const [docType, file] of docEntries) {
      const ext = file.name.split(".").pop() || "pdf";
      const filePath = `${vehicleId}/${docType}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("vehicle-docs")
        .upload(filePath, file);

      if (uploadError) {
        console.error(`Failed to upload ${docType}:`, uploadError);
        toast.error(`Failed to upload ${VEHICLE_DOC_LABELS[docType]}`);
        continue;
      }

      await supabase.from("vehicle_documents").insert({
        vehicle_id: vehicleId,
        doc_type: docType,
        file_path: filePath,
        uploaded_by: user?.id,
        expires_at: docExpiry[docType] || null,
      });
    }

    toast.success("Vehicle added successfully");
    setDialogOpen(false);
    setSaving(false);
    fetchVehicles();
  }

  async function toggleActive(vehicle: VehicleWithDetails) {
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
    toast.success(vehicle.is_active ? "Vehicle deactivated" : "Vehicle activated");
  }

  async function viewDocuments(vehicle: VehicleWithDetails) {
    setViewingVehicle(vehicle);
    setViewDialogOpen(true);
  }

  async function downloadDoc(filePath: string, docType: VehicleDocType) {
    const { data, error } = await supabase.storage
      .from("vehicle-docs")
      .createSignedUrl(filePath, 60);

    if (error || !data?.signedUrl) {
      toast.error("Failed to get download link");
      return;
    }

    window.open(data.signedUrl, "_blank");
  }

  function openDriverDialog(vehicle: VehicleWithDetails) {
    setDriverVehicle(vehicle);
    setDriverName("");
    setDriverLicense("");
    setDriverPhone("");
    setDriverValidTill("");
    setDriverLicenseFile(null);
    setDlOcrRunning(false);
    setDlOcrProgress(null);
    setDriverDialogOpen(true);
  }

  async function handleDlUpload(file: File) {
    setDriverLicenseFile(file);
    setDlOcrRunning(true);
    setDlOcrProgress(0);

    try {
      const { licenseNumber, name, validTill } = await extractLicenseDetails(file, setDlOcrProgress);
      const extracted: string[] = [];

      if (licenseNumber) {
        setDriverLicense(licenseNumber);
        extracted.push(`DL: ${licenseNumber}`);
      }
      if (name) {
        setDriverName(name);
        extracted.push(`Name: ${name}`);
      }
      if (validTill) {
        setDriverValidTill(validTill);
        extracted.push(`Valid till: ${validTill}`);
      }

      if (extracted.length > 0) {
        toast.success(`Extracted: ${extracted.join(", ")}`);
      } else {
        toast.info("Could not extract details — please enter manually");
      }
    } catch {
      toast.error("OCR failed — please enter details manually");
    } finally {
      setDlOcrRunning(false);
      setDlOcrProgress(null);
    }
  }

  async function handleAddDriver() {
    if (!driverLicense.trim() || !driverName.trim()) {
      toast.error("Driver name and license number are required");
      return;
    }
    if (!driverPhone.trim()) {
      toast.error("WhatsApp phone number is required");
      return;
    }
    setAddingDriver(true);

    // Upload DL photo if provided
    let licensePhotoPath: string | null = null;
    if (driverLicenseFile) {
      const ext = driverLicenseFile.name.split(".").pop() || "jpg";
      const dlKey = driverLicense.trim().toUpperCase().replace(/\s+/g, "");
      const filePath = `driver-licenses/${dlKey}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("vehicle-docs")
        .upload(filePath, driverLicenseFile, { upsert: true });

      if (uploadError) {
        console.error("Failed to upload DL photo:", uploadError);
        toast.error("Failed to upload license photo, but will continue adding driver");
      } else {
        licensePhotoPath = filePath;
      }
    }

    // Upsert driver by license_number
    const { data: driver, error: driverError } = await supabase
      .from("drivers")
      .upsert(
        {
          name: driverName.trim(),
          license_number: driverLicense.trim().toUpperCase(),
          phone: driverPhone.trim(),
          license_photo_path: licensePhotoPath,
          license_valid_till: driverValidTill || null,
        },
        { onConflict: "license_number" }
      )
      .select()
      .single();

    if (driverError) {
      toast.error("Failed to add driver");
      console.error(driverError);
      setAddingDriver(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();

    const { error: linkError } = await supabase
      .from("vehicle_drivers")
      .insert({
        vehicle_id: driverVehicle!.id,
        driver_id: (driver as Driver).id,
        assigned_by: user?.id,
      });

    if (linkError) {
      if (linkError.code === "23505") {
        toast.error("Driver is already assigned to this vehicle");
      } else {
        toast.error("Failed to assign driver");
        console.error(linkError);
      }
      setAddingDriver(false);
      return;
    }

    toast.success("Driver assigned");
    setDriverName("");
    setDriverLicense("");
    setDriverPhone("");
    setDriverValidTill("");
    setDriverLicenseFile(null);
    setAddingDriver(false);
    await fetchVehicles();

    // Refresh the dialog vehicle reference
    setDriverVehicle((prev) => {
      if (!prev) return prev;
      return vehicles.find((v) => v.id === prev.id) ?? prev;
    });
  }

  async function removeDriver(vehicleId: string, driverId: string) {
    const { error } = await supabase
      .from("vehicle_drivers")
      .delete()
      .eq("vehicle_id", vehicleId)
      .eq("driver_id", driverId);

    if (error) {
      toast.error("Failed to remove driver");
      return;
    }

    toast.success("Driver removed");
    await fetchVehicles();
  }

  // Keep driverVehicle in sync after fetchVehicles
  useEffect(() => {
    if (driverVehicle) {
      const updated = vehicles.find((v) => v.id === driverVehicle.id);
      if (updated) setDriverVehicle(updated);
    }
  }, [vehicles]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSaveRates() {
    const entries = Object.entries(editedRates);
    if (entries.length === 0) {
      toast.info("No changes to save");
      return;
    }

    setSavingRates(true);
    const { data: { user } } = await supabase.auth.getUser();

    let failed = 0;
    for (const [id, vals] of entries) {
      const { error } = await supabase
        .from("vehicle_type_rates")
        .update({
          base_fare_rs: Number(vals.base_fare_rs),
          per_km_rs: Number(vals.per_km_rs),
          updated_by: user?.id ?? null,
        })
        .eq("id", id);

      if (error) {
        console.error(error);
        failed++;
      }
    }

    if (failed > 0) {
      toast.error(`Failed to update ${failed} rate(s)`);
    } else {
      toast.success("Rates saved");
    }

    setEditedRates({});
    setSavingRates(false);
    fetchRates();
  }

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Collector Vehicles"
        description="Register and manage vehicles assigned to collectors"
      />

      <Tabs defaultValue="vehicles">
        <TabsList>
          <TabsTrigger value="vehicles">
            <Truck className="mr-2 h-4 w-4" /> Vehicles
          </TabsTrigger>
          <TabsTrigger value="rates">
            <IndianRupee className="mr-2 h-4 w-4" /> Rates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vehicles" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button onClick={openAddDialog}>
              <Plus className="mr-2 h-4 w-4" /> Add Vehicle
            </Button>
          </div>

          {vehicles.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <EmptyState
                  icon={Truck}
                  title="No vehicles registered"
                  description="Add the first vehicle to get started."
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
                      <TableHead>Drivers</TableHead>
                      <TableHead>Docs</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vehicles.map((vehicle) => {
                      const docCount = vehicle.vehicle_documents?.length ?? 0;
                      const driverCount = vehicle.vehicle_drivers?.length ?? 0;
                      return (
                        <TableRow key={vehicle.id}>
                          <TableCell className="font-medium font-mono">
                            {vehicle.registration_number}
                          </TableCell>
                          <TableCell>
                            {VEHICLE_TYPE_LABELS[vehicle.vehicle_type]}
                          </TableCell>
                          <TableCell>{vehicle.capacity_kg}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {driverCount}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {docCount}/{DOC_TYPES.length}
                            </Badge>
                          </TableCell>
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
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openDriverDialog(vehicle)}
                              >
                                <Users className="mr-1 h-3 w-3" /> Drivers
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => viewDocuments(vehicle)}
                              >
                                <Eye className="mr-1 h-3 w-3" /> Docs
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => toggleActive(vehicle)}
                                title={vehicle.is_active ? "Deactivate" : "Activate"}
                              >
                                {vehicle.is_active ? (
                                  <ToggleRight className="h-4 w-4 text-green-600" />
                                ) : (
                                  <ToggleLeft className="h-4 w-4 text-gray-400" />
                                )}
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
        </TabsContent>

        <TabsContent value="rates" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle Type</TableHead>
                    <TableHead>Base Fare (Rs)</TableHead>
                    <TableHead>Per Km (Rs)</TableHead>
                    <TableHead>Last Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rates.map((rate) => {
                    const edited = editedRates[rate.id];
                    return (
                      <TableRow key={rate.id}>
                        <TableCell className="font-medium">
                          {VEHICLE_TYPE_LABELS[rate.vehicle_type]}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            className="w-24"
                            value={edited?.base_fare_rs ?? String(rate.base_fare_rs)}
                            onChange={(e) =>
                              setEditedRates((prev) => ({
                                ...prev,
                                [rate.id]: {
                                  base_fare_rs: e.target.value,
                                  per_km_rs: prev[rate.id]?.per_km_rs ?? String(rate.per_km_rs),
                                },
                              }))
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.5"
                            className="w-24"
                            value={edited?.per_km_rs ?? String(rate.per_km_rs)}
                            onChange={(e) =>
                              setEditedRates((prev) => ({
                                ...prev,
                                [rate.id]: {
                                  base_fare_rs: prev[rate.id]?.base_fare_rs ?? String(rate.base_fare_rs),
                                  per_km_rs: e.target.value,
                                },
                              }))
                            }
                          />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(rate.updated_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <div className="flex justify-end mt-4">
            <Button
              onClick={handleSaveRates}
              disabled={savingRates || Object.keys(editedRates).length === 0}
            >
              {savingRates ? "Saving..." : "Save Rates"}
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Vehicle Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Vehicle</DialogTitle>
            <DialogDescription>
              Upload the RC to auto-fill registration number, then add vehicle details and documents.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* RC Upload + OCR */}
            <div className="space-y-2">
              <Label>Registration Certificate (RC)</Label>
              <div className="flex items-center gap-3">
                <label className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2 rounded-md border border-dashed border-gray-300 px-4 py-3 text-sm text-muted-foreground hover:border-gray-400 transition-colors">
                    <Upload className="h-4 w-4" />
                    {docFiles.rc ? docFiles.rc.name : "Choose RC image or PDF..."}
                  </div>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleRcUpload(file);
                    }}
                  />
                </label>
              </div>
              {ocrRunning && ocrProgress !== null && (
                <div className="space-y-1">
                  <Progress value={ocrProgress} className="h-2" />
                  <p className="text-xs text-muted-foreground">Reading registration number... {ocrProgress}%</p>
                </div>
              )}
            </div>

            {/* Vehicle Details */}
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

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Vehicle Type</Label>
                <Select
                  value={vehicleType}
                  onValueChange={(v) => {
                    const t = v as VehicleType;
                    setVehicleType(t);
                    setCapacity(String(VEHICLE_TYPE_DETAILS[t].capacity));
                    setVolumeCapacity(String(VEHICLE_TYPE_DETAILS[t].volume_m3));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(VEHICLE_TYPE_LABELS) as VehicleType[]).map((type) => (
                      <SelectItem key={type} value={type}>
                        {VEHICLE_TYPE_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  e.g. {VEHICLE_TYPE_DETAILS[vehicleType].examples}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity (kg)</Label>
                <Input
                  id="capacity"
                  type="number"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  min="50"
                  max="15000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="volumeCapacity">Volume (m³)</Label>
                <Input
                  id="volumeCapacity"
                  type="number"
                  value={volumeCapacity}
                  onChange={(e) => setVolumeCapacity(e.target.value)}
                  min="0.1"
                  max="50"
                  step="0.1"
                />
              </div>
            </div>

            {/* Additional Documents */}
            <div className="space-y-3">
              <Label className="text-base">Additional Documents</Label>
              {DOC_TYPES.filter((dt) => dt !== "rc").map((docType) => {
                const hasExpiry = DOC_TYPES_WITH_EXPIRY.includes(docType);
                return (
                  <div key={docType} className="flex items-end gap-3">
                    <div className="flex-1 space-y-1">
                      <Label className="text-sm font-normal text-muted-foreground">
                        {VEHICLE_DOC_LABELS[docType]}
                      </Label>
                      <label className="block cursor-pointer">
                        <div className="flex items-center gap-2 rounded-md border border-dashed border-gray-300 px-3 py-2 text-sm text-muted-foreground hover:border-gray-400 transition-colors">
                          <Upload className="h-3 w-3" />
                          {docFiles[docType] ? docFiles[docType]!.name : "Choose file..."}
                        </div>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) setDocFiles((prev) => ({ ...prev, [docType]: file }));
                          }}
                        />
                      </label>
                    </div>
                    {hasExpiry && (
                      <div className="w-40 space-y-1">
                        <Label className="text-sm font-normal text-muted-foreground">Expiry</Label>
                        <Input
                          type="date"
                          value={docExpiry[docType] || ""}
                          onChange={(e) =>
                            setDocExpiry((prev) => ({ ...prev, [docType]: e.target.value }))
                          }
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={saving || ocrRunning}>
              {saving ? "Adding..." : "Add Vehicle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Documents Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Vehicle Documents — {viewingVehicle?.registration_number}
            </DialogTitle>
            <DialogDescription>
              View and download vehicle documents
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {DOC_TYPES.map((docType) => {
              const doc = viewingVehicle?.vehicle_documents?.find(
                (d) => d.doc_type === docType
              );
              const isExpired = doc?.expires_at && new Date(doc.expires_at) < new Date();
              return (
                <div
                  key={docType}
                  className="flex items-center justify-between rounded-md border px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{VEHICLE_DOC_LABELS[docType]}</p>
                      {doc?.expires_at && (
                        <p className={`text-xs ${isExpired ? "text-red-600" : "text-muted-foreground"}`}>
                          {isExpired ? "Expired" : "Expires"}: {new Date(doc.expires_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  {doc ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => downloadDoc(doc.file_path, docType)}
                    >
                      <Download className="mr-1 h-3 w-3" /> Download
                    </Button>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      Not uploaded
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Driver Management Dialog */}
      <Dialog open={driverDialogOpen} onOpenChange={setDriverDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Drivers — {driverVehicle?.registration_number}
            </DialogTitle>
            <DialogDescription>
              Manage drivers assigned to this vehicle
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Assigned drivers list */}
            {(driverVehicle?.vehicle_drivers?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-2">
                No drivers assigned yet
              </p>
            ) : (
              <div className="space-y-2">
                {driverVehicle?.vehicle_drivers?.map((vd) => (
                  <div
                    key={vd.driver_id}
                    className="flex items-center justify-between rounded-md border px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{vd.drivers.name}</p>
                      <p className="text-xs text-muted-foreground">
                        License: {vd.drivers.license_number}
                        {vd.drivers.phone && ` · ${vd.drivers.phone}`}
                      </p>
                      {vd.drivers.license_valid_till && (
                        <p className={`text-xs ${new Date(vd.drivers.license_valid_till) <= new Date(new Date().toISOString().split("T")[0]) ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                          {new Date(vd.drivers.license_valid_till) <= new Date(new Date().toISOString().split("T")[0])
                            ? "License expired"
                            : "Valid till"}: {new Date(vd.drivers.license_valid_till).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeDriver(driverVehicle!.id, vd.driver_id)}
                    >
                      <X className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Add driver inline form */}
            <div className="border-t pt-4 space-y-3">
              <p className="text-sm font-medium">Add Driver</p>

              {/* DL Photo Upload */}
              <div className="space-y-1">
                <Label>Driving License Photo</Label>
                <label className="block cursor-pointer">
                  <div className="flex items-center gap-2 rounded-md border border-dashed border-gray-300 px-3 py-2 text-sm text-muted-foreground hover:border-gray-400 transition-colors">
                    <Upload className="h-3 w-3" />
                    {driverLicenseFile ? driverLicenseFile.name : "Upload DL photo to auto-fill license number..."}
                  </div>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleDlUpload(file);
                    }}
                  />
                </label>
                {dlOcrRunning && dlOcrProgress !== null && (
                  <div className="space-y-1">
                    <Progress value={dlOcrProgress} className="h-2" />
                    <p className="text-xs text-muted-foreground">Reading license number... {dlOcrProgress}%</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="driverName">Name</Label>
                  <Input
                    id="driverName"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    placeholder="Driver name"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="driverLicense">License Number</Label>
                  <Input
                    id="driverLicense"
                    value={driverLicense}
                    onChange={(e) => setDriverLicense(e.target.value)}
                    placeholder="e.g. KA0120210012345"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="driverPhone">WhatsApp Phone Number *</Label>
                  <Input
                    id="driverPhone"
                    type="tel"
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    placeholder="+91..."
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Used for dispatch notifications via WhatsApp
                  </p>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="driverValidTill">License Valid Till *</Label>
                  <Input
                    id="driverValidTill"
                    type="date"
                    value={driverValidTill}
                    onChange={(e) => setDriverValidTill(e.target.value)}
                    required
                  />
                  {driverValidTill && new Date(driverValidTill) <= new Date(new Date().toISOString().split("T")[0]) && (
                    <p className="text-xs text-red-600 font-medium">
                      This license has expired. Cannot add driver with an expired license.
                    </p>
                  )}
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={handleAddDriver}
                  disabled={
                    addingDriver ||
                    dlOcrRunning ||
                    !driverValidTill ||
                    new Date(driverValidTill) <= new Date(new Date().toISOString().split("T")[0])
                  }
                >
                  {addingDriver ? "Adding..." : "Add"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
