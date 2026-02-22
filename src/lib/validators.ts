import { z } from "zod";

export const registerSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["bwg", "collector", "farmer"]),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const schedulePickupSchema = z.object({
  organization_id: z.string().uuid(),
  scheduled_date: z.string(),
  scheduled_slot: z.string().optional(),
  recurrence: z.enum(["one_time", "weekly", "biweekly", "monthly"]),
  estimated_weight_kg: z.number().positive().optional(),
  notes: z.string().optional(),
});
