"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Package } from "lucide-react";
import Link from "next/link";

interface JobPickup {
  id: string;
  pickup_number: string | null;
  status: string;
  scheduled_date: string;
  scheduled_slot: string | null;
  estimated_weight_kg: number | null;
  organizations: { name: string } | null;
}

export default function CollectorJobsPage() {
  const { user, loading: userLoading } = useUser();
  const supabase = createClient();
  const [jobs, setJobs] = useState<JobPickup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    async function fetchJobs() {
      const { data } = await supabase
        .from("pickups")
        .select("id, pickup_number, status, scheduled_date, scheduled_slot, estimated_weight_kg, organizations(name)")
        .eq("collector_id", user!.id)
        .order("scheduled_date", { ascending: false });

      if (data) setJobs(data as unknown as JobPickup[]);
      setLoading(false);
    }
    fetchJobs();
  }, [user, supabase]);

  if (userLoading || loading) return <DashboardSkeleton />;

  const assigned = jobs.filter((j) => j.status === "assigned");
  const inProgress = jobs.filter((j) =>
    ["picked_up", "in_transit"].includes(j.status)
  );
  const completed = jobs.filter((j) =>
    ["delivered", "processed"].includes(j.status)
  );

  function JobTable({ items }: { items: JobPickup[] }) {
    if (items.length === 0) {
      return (
        <EmptyState
          icon={Package}
          title="No jobs"
          description="No jobs in this category."
        />
      );
    }
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Pickup #</TableHead>
            <TableHead>Organization</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Est. Weight</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((job) => (
            <TableRow key={job.id}>
              <TableCell>
                <Link
                  href={`/dashboard/collector/jobs/${job.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {job.pickup_number}
                </Link>
              </TableCell>
              <TableCell>{job.organizations?.name || "—"}</TableCell>
              <TableCell>
                {new Date(job.scheduled_date).toLocaleDateString()}
              </TableCell>
              <TableCell>
                {job.estimated_weight_kg
                  ? `${job.estimated_weight_kg} kg`
                  : "—"}
              </TableCell>
              <TableCell>
                <Badge
                  variant="secondary"
                  className={PICKUP_STATUS_COLORS[job.status]}
                >
                  {PICKUP_STATUS_LABELS[job.status]}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="My Jobs" description="Pickup jobs assigned to you" />

      <Tabs defaultValue="assigned">
        <TabsList>
          <TabsTrigger value="assigned">
            Assigned ({assigned.length})
          </TabsTrigger>
          <TabsTrigger value="in_progress">
            In Progress ({inProgress.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completed.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="assigned">
          <Card>
            <CardContent className="p-0">
              <JobTable items={assigned} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="in_progress">
          <Card>
            <CardContent className="p-0">
              <JobTable items={inProgress} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="completed">
          <Card>
            <CardContent className="p-0">
              <JobTable items={completed} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
