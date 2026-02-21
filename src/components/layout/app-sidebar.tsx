"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { NAV_ITEMS, ROLES } from "@/lib/constants";
import { Lock } from "lucide-react";
import type { UserRole } from "@/types/enums";

const BWG_GATED = [
  "/dashboard/bwg/pickups",
  "/dashboard/bwg/prepaid",
  "/dashboard/bwg/compliance",
];

interface AppSidebarProps {
  role: UserRole;
  userName: string;
  hasOrg?: boolean;
}

export function AppSidebar({ role, userName, hasOrg = true }: AppSidebarProps) {
  const pathname = usePathname();
  const navItems = NAV_ITEMS[role];
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold">
            <span className="text-sidebar-primary">Greens</span>
            <span className="text-accent-yellow">Browns</span>
          </span>
        </Link>
        <p className="text-xs text-sidebar-foreground/70">
          {ROLES[role].label}
        </p>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isGated =
                  role === "bwg" &&
                  !hasOrg &&
                  BWG_GATED.some((p) => item.href.startsWith(p));

                return (
                  <SidebarMenuItem key={item.href}>
                    {isGated ? (
                      <SidebarMenuButton
                        disabled
                        className="opacity-50 cursor-not-allowed"
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                        <Lock className="ml-auto h-3 w-3" />
                      </SidebarMenuButton>
                    ) : (
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === item.href}
                      >
                        <Link href={item.href}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-4">
        <Link href="/dashboard/profile" className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-xs">
              {initials || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-sidebar-foreground">
              {userName || "User"}
            </span>
            <span className="text-xs text-sidebar-foreground/70">
              View Profile
            </span>
          </div>
        </Link>
      </SidebarFooter>
    </Sidebar>
  );
}
