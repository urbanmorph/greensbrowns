"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { useRealtime } from "@/hooks/use-realtime";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/shared/page-header";
import { DashboardSkeleton } from "@/components/shared/loading-skeleton";
import { PhotoUpload } from "@/components/shared/photo-upload";
import { PhotoDisplay } from "@/components/shared/photo-display";
import { PICKUP_STATUS_LABELS, PICKUP_STATUS_COLORS } from "@/lib/constants";
import { ArrowLeft, Clock, CheckCircle, Truck, Package } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import type { Pickup, PickupEvent, PickupStatus } from "@/types";

const STATUS_TRANSITIONS: Partial<Record<PickupStatus, { next: PickupStatus; label: string; icon: typeof CheckCircle }>> = {
  assigned: { next: "picked_up", label: "Mark Picked Up", icon: Package },
  picked_up: { next: "in_transit", label: "Mark In Transit", icon: Truck },
  in_transit: { next: "delivered", label: "Mark Delivered", icon: CheckCircle },
};

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: userLoading } = useUser();
  const supabase = createClient();
  const router = useRouter();

  const [pickup, setPickup] = useState<Pickup | null>(null);
  const [events, setEvents] = useState<(PickupEvent & { profile_name?: string })[]>([]);
  const [orgName, setOrgName] = useState("");
  const [orgAddress, setOrgAddress] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [actualWeight, setActualWeight] = useState("");

  const refetchEvents = useCallback(async () => {
    const { data: eventsData } = await supabase
      .from("pickup_events")
      .select("*, profiles:changed_by(full_name)")
      .eq("pickup_id", id)
      .order("created_at", { ascending: true });

    if (eventsData) {
      setEvents(
        eventsData.map((e) => ({
          ...e,
          profile_name: (e.profiles as unknown as { full_name: string })?.full_name,
        })) as (PickupEvent & { profile_name?: string })[]
      );
    }
  }, [supabase, id]);

  // Realtime: pickup updates
  useRealtime({
    table: "pickups",
    filter: `id=eq.${id}`,
    event: "UPDATE",
    channelName: `collector-pickup-${id}`,
    onData: (payload) => {
      const updated = payload.new as Record<string, unknown>;
      setPickup((prev) => (prev ? { ...prev, ...updated } : prev));
    },
  });

  // Realtime: new pickup events
  useRealtime({
    table: "pickup_events",
    filter: `pickup_id=eq.${id}`,
    event: "INSERT",
    channelName: `collector-pickup-events-${id}`,
    onData: () => {
      refetchEvents();
    },
  });

  useEffect(() => {
    if (!user) return;
    async function fetchData() {
      const { data: pickupData } = await supabase
        .from("pickups")
        .select("*")
        .eq("id", id)
        .single();

      if (!pickupData) {
        setLoading(false);
        return;
      }

      setPickup(pickupData as Pickup);
      if (pickupData.actual_weight_kg) {
        setActualWeight(String(pickupData.actual_weight_kg));
      }

      // Fetch org info
      const { data: orgData } = await supabase
        .from("organizations")
        .select("name, address")
        .eq("id", pickupData.organization_id)
        .single();
      if (orgData) {
        setOrgName(orgData.name);
        setOrgAddress(orgData.address);
      }

      // Fetch events
      const { data: eventsData } = await supabase
        .from("pickup_events")
        .select("*, profiles:changed_by(full_name)")
        .eq("pickup_id", id)
        .order("created_at", { ascending: true });

      if (eventsData) {
        setEvents(
          eventsData.map((e) => ({
            ...e,
            profile_name: (e.profiles as unknown as { full_name: string })?.full_name,
          })) as (PickupEvent & { profile_name?: string })[]
        );
      }

      setLoading(false);
    }
    fetchData();
  }, [user, id, supabase]);

  async function handlePhotoUploaded(type: "before" | "after", url: string) {
    if (!pickup) return;
    const field = type === "before" ? "photo_before_url" : "photo_after_url";
    await supabase
      .from("pickups")
      .update({ [field]: url })
      .eq("id", pickup.id);
    setPickup({ ...pickup, [field]: url });
  }

  async function handleStatusUpdate(nextStatus: PickupStatus) {
    if (!user || !pickup) return;
    setUpdating(true);

    const updates: Record<string, unknown> = { status: nextStatus };
    if (nextStatus === "picked_up" && actualWeight) {
      updates.actual_weight_kg = Number(actualWeight);
    }

    const { error } = await supabase
      .from("pickups")
      .update(updates)
      .eq("id", pickup.id);

    if (error) {
      toast.error("Failed to update status");
      setUpdating(false);
      return;
    }

    await supabase.from("pickup_events").insert({
      pickup_id: pickup.id,
      status: nextStatus,
      changed_by: user.id,
      notes: `Status updated to ${PICKUP_STATUS_LABELS[nextStatus]}`,
    });

    setPickup({ ...pickup, status: nextStatus, ...(updates.actual_weight_kg ? { actual_weight_kg: Number(actualWeight) } : {}) });
    toast.success(`Status updated to ${PICKUP_STATUS_LABELS[nextStatus]}`);
    setUpdating(false);
  }

  if (userLoading || loading) return <DashboardSkeleton />;
  if (!pickup) {
    return (
      <div className="space-y-6">
        <PageHeader title="Job not found" />
        <Button variant="outline" asChild>
          <Link href="/dashboard/collector/jobs">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Jobs
          </Link>
        </Button>
      </div>
    );
  }

  const transition = STATUS_TRANSITIONS[pickup.status as PickupStatus];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Job ${pickup.pickup_number}`}
        action={
          <Button variant="outline" asChild>
            <Link href="/dashboard/collector/jobs">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pickup Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge
                variant="secondary"
                className={PICKUP_STATUS_COLORS[pickup.status]}
              >
                {PICKUP_STATUS_LABELS[pickup.status]}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Organization</span>
              <span>{orgName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Address</span>
              <span className="text-right max-w-[200px]">{orgAddress}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Scheduled Date</span>
              <span>{new Date(pickup.scheduled_date).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Time Slot</span>
              <span className="capitalize">{pickup.scheduled_slot || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Estimated Weight</span>
              <span>
                {pickup.estimated_weight_kg
                  ? `${pickup.estimated_weight_kg} kg`
                  : "—"}
              </span>
            </div>
            {pickup.actual_weight_kg && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Actual Weight</span>
                <span>{pickup.actual_weight_kg} kg</span>
              </div>
            )}
            {pickup.notes && (
              <div>
                <span className="text-muted-foreground">Notes</span>
                <p className="mt-1 text-sm">{pickup.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground">No events yet.</p>
            ) : (
              <div className="space-y-4">
                {events.map((event) => (
                  <div key={event.id} className="flex gap-3">
                    <div className="mt-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className={PICKUP_STATUS_COLORS[event.status]}
                        >
                          {PICKUP_STATUS_LABELS[event.status]}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(event.created_at).toLocaleString()}
                        </span>
                      </div>
                      {event.profile_name && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          by {event.profile_name}
                        </p>
                      )}
                      {event.notes && (
                        <p className="mt-1 text-sm">{event.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <PhotoDisplay
        beforeUrl={pickup.photo_before_url}
        afterUrl={pickup.photo_after_url}
      />

      {transition && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              {pickup.status === "assigned" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="actualWeight">Actual Weight (kg)</Label>
                    <Input
                      id="actualWeight"
                      type="number"
                      value={actualWeight}
                      onChange={(e) => setActualWeight(e.target.value)}
                      placeholder="Enter actual weight"
                      className="w-48"
                      min="1"
                    />
                  </div>
                  <PhotoUpload
                    pickupId={pickup.id}
                    type="before"
                    existingUrl={pickup.photo_before_url}
                    onUploaded={(url) => handlePhotoUploaded("before", url)}
                  />
                </>
              )}
              {pickup.status === "in_transit" && (
                <PhotoUpload
                  pickupId={pickup.id}
                  type="after"
                  existingUrl={pickup.photo_after_url}
                  onUploaded={(url) => handlePhotoUploaded("after", url)}
                />
              )}
              <Button
                onClick={() => handleStatusUpdate(transition.next)}
                disabled={updating}
              >
                <transition.icon className="mr-2 h-4 w-4" />
                {updating ? "Updating..." : transition.label}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
