"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Clock, Upload, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import type { KycStatus } from "@/types";

interface KycUploadFormProps {
  userId: string;
  currentStatus: KycStatus;
  kycNotes?: string | null;
  onStatusChange: (status: KycStatus) => void;
}

export function KycUploadForm({
  userId,
  currentStatus,
  kycNotes,
  onStatusChange,
}: KycUploadFormProps) {
  const supabase = createClient();
  const idProofRef = useRef<HTMLInputElement>(null);
  const addressProofRef = useRef<HTMLInputElement>(null);
  const [idProofFile, setIdProofFile] = useState<File | null>(null);
  const [addressProofFile, setAddressProofFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!idProofFile || !addressProofFile) {
      toast.error("Please select both ID proof and address proof");
      return;
    }

    setSubmitting(true);

    const uploads = [
      {
        file: idProofFile,
        path: `kyc-documents/${userId}/id-proof${getExtension(idProofFile.name)}`,
      },
      {
        file: addressProofFile,
        path: `kyc-documents/${userId}/address-proof${getExtension(addressProofFile.name)}`,
      },
    ];

    for (const { file, path } of uploads) {
      const { error } = await supabase.storage
        .from("kyc-documents")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (error) {
        toast.error(`Upload failed: ${error.message}`);
        setSubmitting(false);
        return;
      }
    }

    const { error } = await supabase
      .from("profiles")
      .update({ kyc_status: "submitted", kyc_notes: null })
      .eq("id", userId);

    if (error) {
      toast.error("Failed to update KYC status");
      setSubmitting(false);
      return;
    }

    toast.success("KYC documents submitted for review");
    onStatusChange("submitted");
    setIdProofFile(null);
    setAddressProofFile(null);
    setSubmitting(false);
  }

  if (currentStatus === "verified") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            KYC Verification
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Badge className="bg-green-100 text-green-800">Verified</Badge>
            <p className="text-sm text-muted-foreground">
              Your identity has been verified.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (currentStatus === "submitted") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            KYC Verification
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            <p className="text-sm text-muted-foreground">
              Your documents are under review. We&apos;ll notify you once verified.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isRejected = currentStatus === "rejected";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          KYC Verification
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isRejected && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <p className="text-sm font-medium text-red-800">
                Verification rejected
              </p>
            </div>
            {kycNotes && (
              <p className="mt-1 text-sm text-red-700">{kycNotes}</p>
            )}
          </div>
        )}

        <p className="text-sm text-muted-foreground">
          {isRejected
            ? "Please resubmit your documents."
            : "Upload your ID proof and address proof to get verified."}
        </p>

        <div className="space-y-2">
          <Label>ID Proof (Aadhaar / PAN / Voter ID)</Label>
          <input
            ref={idProofRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={(e) => setIdProofFile(e.target.files?.[0] ?? null)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => idProofRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
            {idProofFile ? idProofFile.name : "Select ID Proof"}
          </Button>
        </div>

        <div className="space-y-2">
          <Label>Address Proof (Utility bill / Bank statement)</Label>
          <input
            ref={addressProofRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={(e) => setAddressProofFile(e.target.files?.[0] ?? null)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addressProofRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
            {addressProofFile ? addressProofFile.name : "Select Address Proof"}
          </Button>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={submitting || !idProofFile || !addressProofFile}
        >
          {submitting
            ? "Submitting..."
            : isRejected
              ? "Resubmit Documents"
              : "Submit for Verification"}
        </Button>
      </CardContent>
    </Card>
  );
}

function getExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot >= 0 ? filename.slice(dot) : "";
}
