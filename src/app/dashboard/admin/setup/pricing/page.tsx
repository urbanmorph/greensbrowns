import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { IndianRupee } from "lucide-react";

// TODO: Build pickup pricing configuration page
export default function AdminSetupPricingPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Pickup Pricing"
        description="Configure pricing rules for pickup services"
      />
      <EmptyState
        icon={IndianRupee}
        title="Pickup pricing configuration coming soon"
        description="This page will allow you to set up and manage pricing rules for different pickup types, weight tiers, and zones."
      />
    </div>
  );
}
