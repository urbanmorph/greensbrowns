"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Truck } from "lucide-react";
import Link from "next/link";
import type { Pickup } from "@/types";

export default function BwgPickupsPage() {
  const { user, loading: userLoading } = useUser();
  const supabase = createClient();
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    async function fetchPickups() {
      // Get user's org
      const { data: membership } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user!.id)
        .single();

      if (!membership) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("pickups")
        .select("*")
        .eq("organization_id", membership.organization_id)
        .order("scheduled_date", { ascending: false });

      if (data) setPickups(data as Pickup[]);
      setLoading(false);
    }
    fetchPickups();
  }, [user, supabase]);

  if (userLoading || loading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pickups"
        description="Manage your waste pickups"
        action={
          <Button asChild>
            <Link href="/dashboard/bwg/pickups/new">
              <Plus className="mr-2 h-4 w-4" /> Schedule Pickup
            </Link>
          </Button>
        }
      />

      {pickups.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={Truck}
              title="No pickups yet"
              description="Schedule your first waste pickup to get started."
              action={
                <Button asChild>
                  <Link href="/dashboard/bwg/pickups/new">
                    <Plus className="mr-2 h-4 w-4" /> Schedule Pickup
                  </Link>
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
                  <TableHead>Pickup #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Slot</TableHead>
                  <TableHead>Est. Weight</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pickups.map((pickup) => (
                  <TableRow key={pickup.id}>
                    <TableCell>
                      <Link
                        href={`/dashboard/bwg/pickups/${pickup.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {pickup.pickup_number}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {new Date(pickup.scheduled_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="capitalize">
                      {pickup.scheduled_slot || "—"}
                    </TableCell>
                    <TableCell>
                      {pickup.estimated_weight_kg
                        ? `${pickup.estimated_weight_kg} kg`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={PICKUP_STATUS_COLORS[pickup.status]}
                      >
                        {PICKUP_STATUS_LABELS[pickup.status]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
