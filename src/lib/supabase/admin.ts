import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "./server";

export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/**
 * Verify the caller is an authenticated admin.
 * Returns the admin supabase client on success, or an error string.
 */
export async function verifyAdmin(): Promise<
  { admin: ReturnType<typeof createAdminClient>; error?: never } | { admin?: never; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return { error: "Not authorized" };

  return { admin: createAdminClient() };
}
