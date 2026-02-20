"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail } from "lucide-react";
import Link from "next/link";

function CheckEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "your email";

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Mail className="h-6 w-6 text-primary" />
        </div>
        <CardTitle>Check Your Email</CardTitle>
        <CardDescription>
          We&apos;ve sent a confirmation link to <strong>{email}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-center">
        <p className="text-sm text-muted-foreground">
          Click the link in the email to verify your account and get started.
          If you don&apos;t see it, check your spam folder.
        </p>
        <Link
          href="/login"
          className="inline-block text-sm text-primary underline-offset-4 hover:underline"
        >
          Back to Sign In
        </Link>
      </CardContent>
    </Card>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<div className="text-center text-muted-foreground">Loading...</div>}>
      <CheckEmailContent />
    </Suspense>
  );
}
