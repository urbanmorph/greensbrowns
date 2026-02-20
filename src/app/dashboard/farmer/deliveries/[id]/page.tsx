"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { DashboardSkeleton } from "@/components/shared/loading-skeleton";
import { PICKUP_STATUS_LABELS, PICKUP_STATUS_COLORS } from "@/lib/constants";
import { ArrowLeft, Clock, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import type { Pickup, PickupEvent } from "@/types";

export default function DeliveryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: userLoading } = useUser();
  const supabase = createClient();

  const [pickup, setPickup] = useState<Pickup | null>(null);
  const [events, setEvents] = useState<(PickupEvent & { profile_name?: string })[]>([]);
  const [collectorName, setCollectorName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

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

      // Fetch collector name
      if (pickupData.collector_id) {
        const { data } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", pickupData.collector_id)
          .single();
        if (data) setCollectorName(data.full_name);
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

  async function handleConfirmReceipt() {
    if (!user || !pickup) return;
    setProcessing(true);

    const { error } = await supabase
      .from("pickups")
      .update({ status: "processed" })
      .eq("id", pickup.id);

    if (error) {
      toast.error("Failed to confirm receipt");
      setProcessing(false);
      return;
    }

    await supabase.from("pickup_events").insert({
      pickup_id: pickup.id,
      status: "processed",
      changed_by: user.id,
      notes: "Receipt confirmed by farmer",
    });

    setPickup({ ...pickup, status: "processed" });
    toast.success("Receipt confirmed! Pickup marked as processed.");
    setProcessing(false);

    // Refresh events
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
  }

  if (userLoading || loading) return <DashboardSkeleton />;
  if (!pickup) {
    return (
      <div className="space-y-6">
        <PageHeader title="Delivery not found" />
        <Button variant="outline" asChild>
          <Link href="/dashboard/farmer/deliveries">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Deliveries
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Delivery ${pickup.pickup_number}`}
        action={
          <Button variant="outline" asChild>
            <Link href="/dashboard/farmer/deliveries">
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
              <span className="text-muted-foreground">Collector</span>
              <span>{collectorName || "—"}</span>
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

      {pickup.status === "delivered" && (
        <Card>
          <CardContent className="pt-6">
            <Button
              onClick={handleConfirmReceipt}
              disabled={processing}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              {processing ? "Processing..." : "Confirm Receipt & Process"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
