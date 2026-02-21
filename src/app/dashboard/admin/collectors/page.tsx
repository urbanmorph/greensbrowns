import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Truck } from "lucide-react";

// TODO: Build full collector management page
export default function AdminCollectorsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Collectors"
        description="Manage registered waste collectors"
      />
      <EmptyState
        icon={Truck}
        title="Collector management coming soon"
        description="This page will allow you to view, approve, and manage all registered collectors on the platform."
      />
    </div>
  );
}
