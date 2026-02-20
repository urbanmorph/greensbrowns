import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        const role = profile?.role || "bwg";
        return NextResponse.redirect(`${origin}/dashboard/${role}`);
      }

      return NextResponse.redirect(`${origin}/dashboard`);
    }

    // PKCE code exchange can fail if the code_verifier cookie is missing
    // (e.g., user opened confirmation email in a different browser).
    // Redirect to login so they can sign in with their credentials.
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("Email confirmed! Please sign in with your credentials.")}`
    );
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
