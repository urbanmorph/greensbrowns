"use client";

import { useUser } from "./use-user";
import type { UserRole } from "@/types/enums";

export function useRole() {
  const { profile, loading } = useUser();
  const role = profile?.role as UserRole | undefined;

  function hasRole(requiredRole: UserRole): boolean {
    return role === requiredRole;
  }

  function isAdmin(): boolean {
    return role === "admin";
  }

  return { role, loading, hasRole, isAdmin };
}
