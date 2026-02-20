export type { UserRole, KycStatus, OrgType, PickupStatus, RecurrenceType, PaymentStatus, ComplianceDocType, TicketStatus, VehicleType } from "./enums";

export interface Profile {
  id: string;
  role: import("./enums").UserRole;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
  kyc_status: import("./enums").KycStatus;
  kyc_notes: string | null;
  city: string;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  org_type: import("./enums").OrgType;
  address: string;
  ward: string | null;
  city: string;
  pincode: string;
  lat: number | null;
  lng: number | null;
  contact_name: string | null;
  contact_phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface Pickup {
  id: string;
  pickup_number: string;
  organization_id: string;
  requested_by: string;
  collector_id: string | null;
  farmer_id: string | null;
  vehicle_id: string | null;
  status: import("./enums").PickupStatus;
  scheduled_date: string;
  scheduled_slot: string | null;
  recurrence: import("./enums").RecurrenceType;
  estimated_weight_kg: number | null;
  actual_weight_kg: number | null;
  photo_before_url: string | null;
  photo_after_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PickupEvent {
  id: string;
  pickup_id: string;
  status: import("./enums").PickupStatus;
  changed_by: string;
  lat: number | null;
  lng: number | null;
  notes: string | null;
  created_at: string;
}

export interface Vehicle {
  id: string;
  owner_id: string;
  registration_number: string;
  vehicle_type: import("./enums").VehicleType;
  capacity_kg: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
