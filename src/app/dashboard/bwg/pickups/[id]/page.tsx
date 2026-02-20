import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function PickupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Pickup Details</h1>
      <Card>
        <CardHeader>
          <CardTitle>Pickup #{id}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Pickup detail view will be implemented here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
