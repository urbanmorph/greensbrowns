import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Truck, Building2, BarChart3 } from "lucide-react";

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "Total Users", value: "—", icon: Users },
          { title: "Active Pickups", value: "—", icon: Truck },
          { title: "Organizations", value: "—", icon: Building2 },
          { title: "Monthly Revenue", value: "—", icon: BarChart3 },
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
          <CardTitle>Platform Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Admin analytics and monitoring will be implemented here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
