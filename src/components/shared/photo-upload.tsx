"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Camera, Upload, X } from "lucide-react";
import { toast } from "sonner";

interface PhotoUploadProps {
  pickupId: string;
  type: "before" | "after";
  existingUrl?: string | null;
  onUploaded: (url: string) => void;
  disabled?: boolean;
}

export function PhotoUpload({
  pickupId,
  type,
  existingUrl,
  onUploaded,
  disabled,
}: PhotoUploadProps) {
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const displayUrl = preview || existingUrl;

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    uploadFile(file);
  }

  async function uploadFile(file: File) {
    setUploading(true);
    const path = `pickup-photos/${pickupId}/${type}.jpg`;

    const { error } = await supabase.storage
      .from("pickup-photos")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (error) {
      toast.error(`Failed to upload photo: ${error.message}`);
      setPreview(null);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("pickup-photos")
      .getPublicUrl(path);

    const url = urlData.publicUrl;
    onUploaded(url);
    toast.success(`${type === "before" ? "Before" : "After"} photo uploaded`);
    setUploading(false);
  }

  function handleClear() {
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium capitalize">{type} Photo</p>
      {displayUrl ? (
        <div className="relative w-40">
          <img
            src={displayUrl}
            alt={`${type} photo`}
            className="h-32 w-40 rounded-md border object-cover"
          />
          {!disabled && (
            <Button
              type="button"
              size="icon"
              variant="destructive"
              className="absolute -right-2 -top-2 h-6 w-6"
              onClick={handleClear}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      ) : null}
      {!disabled && (
        <>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? (
              <>
                <Upload className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : displayUrl ? (
              <>
                <Camera className="mr-2 h-4 w-4" />
                Replace
              </>
            ) : (
              <>
                <Camera className="mr-2 h-4 w-4" />
                Take / Upload Photo
              </>
            )}
          </Button>
        </>
      )}
    </div>
  );
}
