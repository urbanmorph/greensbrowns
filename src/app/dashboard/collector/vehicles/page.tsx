"use client";

import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { Truck } from "lucide-react";

export default function VehiclesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Vehicles"
        description="Vehicle management"
      />
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Truck className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">Managed by Operations</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Your vehicles are managed by the operations team. Contact admin if
            you need changes to your vehicle assignments.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
