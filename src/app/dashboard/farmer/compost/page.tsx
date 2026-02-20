"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatCard } from "@/components/shared/stat-card";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { DashboardSkeleton } from "@/components/shared/loading-skeleton";
import { PICKUP_STATUS_LABELS, PICKUP_STATUS_COLORS } from "@/lib/constants";
import { Leaf, Weight, TrendingUp, Recycle } from "lucide-react";
import Link from "next/link";

interface ProcessedPickup {
  id: string;
  pickup_number: string | null;
  status: string;
  scheduled_date: string;
  actual_weight_kg: number | null;
  estimated_weight_kg: number | null;
}

export default function CompostPage() {
  const { user, loading: userLoading } = useUser();
  const supabase = createClient();
  const [pickups, setPickups] = useState<ProcessedPickup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    async function fetchData() {
      const { data } = await supabase
        .from("pickups")
        .select("id, pickup_number, status, scheduled_date, actual_weight_kg, estimated_weight_kg")
        .eq("farmer_id", user!.id)
        .eq("status", "processed")
        .order("scheduled_date", { ascending: false });

      if (data) setPickups(data as ProcessedPickup[]);
      setLoading(false);
    }
    fetchData();
  }, [user, supabase]);

  if (userLoading || loading) return <DashboardSkeleton />;

  const totalWeight = pickups.reduce(
    (sum, p) => sum + (Number(p.actual_weight_kg) || Number(p.estimated_weight_kg) || 0),
    0
  );

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const monthlyWeight = pickups
    .filter((p) => new Date(p.scheduled_date) >= startOfMonth)
    .reduce(
      (sum, p) => sum + (Number(p.actual_weight_kg) || Number(p.estimated_weight_kg) || 0),
      0
    );

  // Rough estimate: ~40% of green waste converts to compost
  const estimatedCompost = Math.round(totalWeight * 0.4);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compost Inventory"
        description="Track processed waste and estimated compost output"
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Batches"
          value={pickups.length}
          icon={Recycle}
        />
        <StatCard
          title="Total Waste (kg)"
          value={totalWeight}
          icon={Weight}
        />
        <StatCard
          title="Monthly Intake (kg)"
          value={monthlyWeight}
          icon={TrendingUp}
        />
        <StatCard
          title="Est. Compost (kg)"
          value={estimatedCompost}
          icon={Leaf}
          description="~40% conversion rate"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Processed Batches</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {pickups.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={Leaf}
                title="No processed batches"
                description="Batches will appear here once deliveries are confirmed and processed."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pickup #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Weight (kg)</TableHead>
                  <TableHead>Est. Compost (kg)</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pickups.map((p) => {
                  const weight = Number(p.actual_weight_kg) || Number(p.estimated_weight_kg) || 0;
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <Link
                          href={`/dashboard/farmer/deliveries/${p.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {p.pickup_number}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {new Date(p.scheduled_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{weight}</TableCell>
                      <TableCell>{Math.round(weight * 0.4)}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={PICKUP_STATUS_COLORS[p.status]}
                        >
                          {PICKUP_STATUS_LABELS[p.status]}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
