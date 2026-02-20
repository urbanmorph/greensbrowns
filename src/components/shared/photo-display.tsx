"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageIcon } from "lucide-react";

interface PhotoDisplayProps {
  beforeUrl?: string | null;
  afterUrl?: string | null;
}

export function PhotoDisplay({ beforeUrl, afterUrl }: PhotoDisplayProps) {
  if (!beforeUrl && !afterUrl) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Pickup Photos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Before</p>
            {beforeUrl ? (
              <img
                src={beforeUrl}
                alt="Before pickup"
                className="h-48 w-full rounded-md border object-cover"
              />
            ) : (
              <div className="flex h-48 items-center justify-center rounded-md border border-dashed">
                <p className="text-sm text-muted-foreground">No photo</p>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">After</p>
            {afterUrl ? (
              <img
                src={afterUrl}
                alt="After delivery"
                className="h-48 w-full rounded-md border object-cover"
              />
            ) : (
              <div className="flex h-48 items-center justify-center rounded-md border border-dashed">
                <p className="text-sm text-muted-foreground">No photo</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
