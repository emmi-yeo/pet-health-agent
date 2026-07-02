"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pill } from "lucide-react";

interface Props {
  petId: string;
}

export function PrescribeForm({ petId }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [dose, setDose] = useState("");
  const [frequency, setFrequency] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function getToken() {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess(false);
    try {
      const token = await getToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/vet/prescribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          pet_id: petId,
          name,
          dose: dose || null,
          frequency: frequency || null,
          start_date: startDate || null,
          end_date: endDate || null,
          notes: notes || null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setSuccess(true);
      setName("");
      setDose("");
      setFrequency("");
      setStartDate(new Date().toISOString().split("T")[0]);
      setEndDate("");
      setNotes("");
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    }
    setSaving(false);
  }

  return (
    <div>
      {success && (
        <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
          Medication prescribed and added to the patient&apos;s record.
        </div>
      )}

      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full flex items-center gap-2 p-3 rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-500 hover:border-blue-300 hover:text-blue-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Prescribe medication
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="bg-blue-50/50 rounded-xl p-4 space-y-3 border border-blue-100">
          <div className="flex items-center gap-2 mb-2">
            <Pill className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-blue-700">Prescribe medication</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="presc-name">Medication name *</Label>
              <Input id="presc-name" placeholder="e.g. Amoxicillin" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="presc-dose">Dose</Label>
              <Input id="presc-dose" placeholder="e.g. 250mg" value={dose} onChange={(e) => setDose(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="presc-freq">Frequency</Label>
              <Input id="presc-freq" placeholder="e.g. Twice daily" value={frequency} onChange={(e) => setFrequency(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="presc-start">Start date</Label>
              <Input id="presc-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="presc-end">End date</Label>
              <Input id="presc-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="presc-notes">Instructions / notes</Label>
              <Textarea id="presc-notes" placeholder="Dosing instructions, warnings..." rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">{saving ? "Saving..." : "Prescribe"}</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </form>
      )}
    </div>
  );
}
