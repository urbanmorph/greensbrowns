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
import { Truck, Clock, CheckCircle, Package } from "lucide-react";
import Link from "next/link";

interface JobPickup {
  id: string;
  pickup_number: string | null;
  status: string;
  scheduled_date: string;
  organizations: { name: string } | null;
}

export default function CollectorDashboard() {
  const { user, loading: userLoading } = useUser();
  const supabase = createClient();
  const [stats, setStats] = useState({
    todayJobs: 0,
    pending: 0,
    completed: 0,
    totalJobs: 0,
  });
  const [upcomingJobs, setUpcomingJobs] = useState<JobPickup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    async function fetchData() {
      const { data: jobs } = await supabase
        .from("pickups")
        .select("id, pickup_number, status, scheduled_date, organizations(name)")
        .eq("collector_id", user!.id)
        .order("scheduled_date", { ascending: false });

      if (jobs) {
        const today = new Date().toISOString().split("T")[0];
        const todayJobs = jobs.filter((j) => j.scheduled_date === today).length;
        const pending = jobs.filter((j) =>
          ["assigned", "picked_up", "in_transit"].includes(j.status)
        ).length;
        const completed = jobs.filter((j) =>
          ["delivered", "processed"].includes(j.status)
        ).length;

        setStats({
          todayJobs,
          pending,
          completed,
          totalJobs: jobs.length,
        });

        // Show upcoming assigned/in-progress jobs
        setUpcomingJobs(
          (jobs as unknown as JobPickup[])
            .filter((j) => ["assigned", "picked_up", "in_transit"].includes(j.status))
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
      <h1 className="text-2xl font-bold">Collector Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Today's Jobs" value={stats.todayJobs} icon={Truck} />
        <StatCard title="Pending" value={stats.pending} icon={Clock} />
        <StatCard title="Completed" value={stats.completed} icon={CheckCircle} />
        <StatCard title="Total Jobs" value={stats.totalJobs} icon={Package} />
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Upcoming Jobs</CardTitle>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/collector/jobs">View All</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {upcomingJobs.length === 0 ? (
            <p className="text-muted-foreground">No pending jobs.</p>
          ) : (
            <div className="space-y-3">
              {upcomingJobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/dashboard/collector/jobs/${job.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50"
                >
                  <div>
                    <p className="font-medium">{job.pickup_number}</p>
                    <p className="text-sm text-muted-foreground">
                      {job.organizations?.name || "Unknown"} &middot;{" "}
                      {new Date(job.scheduled_date).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className={PICKUP_STATUS_COLORS[job.status]}
                  >
                    {PICKUP_STATUS_LABELS[job.status]}
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
