import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Severity = "critical" | "warning" | "info";

interface AlertCardProps {
  title: string;
  count: number;
  icon: LucideIcon;
  href: string;
  severity: Severity;
}

const SEVERITY_STYLES: Record<Severity, string> = {
  critical: "border-l-4 border-l-red-500",
  warning: "border-l-4 border-l-amber-500",
  info: "border-l-4 border-l-blue-500",
};

const SEVERITY_ICON_COLORS: Record<Severity, string> = {
  critical: "text-red-500",
  warning: "text-amber-500",
  info: "text-blue-500",
};

export function AlertCard({ title, count, icon: Icon, href, severity }: AlertCardProps) {
  return (
    <Link href={href}>
      <Card className={`hover:shadow-md transition-shadow ${SEVERITY_STYLES[severity]}`}>
        <CardContent className="flex items-center gap-3 py-3 px-4">
          <Icon className={`h-5 w-5 shrink-0 ${SEVERITY_ICON_COLORS[severity]}`} />
          <div className="flex-1 min-w-0">
            <p className="text-2xl font-bold leading-tight">{count}</p>
            <p className="text-sm text-muted-foreground truncate">{title}</p>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </CardContent>
      </Card>
    </Link>
  );
}
