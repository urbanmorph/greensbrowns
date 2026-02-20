"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { DashboardSkeleton } from "@/components/shared/loading-skeleton";
import { Building2, Pencil } from "lucide-react";
import { toast } from "sonner";
import type { Organization, OrgType } from "@/types";

export default function OrganizationPage() {
  const { user, loading: userLoading } = useUser();
  const supabase = createClient();
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const [name, setName] = useState("");
  const [orgType, setOrgType] = useState<OrgType>("apartment");
  const [address, setAddress] = useState("");
  const [pincode, setPincode] = useState("");

  useEffect(() => {
    if (!user) return;
    async function fetchOrg() {
      const { data: membership } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user!.id)
        .single();

      if (membership) {
        const { data } = await supabase
          .from("organizations")
          .select("*")
          .eq("id", membership.organization_id)
          .single();
        if (data) {
          setOrg(data as Organization);
          setName(data.name);
          setOrgType(data.org_type as OrgType);
          setAddress(data.address);
          setPincode(data.pincode || "");
        }
      }
      setLoading(false);
    }
    fetchOrg();
  }, [user, supabase]);

  if (userLoading || loading) return <DashboardSkeleton />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);

    if (org) {
      // Update existing org
      const { error } = await supabase
        .from("organizations")
        .update({ name, org_type: orgType, address, pincode })
        .eq("id", org.id);
      if (error) {
        toast.error("Failed to update organization");
      } else {
        setOrg({ ...org, name, org_type: orgType, address, pincode });
        setEditing(false);
        toast.success("Organization updated");
      }
    } else {
      // Create new org + membership
      const { data: newOrg, error: orgError } = await supabase
        .from("organizations")
        .insert({ name, org_type: orgType, address, pincode })
        .select()
        .single();

      if (orgError || !newOrg) {
        toast.error("Failed to create organization");
        setSaving(false);
        return;
      }

      const { error: memberError } = await supabase
        .from("organization_members")
        .insert({
          organization_id: newOrg.id,
          user_id: user.id,
          role: "admin",
        });

      if (memberError) {
        toast.error("Organization created but failed to add membership");
      } else {
        setOrg(newOrg as Organization);
        toast.success("Organization created!");
      }
    }
    setSaving(false);
  }

  const orgTypeLabels: Record<OrgType, string> = {
    apartment: "Apartment Complex",
    rwa: "Resident Welfare Association",
    techpark: "Tech Park",
  };

  // Show org details (read-only)
  if (org && !editing) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Organization"
          description="Your organization details"
          action={
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </Button>
          }
        />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {org.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Type</p>
              <p className="font-medium">{orgTypeLabels[org.org_type]}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Address</p>
              <p className="font-medium">{org.address}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pincode</p>
              <p className="font-medium">{org.pincode || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">City</p>
              <p className="font-medium">{org.city}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Create / Edit form
  return (
    <div className="space-y-6">
      <PageHeader
        title={org ? "Edit Organization" : "Create Organization"}
        description={
          org
            ? "Update your organization details"
            : "Set up your organization to start scheduling pickups"
        }
      />
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Organization Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Prestige Lakeside Habitat"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="orgType">Organization Type</Label>
              <Select
                value={orgType}
                onValueChange={(v) => setOrgType(v as OrgType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="apartment">Apartment Complex</SelectItem>
                  <SelectItem value="rwa">Resident Welfare Association</SelectItem>
                  <SelectItem value="techpark">Tech Park</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Full address"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pincode">Pincode</Label>
              <Input
                id="pincode"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                placeholder="560001"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : org ? "Update" : "Create Organization"}
              </Button>
              {org && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
