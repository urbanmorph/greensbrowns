"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/shared/stat-card";
import { DashboardSkeleton } from "@/components/shared/loading-skeleton";
import { PICKUP_STATUS_LABELS, PICKUP_STATUS_COLORS } from "@/lib/constants";
import { Truck, Leaf, TrendingUp, Package } from "lucide-react";
import Link from "next/link";

interface DeliveryPickup {
  id: string;
  pickup_number: string | null;
  status: string;
  scheduled_date: string;
  actual_weight_kg: number | null;
  estimated_weight_kg: number | null;
}

export default function FarmerDashboard() {
  const { user, loading: userLoading } = useUser();
  const supabase = createClient();
  const [stats, setStats] = useState({
    incoming: 0,
    processed: 0,
    monthlyReceived: 0,
    totalWeight: 0,
  });
  const [recentDeliveries, setRecentDeliveries] = useState<DeliveryPickup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    async function fetchData() {
      const { data: deliveries } = await supabase
        .from("pickups")
        .select("id, pickup_number, status, scheduled_date, actual_weight_kg, estimated_weight_kg")
        .eq("farmer_id", user!.id)
        .order("scheduled_date", { ascending: false });

      if (deliveries) {
        const incoming = deliveries.filter((d) =>
          ["assigned", "picked_up", "in_transit", "delivered"].includes(d.status)
        ).length;
        const processed = deliveries.filter(
          (d) => d.status === "processed"
        ).length;

        // Monthly received
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        const monthlyReceived = deliveries.filter(
          (d) =>
            d.status === "processed" &&
            new Date(d.scheduled_date) >= startOfMonth
        ).length;

        const totalWeight = deliveries.reduce(
          (sum, d) => sum + (Number(d.actual_weight_kg) || Number(d.estimated_weight_kg) || 0),
          0
        );

        setStats({ incoming, processed, monthlyReceived, totalWeight });
        setRecentDeliveries(
          (deliveries as DeliveryPickup[])
            .filter((d) => d.status !== "cancelled")
            .slice(0, 5)
        );
      }
      setLoading(false);
    }
    fetchData();
  }, [user, supabase]);

  if (userLoading || loading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Farmer Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Incoming Deliveries" value={stats.incoming} icon={Truck} />
        <StatCard title="Processed" value={stats.processed} icon={Leaf} />
        <StatCard
          title="Monthly Received"
          value={stats.monthlyReceived}
          icon={TrendingUp}
        />
        <StatCard
          title="Total Weight (kg)"
          value={stats.totalWeight}
          icon={Package}
        />
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Deliveries</CardTitle>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/farmer/deliveries">View All</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentDeliveries.length === 0 ? (
            <p className="text-muted-foreground">No deliveries yet.</p>
          ) : (
            <div className="space-y-3">
              {recentDeliveries.map((delivery) => (
                <Link
                  key={delivery.id}
                  href={`/dashboard/farmer/deliveries/${delivery.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50"
                >
                  <div>
                    <p className="font-medium">{delivery.pickup_number}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(delivery.scheduled_date).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className={PICKUP_STATUS_COLORS[delivery.status]}
                  >
                    {PICKUP_STATUS_LABELS[delivery.status]}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
