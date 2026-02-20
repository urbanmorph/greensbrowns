import { z } from "zod";

export const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{9,14}$/, "Invalid phone number");

export const otpSchema = z
  .string()
  .regex(/^\d{6}$/, "OTP must be 6 digits");

export const registerSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: phoneSchema,
  role: z.enum(["bwg", "collector", "farmer", "admin"]),
});

export const schedulePickupSchema = z.object({
  organization_id: z.string().uuid(),
  scheduled_date: z.string(),
  scheduled_slot: z.string().optional(),
  recurrence: z.enum(["one_time", "weekly", "biweekly", "monthly"]),
  estimated_weight_kg: z.number().positive().optional(),
  notes: z.string().optional(),
});
