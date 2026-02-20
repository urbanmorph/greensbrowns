import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CompliancePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Compliance Documents</h1>
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">No compliance documents yet.</p>
        </CardContent>
      </Card>
    </div>
  );
}
