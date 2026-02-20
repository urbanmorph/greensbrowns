import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck, Calendar, Weight, FileText } from "lucide-react";

export default function BwgDashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">BWG Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "Active Pickups", value: "—", icon: Truck },
          { title: "Scheduled", value: "—", icon: Calendar },
          { title: "Total Weight (kg)", value: "—", icon: Weight },
          { title: "Compliance Docs", value: "—", icon: FileText },
        ].map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Recent Pickups</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No pickups yet. Schedule your first pickup to get started.</p>
        </CardContent>
      </Card>
    </div>
  );
}
