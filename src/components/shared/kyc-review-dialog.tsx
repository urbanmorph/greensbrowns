"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, XCircle, FileText } from "lucide-react";
import { toast } from "sonner";
import type { Profile, KycStatus } from "@/types";

interface KycReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile;
  onReviewed: (profileId: string, status: KycStatus, notes: string | null) => void;
}

interface StorageFile {
  name: string;
  metadata?: { mimetype?: string };
}

export function KycReviewDialog({
  open,
  onOpenChange,
  profile,
  onReviewed,
}: KycReviewDialogProps) {
  const supabase = createClient();
  const [documents, setDocuments] = useState<
    { name: string; url: string; isImage: boolean }[]
  >([]);
  const [notes, setNotes] = useState(profile.kyc_notes || "");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNotes(profile.kyc_notes || "");
    loadDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, profile.id]);

  async function loadDocuments() {
    setLoading(true);
    const { data: files } = await supabase.storage
      .from("kyc-documents")
      .list(`kyc-documents/${profile.id}`);

    if (!files || files.length === 0) {
      // Try without nested prefix (storage bucket name is kyc-documents, path is userId/)
      const { data: files2 } = await supabase.storage
        .from("kyc-documents")
        .list(profile.id);

      if (files2 && files2.length > 0) {
        await processFiles(files2, profile.id);
      } else {
        setDocuments([]);
      }
      setLoading(false);
      return;
    }

    await processFiles(files, `kyc-documents/${profile.id}`);
    setLoading(false);
  }

  async function processFiles(files: StorageFile[], basePath: string) {
    const docs = await Promise.all(
      files
        .filter((f) => f.name !== ".emptyFolderPlaceholder")
        .map(async (file) => {
          const path = `${basePath}/${file.name}`;
          const { data } = await supabase.storage
            .from("kyc-documents")
            .createSignedUrl(path, 3600);

          const isImage =
            file.metadata?.mimetype?.startsWith("image/") ||
            /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name);

          return {
            name: file.name,
            url: data?.signedUrl || "",
            isImage: !!isImage,
          };
        })
    );
    setDocuments(docs.filter((d) => d.url));
  }

  async function handleDecision(status: "verified" | "rejected") {
    setSubmitting(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        kyc_status: status,
        kyc_notes: status === "rejected" ? notes || null : null,
      })
      .eq("id", profile.id);

    if (error) {
      toast.error("Failed to update KYC status");
      setSubmitting(false);
      return;
    }

    toast.success(
      status === "verified"
        ? `${profile.full_name || "User"} verified`
        : `${profile.full_name || "User"} rejected`
    );
    onReviewed(profile.id, status, status === "rejected" ? notes : null);
    onOpenChange(false);
    setSubmitting(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Review KYC — {profile.full_name || profile.email || profile.id}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <p className="text-sm font-medium">Uploaded Documents</p>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : documents.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No documents found.
              </p>
            ) : (
              <div className="mt-2 space-y-3">
                {documents.map((doc) =>
                  doc.isImage ? (
                    <div key={doc.name} className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">
                        {doc.name}
                      </p>
                      <img
                        src={doc.url}
                        alt={doc.name}
                        className="max-h-56 rounded-md border object-contain"
                      />
                    </div>
                  ) : (
                    <a
                      key={doc.name}
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-md border p-2 text-sm hover:bg-muted"
                    >
                      <FileText className="h-4 w-4" />
                      {doc.name}
                    </a>
                  )
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="kycNotes">Admin Notes</Label>
            <Textarea
              id="kycNotes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes (required for rejection)"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="destructive"
            onClick={() => handleDecision("rejected")}
            disabled={submitting}
          >
            <XCircle className="mr-2 h-4 w-4" />
            Reject
          </Button>
          <Button
            onClick={() => handleDecision("verified")}
            disabled={submitting}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
