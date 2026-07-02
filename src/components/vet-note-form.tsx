"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";

interface VetNoteFormProps {
  petId: string;
  vetId: string;
  logId?: string;
  onSaved?: () => void;
}

const NOTE_TYPES = [
  { value: "observation", label: "Observation" },
  { value: "diagnosis", label: "Diagnosis" },
  { value: "treatment", label: "Treatment" },
  { value: "followup", label: "Follow-up" },
];

export function VetNoteForm({ petId, vetId, logId, onSaved }: VetNoteFormProps) {
  const [expanded, setExpanded] = useState(false);
  const [content, setContent] = useState("");
  const [noteType, setNoteType] = useState("observation");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    setSaving(true);
    setError("");

    const supabase = createClient();
    const { error } = await supabase.from("vet_notes").insert({
      pet_id: petId,
      vet_id: vetId,
      log_id: logId ?? null,
      content,
      note_type: noteType,
    });

    if (error) {
      setError(error.message);
      setSaving(false);
    } else {
      setContent("");
      setNoteType("observation");
      setExpanded(false);
      onSaved?.();
    }
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 font-medium mt-3 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        Add clinical note
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 p-4 bg-emerald-50 border border-emerald-100 rounded-xl space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-gray-700">Note type</Label>
        <select
          value={noteType}
          onChange={(e) => setNoteType(e.target.value)}
          className="flex h-8 w-full rounded-lg border border-input bg-white px-2.5 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {NOTE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-gray-700">Clinical note *</Label>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Enter your clinical observation, diagnosis, or treatment notes..."
          className="resize-none min-h-[80px] text-sm bg-white"
          required
        />
      </div>

      {error && (
        <p className="text-xs text-red-500 bg-red-50 rounded px-2 py-1">{error}</p>
      )}

      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={saving || !content.trim()}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 px-3"
        >
          {saving ? "Saving..." : "Save note"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => { setExpanded(false); setContent(""); setError(""); }}
          disabled={saving}
          className="text-xs h-8 px-3 text-gray-500"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
