"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { useRealtime } from "@/hooks/use-realtime";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { DashboardSkeleton } from "@/components/shared/loading-skeleton";
import { PhotoDisplay } from "@/components/shared/photo-display";
import { PICKUP_STATUS_LABELS, PICKUP_STATUS_COLORS } from "@/lib/constants";
import { ArrowLeft, Clock, XCircle } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import type { Pickup, PickupEvent } from "@/types";

export default function PickupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: userLoading } = useUser();
  const supabase = createClient();
  const router = useRouter();

  const [pickup, setPickup] = useState<Pickup | null>(null);
  const [events, setEvents] = useState<(PickupEvent & { profile_name?: string })[]>([]);
  const [collectorName, setCollectorName] = useState<string | null>(null);
  const [farmerName, setFarmerName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

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
    channelName: `bwg-pickup-${id}`,
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
    channelName: `bwg-pickup-events-${id}`,
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

      // Fetch events with changer names
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

      // Fetch collector/farmer names
      if (pickupData.collector_id) {
        const { data } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", pickupData.collector_id)
          .single();
        if (data) setCollectorName(data.full_name);
      }
      if (pickupData.farmer_id) {
        const { data } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", pickupData.farmer_id)
          .single();
        if (data) setFarmerName(data.full_name);
      }

      setLoading(false);
    }
    fetchData();
  }, [user, id, supabase]);

  async function handleCancel() {
    if (!user || !pickup) return;
    setCancelling(true);

    const { error } = await supabase
      .from("pickups")
      .update({ status: "cancelled" })
      .eq("id", pickup.id);

    if (error) {
      toast.error("Failed to cancel pickup");
      setCancelling(false);
      return;
    }

    await supabase.from("pickup_events").insert({
      pickup_id: pickup.id,
      status: "cancelled",
      changed_by: user.id,
      notes: "Cancelled by BWG",
    });

    setPickup({ ...pickup, status: "cancelled" });
    toast.success("Pickup cancelled");
    setCancelling(false);
  }

  if (userLoading || loading) return <DashboardSkeleton />;
  if (!pickup) {
    return (
      <div className="space-y-6">
        <PageHeader title="Pickup not found" />
        <Button variant="outline" asChild>
          <Link href="/dashboard/bwg/pickups">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Pickups
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Pickup ${pickup.pickup_number}`}
        action={
          <Button variant="outline" asChild>
            <Link href="/dashboard/bwg/pickups">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
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
                  ? `${(Number(pickup.estimated_weight_kg) / 1000).toFixed(2)} tonnes`
                  : "—"}
              </span>
            </div>
            {pickup.actual_weight_kg && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Actual Weight</span>
                <span>{(Number(pickup.actual_weight_kg) / 1000).toFixed(2)} tonnes</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Loading Helper</span>
              <span>{(pickup as Record<string, unknown>).loading_helper_required ? "Required" : "Not needed"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Collector</span>
              <span>{collectorName || "Not assigned"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Farmer</span>
              <span>{farmerName || "Not assigned"}</span>
            </div>
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

      {Array.isArray((pickup as Record<string, unknown>).waste_photo_urls) &&
        ((pickup as Record<string, unknown>).waste_photo_urls as string[]).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Waste Photos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 flex-wrap">
                {((pickup as Record<string, unknown>).waste_photo_urls as string[]).map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-32 w-32 rounded-md overflow-hidden border hover:ring-2 ring-primary transition-all"
                  >
                    <img
                      src={url}
                      alt={`Waste photo ${i + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

      {pickup.status === "requested" && (
        <div className="flex justify-end">
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={cancelling}
          >
            <XCircle className="mr-2 h-4 w-4" />
            {cancelling ? "Cancelling..." : "Cancel Pickup"}
          </Button>
        </div>
      )}
    </div>
  );
}
