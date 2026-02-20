import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SchedulePickupPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Schedule Pickup</h1>
      <Card>
        <CardHeader>
          <CardTitle>New Pickup Request</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Pickup scheduling form will be implemented here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
