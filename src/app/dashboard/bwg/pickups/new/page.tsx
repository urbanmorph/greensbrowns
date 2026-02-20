"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { DashboardSkeleton } from "@/components/shared/loading-skeleton";
import { toast } from "sonner";
import type { RecurrenceType } from "@/types";

export default function SchedulePickupPage() {
  const { user, loading: userLoading } = useUser();
  const supabase = createClient();
  const router = useRouter();

  const [orgId, setOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledSlot, setScheduledSlot] = useState("morning");
  const [recurrence, setRecurrence] = useState<RecurrenceType>("one_time");
  const [estimatedWeight, setEstimatedWeight] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!user) return;
    async function fetchOrg() {
      const { data } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user!.id)
        .single();

      if (data) {
        setOrgId(data.organization_id);
      }
      setLoading(false);
    }
    fetchOrg();
  }, [user, supabase]);

  if (userLoading || loading) return <DashboardSkeleton />;

  if (!orgId) {
    return (
      <div className="space-y-6">
        <PageHeader title="Schedule Pickup" />
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              You need to set up your organization first before scheduling pickups.
            </p>
            <Button
              className="mt-4"
              onClick={() => router.push("/dashboard/bwg/organization")}
            >
              Set Up Organization
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !orgId) return;
    setSubmitting(true);

    const { data, error } = await supabase
      .from("pickups")
      .insert({
        organization_id: orgId,
        requested_by: user.id,
        scheduled_date: scheduledDate,
        scheduled_slot: scheduledSlot,
        recurrence,
        estimated_weight_kg: estimatedWeight ? Number(estimatedWeight) : null,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to schedule pickup");
      setSubmitting(false);
      return;
    }

    // Insert initial pickup event
    await supabase.from("pickup_events").insert({
      pickup_id: data.id,
      status: "scheduled",
      changed_by: user.id,
      notes: "Pickup scheduled",
    });

    toast.success("Pickup scheduled!");
    router.push("/dashboard/bwg/pickups");
  }

  // Tomorrow's date as minimum
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split("T")[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Schedule Pickup"
        description="Request a new waste pickup for your organization"
      />
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="date">Pickup Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  min={minDate}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slot">Time Slot</Label>
                <Select value={scheduledSlot} onValueChange={setScheduledSlot}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">Morning (6am - 12pm)</SelectItem>
                    <SelectItem value="afternoon">Afternoon (12pm - 4pm)</SelectItem>
                    <SelectItem value="evening">Evening (4pm - 8pm)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="recurrence">Recurrence</Label>
                <Select
                  value={recurrence}
                  onValueChange={(v) => setRecurrence(v as RecurrenceType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one_time">One Time</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Biweekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight">Estimated Weight (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  value={estimatedWeight}
                  onChange={(e) => setEstimatedWeight(e.target.value)}
                  placeholder="e.g. 50"
                  min="1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special instructions for the collector..."
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Scheduling..." : "Schedule Pickup"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/dashboard/bwg/pickups")}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
