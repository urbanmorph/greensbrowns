import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PICKUP_STATUS_LABELS, PICKUP_STATUS_COLORS } from "@/lib/constants";
import type { Pickup } from "@/types";

interface PickupDetailCardProps {
  pickup: Pickup;
  vehicleRegNumber: string | null;
  farmerName: string | null;
  orgName?: string | null;
}

export function PickupDetailCard({
  pickup,
  vehicleRegNumber,
  farmerName,
  orgName,
}: PickupDetailCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Details</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Status</span>
          <Badge
            variant="secondary"
            className={PICKUP_STATUS_COLORS[pickup.status]}
          >
            {PICKUP_STATUS_LABELS[pickup.status]}
          </Badge>
        </div>
        {orgName !== undefined && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Organization</span>
            <span>{orgName || "—"}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-muted-foreground">Scheduled Date</span>
          <span>{new Date(pickup.scheduled_date).toLocaleDateString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Time Slot</span>
          <span className="capitalize">{pickup.scheduled_slot || "—"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Estimated Weight</span>
          <span>
            {pickup.estimated_weight_kg
              ? `${(Number(pickup.estimated_weight_kg) / 1000).toFixed(2)} tonnes`
              : "—"}
          </span>
        </div>
        {pickup.actual_weight_kg && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Actual Weight</span>
            <span>{(Number(pickup.actual_weight_kg) / 1000).toFixed(2)} tonnes</span>
          </div>
        )}
        {pickup.loading_helper_required !== undefined && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Loading Helper</span>
            <span>{pickup.loading_helper_required ? "Required" : "Not needed"}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-muted-foreground">Vehicle</span>
          <span>{vehicleRegNumber || "Not assigned"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Farmer</span>
          <span>{farmerName || "Not assigned"}</span>
        </div>
        {pickup.notes && (
          <div>
            <span className="text-muted-foreground">Notes</span>
            <p className="mt-1 text-sm">{pickup.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
