import {
  Home,
  Truck,
  Building2,
  FileText,
  Users,
  BarChart3,
  Sprout,
  Wrench,
  ShieldCheck,
  CreditCard,
  PackagePlus,
  IndianRupee,
  type LucideIcon,
} from "lucide-react";
import type { UserRole, KycStatus, PickupStatus, PrepaidPackageStatus, VehicleType, VehicleDocType, TripStatus } from "@/types/enums";

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

export interface NavGroup {
  group: string;
  items: NavItem[];
}

export const NAV_ITEMS: Record<"bwg", NavItem[]> = {
  bwg: [
    { title: "Dashboard", href: "/dashboard/bwg", icon: Home },
    { title: "Pickups", href: "/dashboard/bwg/pickups", icon: Truck },
    { title: "Organization", href: "/dashboard/bwg/organization", icon: Building2 },
    { title: "Compliance", href: "/dashboard/bwg/compliance", icon: FileText },
    { title: "Prepaid", href: "/dashboard/bwg/prepaid", icon: CreditCard },
  ],
};

export const COMPOST_TYPE_OPTIONS = [
  { value: "vermicompost", label: "Vermicompost" },
  { value: "aerobic_compost", label: "Aerobic Compost" },
  { value: "biochar", label: "Biochar" },
  { value: "mulch", label: "Mulch" },
  { value: "leaf_mold", label: "Leaf Mold" },
] as const;

export const ADMIN_NAV_GROUPS: NavGroup[] = [
  {
    group: "Operations",
    items: [
      { title: "Dashboard", href: "/dashboard/admin", icon: Home },
      { title: "Users", href: "/dashboard/admin/users", icon: Users },
      { title: "Pickups", href: "/dashboard/admin/pickups", icon: Truck },
      { title: "Organizations", href: "/dashboard/admin/organizations", icon: Building2 },
      { title: "Prepaid", href: "/dashboard/admin/prepaid", icon: CreditCard },
      { title: "Farmers", href: "/dashboard/admin/farmers", icon: Sprout },
      { title: "Reports", href: "/dashboard/admin/reports", icon: BarChart3 },
    ],
  },
  {
    group: "Setup",
    items: [
      { title: "Prepaid Packages", href: "/dashboard/admin/setup/prepaid-packages", icon: PackagePlus },
      { title: "Pickup Pricing", href: "/dashboard/admin/setup/pricing", icon: IndianRupee },
      { title: "Collector Vehicles", href: "/dashboard/admin/setup/collector-vehicles", icon: Truck },
    ],
  },
];

export const KYC_STATUS_COLORS: Record<KycStatus, string> = {
  pending: "bg-gray-100 text-gray-800",
  submitted: "bg-blue-100 text-blue-800",
  verified: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

export const PICKUP_STATUS_LABELS: Record<PickupStatus, string> = {
  requested: "Requested",
  assigned: "Assigned",
  picked_up: "Picked Up",
  in_transit: "In Transit",
  delivered: "Delivered",
  processed: "Processed",
  cancelled: "Cancelled",
};

export const PICKUP_STATUS_COLORS: Record<PickupStatus, string> = {
  requested: "bg-blue-100 text-blue-800",
  assigned: "bg-yellow-100 text-yellow-800",
  picked_up: "bg-orange-100 text-orange-800",
  in_transit: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  processed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-red-100 text-red-800",
};

export const PREPAID_STATUS_LABELS: Record<PrepaidPackageStatus, string> = {
  pending: "Pending",
  approved: "Active",
  rejected: "Rejected",
  expired: "Expired",
};

export const PREPAID_STATUS_COLORS: Record<PrepaidPackageStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  expired: "bg-gray-100 text-gray-800",
};

export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  trolley: "Trolley / Handcart",
  auto: "Auto (3-Wheeler)",
  mini_truck: "Mini Truck",
  pickup: "Pickup",
  tempo: "Tempo / LCV",
  tipper: "Tipper",
  light_truck: "Light Truck",
  medium_truck: "Medium Truck",
  truck: "Heavy Truck",
};

export const VEHICLE_TYPE_DETAILS: Record<VehicleType, { examples: string; capacity: number }> = {
  trolley: { examples: "BBMP handcart, fabricated steel push trolley", capacity: 300 },
  auto: { examples: "Piaggio Ape, Mahindra Treo Zor", capacity: 400 },
  mini_truck: { examples: "Tata Ace Gold, Mahindra Supro, Ashok Leyland Dost", capacity: 1000 },
  pickup: { examples: "Mahindra Bolero Pikup, Tata Yodha", capacity: 1500 },
  tempo: { examples: "Force Traveller, Tata Intra", capacity: 1500 },
  tipper: { examples: "Tata Ace Tipper, Mahindra Supro Tipper, Tata 407 Tipper", capacity: 2000 },
  light_truck: { examples: "Tata 407, Eicher Pro 2049", capacity: 3000 },
  medium_truck: { examples: "Tata 709, Ashok Leyland Ecomet", capacity: 6000 },
  truck: { examples: "Tata 1109, Ashok Leyland 1618", capacity: 10000 },
};

export const VEHICLE_DOC_LABELS: Record<VehicleDocType, string> = {
  rc: "Registration Certificate",
  insurance: "Insurance",
  tax_receipt: "Tax Paid Receipt",
  emission_cert: "Emission Certificate",
  fitness_cert: "Fitness Certificate",
};

export const TRIP_STATUS_LABELS: Record<TripStatus, string> = {
  in_transit: "In Transit",
  delivered: "Delivered",
};

export const TRIP_STATUS_COLORS: Record<TripStatus, string> = {
  in_transit: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
};
