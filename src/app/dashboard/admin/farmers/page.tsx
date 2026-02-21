import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Sprout } from "lucide-react";

// TODO: Build full farmer management page
export default function AdminFarmersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Farmers"
        description="Manage registered farmers and compost producers"
      />
      <EmptyState
        icon={Sprout}
        title="Farmer management coming soon"
        description="This page will allow you to view, approve, and manage all registered farmers on the platform."
      />
    </div>
  );
}
