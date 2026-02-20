import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";

export default function BwgPickupsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pickups</h1>
        <Button asChild>
          <Link href="/dashboard/bwg/pickups/new">
            <Plus className="mr-2 h-4 w-4" /> Schedule Pickup
          </Link>
        </Button>
      </div>
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">No pickups found. Schedule your first pickup.</p>
        </CardContent>
      </Card>
    </div>
  );
}
