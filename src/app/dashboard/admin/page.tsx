"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/shared/stat-card";
import { DashboardSkeleton } from "@/components/shared/loading-skeleton";
import { PICKUP_STATUS_LABELS, PICKUP_STATUS_COLORS } from "@/lib/constants";
import { Users, Truck, Building2, BarChart3 } from "lucide-react";

interface RecentPickup {
  id: string;
  pickup_number: string | null;
  status: string;
  scheduled_date: string;
  organizations: { name: string } | null;
}

export default function AdminDashboard() {
  const supabase = createClient();
  const [stats, setStats] = useState({
    totalUsers: 0,
    activePickups: 0,
    organizations: 0,
    monthlyPickups: 0,
  });
  const [recentPickups, setRecentPickups] = useState<RecentPickup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      // Users count
      const { count: userCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Active pickups
      const { count: activeCount } = await supabase
        .from("pickups")
        .select("*", { count: "exact", head: true })
        .not("status", "in", '("processed","cancelled")');

      // Orgs count
      const { count: orgCount } = await supabase
        .from("organizations")
        .select("*", { count: "exact", head: true });

      // Monthly pickups (this month)
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const { count: monthlyCount } = await supabase
        .from("pickups")
        .select("*", { count: "exact", head: true })
        .gte("created_at", startOfMonth.toISOString());

      setStats({
        totalUsers: userCount || 0,
        activePickups: activeCount || 0,
        organizations: orgCount || 0,
        monthlyPickups: monthlyCount || 0,
      });

      // Recent pickups
      const { data: pickups } = await supabase
        .from("pickups")
        .select("id, pickup_number, status, scheduled_date, organizations(name)")
        .order("created_at", { ascending: false })
        .limit(5);

      if (pickups) setRecentPickups(pickups as unknown as RecentPickup[]);
      setLoading(false);
    }
    fetchData();
  }, [supabase]);

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Users" value={stats.totalUsers} icon={Users} />
        <StatCard
          title="Active Pickups"
          value={stats.activePickups}
          icon={Truck}
        />
        <StatCard
          title="Organizations"
          value={stats.organizations}
          icon={Building2}
        />
        <StatCard
          title="Monthly Pickups"
          value={stats.monthlyPickups}
          icon={BarChart3}
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Recent Pickups</CardTitle>
        </CardHeader>
        <CardContent>
          {recentPickups.length === 0 ? (
            <p className="text-muted-foreground">No pickups yet.</p>
          ) : (
            <div className="space-y-3">
              {recentPickups.map((pickup) => (
                <div
                  key={pickup.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">{pickup.pickup_number}</p>
                    <p className="text-sm text-muted-foreground">
                      {pickup.organizations?.name || "Unknown org"} &middot;{" "}
                      {new Date(pickup.scheduled_date).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className={PICKUP_STATUS_COLORS[pickup.status]}
                  >
                    {PICKUP_STATUS_LABELS[pickup.status]}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
