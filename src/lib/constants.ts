import {
  Home,
  Truck,
  Building2,
  FileText,
  Users,
  BarChart3,
  Package,
  Leaf,
  Wrench,
  ShieldCheck,
  CreditCard,
  type LucideIcon,
} from "lucide-react";
import type { UserRole, PrepaidPackageStatus } from "@/types/enums";

export const APP_NAME = "GreensBrowns";
export const APP_DESCRIPTION =
  "Digital circular marketplace for leafy & horticulture waste";

export const ROLES: Record<UserRole, { label: string; description: string }> = {
  bwg: {
    label: "Bulk Waste Generator",
    description: "Apartments, RWAs, Tech Parks",
  },
  collector: {
    label: "Collector",
    description: "Licensed waste collectors",
  },
  farmer: {
    label: "Farmer",
    description: "Compost & organic farming",
  },
  admin: {
    label: "Admin",
    description: "Platform administration",
  },
};

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: Record<UserRole, NavItem[]> = {
  bwg: [
    { title: "Dashboard", href: "/dashboard/bwg", icon: Home },
    { title: "Pickups", href: "/dashboard/bwg/pickups", icon: Truck },
    { title: "Organization", href: "/dashboard/bwg/organization", icon: Building2 },
    { title: "Compliance", href: "/dashboard/bwg/compliance", icon: FileText },
    { title: "Prepaid", href: "/dashboard/bwg/prepaid", icon: CreditCard },
  ],
  collector: [
    { title: "Dashboard", href: "/dashboard/collector", icon: Home },
    { title: "Jobs", href: "/dashboard/collector/jobs", icon: Package },
    { title: "Vehicles", href: "/dashboard/collector/vehicles", icon: Truck },
  ],
  farmer: [
    { title: "Dashboard", href: "/dashboard/farmer", icon: Home },
    { title: "Deliveries", href: "/dashboard/farmer/deliveries", icon: Truck },
    { title: "Compost", href: "/dashboard/farmer/compost", icon: Leaf },
  ],
  admin: [
    { title: "Dashboard", href: "/dashboard/admin", icon: Home },
    { title: "Users", href: "/dashboard/admin/users", icon: Users },
    { title: "Pickups", href: "/dashboard/admin/pickups", icon: Truck },
    { title: "Organizations", href: "/dashboard/admin/organizations", icon: Building2 },
    { title: "Prepaid", href: "/dashboard/admin/prepaid", icon: CreditCard },
    { title: "Reports", href: "/dashboard/admin/reports", icon: BarChart3 },
  ],
};

export const PICKUP_STATUS_LABELS: Record<string, string> = {
  requested: "Requested",
  assigned: "Assigned",
  picked_up: "Picked Up",
  in_transit: "In Transit",
  delivered: "Delivered",
  processed: "Processed",
  cancelled: "Cancelled",
};

export const PICKUP_STATUS_COLORS: Record<string, string> = {
  requested: "bg-blue-100 text-blue-800",
  assigned: "bg-yellow-100 text-yellow-800",
  picked_up: "bg-orange-100 text-orange-800",
  in_transit: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  processed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-red-100 text-red-800",
};

export const PREPAID_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  approved: "Active",
  rejected: "Rejected",
  expired: "Expired",
};

export const PREPAID_STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  expired: "bg-gray-100 text-gray-800",
};
