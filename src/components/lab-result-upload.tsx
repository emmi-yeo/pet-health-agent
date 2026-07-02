"use client";

import { useState, useRef } from "react";
import { FlaskConical, Upload, Trash2, FileText, Image, ExternalLink, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { LabResult } from "@/lib/types";

interface LabResultUploadProps {
  petId: string;
  initial?: LabResult[];
}

export function LabResultUpload({ petId, initial = [] }: LabResultUploadProps) {
  const [results, setResults] = useState<LabResult[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notes, setNotes] = useState("");
  const [testDate, setTestDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setError("");

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${petId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("lab-results")
        .upload(path, file, { upsert: false });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("lab-results").getPublicUrl(path);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pets/${petId}/lab-results`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          file_url: publicUrl,
          file_name: file.name,
          file_type: file.type,
          notes: notes || undefined,
          test_date: testDate || undefined,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const created: LabResult = await res.json();
      setResults((prev) => [created, ...prev]);
      setFile(null);
      setNotes("");
      setTestDate("");
      setShowForm(false);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(result: LabResult) {
    if (!confirm(`Delete "${result.file_name}"?`)) return;
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pets/${petId}/lab-results/${result.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    setResults((prev) => prev.filter((r) => r.id !== result.id));
  }

  function fileIcon(type: string) {
    if (type.startsWith("image/")) return <Image className="w-4 h-4 text-blue-500" />;
    return <FileText className="w-4 h-4 text-gray-400" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-indigo-500" />
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Lab Results & X-rays</h3>
        </div>
        <Button
          size="sm"
          onClick={() => setShowForm((v) => !v)}
          variant="outline"
          className="h-7 text-xs gap-1"
        >
          <Plus className="w-3 h-3" />
          Upload file
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleUpload} className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="lab-file" className="text-xs">File (PDF, image, or document)</Label>
            <input
              id="lab-file"
              ref={fileRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.tiff,.dcm"
              required
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="text-xs text-gray-600 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100"
            />
            <p className="text-xs text-gray-400">Max 20 MB. Supports PDF, JPEG, PNG, DICOM.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="lab-date" className="text-xs">Test date (optional)</Label>
              <Input id="lab-date" type="date" value={testDate} onChange={(e) => setTestDate(e.target.value)} className="h-8 text-xs" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lab-notes" className="text-xs">Notes (optional)</Label>
            <Input
              id="lab-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. CBC panel, annual bloodwork..."
              className="h-8 text-xs"
            />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={uploading || !file} className="bg-indigo-600 hover:bg-indigo-700 text-white h-8 text-xs gap-1.5">
              <Upload className="w-3 h-3" />
              {uploading ? "Uploading..." : "Upload"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)} className="h-8 text-xs">
              Cancel
            </Button>
          </div>
        </form>
      )}

      {results.length === 0 && !showForm && (
        <p className="text-xs text-gray-400 italic text-center py-4">
          No lab results uploaded yet.
        </p>
      )}

      {results.map((r) => (
        <div
          key={r.id}
          className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700"
        >
          {fileIcon(r.file_type)}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{r.file_name}</p>
            <p className="text-xs text-gray-400">
              {r.test_date && `${r.test_date} · `}
              {r.notes || "No notes"}
            </p>
          </div>
          <a
            href={r.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            title="Open file"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button
            onClick={() => handleDelete(r)}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
