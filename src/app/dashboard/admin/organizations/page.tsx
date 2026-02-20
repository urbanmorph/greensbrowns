import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminOrganizationsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Organizations</h1>
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Organization management will be implemented here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
