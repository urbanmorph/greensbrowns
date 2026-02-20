"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { Card, CardContent } from "@/components/ui/card";
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
import { Truck } from "lucide-react";
import Link from "next/link";

interface DeliveryPickup {
  id: string;
  pickup_number: string | null;
  status: string;
  scheduled_date: string;
  estimated_weight_kg: number | null;
  actual_weight_kg: number | null;
  collector: { full_name: string | null } | null;
}

export default function FarmerDeliveriesPage() {
  const { user, loading: userLoading } = useUser();
  const supabase = createClient();
  const [deliveries, setDeliveries] = useState<DeliveryPickup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    async function fetchDeliveries() {
      const { data } = await supabase
        .from("pickups")
        .select("id, pickup_number, status, scheduled_date, estimated_weight_kg, actual_weight_kg, collector:collector_id(full_name)")
        .eq("farmer_id", user!.id)
        .order("scheduled_date", { ascending: false });

      if (data) setDeliveries(data as unknown as DeliveryPickup[]);
      setLoading(false);
    }
    fetchDeliveries();
  }, [user, supabase]);

  if (userLoading || loading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader title="Deliveries" description="Incoming waste deliveries" />

      {deliveries.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={Truck}
              title="No deliveries"
              description="No deliveries have been assigned to you yet."
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
                  <TableHead>Collector</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliveries.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <Link
                        href={`/dashboard/farmer/deliveries/${d.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {d.pickup_number}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {d.collector?.full_name || "—"}
                    </TableCell>
                    <TableCell>
                      {new Date(d.scheduled_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {d.actual_weight_kg
                        ? `${d.actual_weight_kg} kg`
                        : d.estimated_weight_kg
                          ? `~${d.estimated_weight_kg} kg`
                          : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={PICKUP_STATUS_COLORS[d.status]}
                      >
                        {PICKUP_STATUS_LABELS[d.status]}
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
