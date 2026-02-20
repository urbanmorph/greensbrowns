import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function OrganizationPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Organization</h1>
      <Card>
        <CardHeader>
          <CardTitle>Organization Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Organization management will be implemented here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
