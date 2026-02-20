export type UserRole = "bwg" | "collector" | "farmer" | "admin";

export type KycStatus = "pending" | "submitted" | "verified" | "rejected";

export type OrgType = "apartment" | "rwa" | "techpark";

export type PickupStatus =
  | "scheduled"
  | "assigned"
  | "picked_up"
  | "in_transit"
  | "delivered"
  | "processed"
  | "cancelled";

export type RecurrenceType = "one_time" | "weekly" | "biweekly" | "monthly";

export type PaymentStatus = "pending" | "paid" | "overdue" | "cancelled";

export type ComplianceDocType =
  | "manifest"
  | "receipt"
  | "certificate"
  | "report";

export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";

export type VehicleType = "auto" | "mini_truck" | "truck" | "tempo";
