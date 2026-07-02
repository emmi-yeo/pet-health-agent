"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Camera, Loader2, X } from "lucide-react";

interface Props {
  petId: string;
  currentPhotoUrl?: string | null;
  petName: string;
  onUploaded?: (url: string) => void;
}

export function PhotoUpload({ petId, currentPhotoUrl, petName, onUploaded }: Props) {
  const [preview, setPreview] = useState<string | null>(currentPhotoUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5 MB.");
      return;
    }

    setUploading(true);
    setError("");

    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${petId}/avatar.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("pet-photos")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadErr) throw uploadErr;

      const { data } = supabase.storage.from("pet-photos").getPublicUrl(path);
      const publicUrl = `${data.publicUrl}?t=${Date.now()}`;

      // Update pet record
      await supabase.from("pets").update({ photo_url: publicUrl }).eq("id", petId);

      setPreview(publicUrl);
      onUploaded?.(publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    }
    setUploading(false);
  }

  async function handleRemove() {
    setUploading(true);
    const supabase = createClient();
    await supabase.from("pets").update({ photo_url: null }).eq("id", petId);
    setPreview(null);
    onUploaded?.("");
    setUploading(false);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-emerald-50 to-teal-50 border border-gray-100 flex items-center justify-center">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt={petName} className="w-full h-full object-cover" />
            ) : (
              <Camera className="w-8 h-8 text-gray-300" />
            )}
          </div>
          {uploading && (
            <div className="absolute inset-0 bg-white/70 rounded-2xl flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="text-sm text-emerald-600 hover:text-emerald-700 font-medium transition-colors disabled:opacity-50"
          >
            {preview ? "Change photo" : "Upload photo"}
          </button>
          {preview && (
            <div>
              <button
                type="button"
                onClick={handleRemove}
                disabled={uploading}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1 disabled:opacity-50"
              >
                <X className="w-3 h-3" /> Remove
              </button>
            </div>
          )}
          <p className="text-xs text-gray-400">JPG, PNG or WebP · max 5 MB</p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFile}
        className="hidden"
      />

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
