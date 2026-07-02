"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Stethoscope } from "lucide-react";

interface Visit {
  id: string;
  visit_date: string;
  vet_name?: string;
  clinic_name?: string;
  reason?: string;
  notes?: string;
}

interface Props {
  petId: string;
  initial?: Visit[];
}

export function VisitForm({ petId, initial = [] }: Props) {
  const [visits, setVisits] = useState<Visit[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split("T")[0]);
  const [vetName, setVetName] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function getToken() {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const token = await getToken();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/pets/${petId}/visits`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            visit_date: visitDate,
            vet_name: vetName || null,
            clinic_name: clinicName || null,
            reason: reason || null,
            notes: notes || null,
          }),
        }
      );
      if (!res.ok) throw new Error(await res.text());
      const visit = await res.json();
      setVisits((prev) => [visit, ...prev]);
      setVisitDate(new Date().toISOString().split("T")[0]);
      setVetName("");
      setClinicName("");
      setReason("");
      setNotes("");
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    const token = await getToken();
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pets/${petId}/visits/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setVisits((prev) => prev.filter((v) => v.id !== id));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{visits.length} visit{visits.length !== 1 ? "s" : ""} recorded</p>
        <Button size="sm" onClick={() => setShowForm(!showForm)} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm">
          <Plus className="w-3.5 h-3.5" />
          Log visit
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-200">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="visit-date">Visit date *</Label>
              <Input id="visit-date" type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="visit-reason">Reason</Label>
              <Input id="visit-reason" placeholder="Annual check-up, illness..." value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="visit-vet">Vet name</Label>
              <Input id="visit-vet" placeholder="Dr. Smith" value={vetName} onChange={(e) => setVetName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="visit-clinic">Clinic</Label>
              <Input id="visit-clinic" placeholder="City Vet Clinic" value={clinicName} onChange={(e) => setClinicName(e.target.value)} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="visit-notes">Notes / outcome</Label>
              <Textarea id="visit-notes" placeholder="Diagnosis, treatment, follow-up needed..." rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">{saving ? "Saving..." : "Save visit"}</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </form>
      )}

      {visits.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <Stethoscope className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No vet visits logged yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {visits.map((v) => (
            <div key={v.id} className="flex items-start gap-3 bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-4">
              <div className="w-9 h-9 bg-teal-50 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                <Stethoscope className="w-4 h-4 text-teal-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(v.visit_date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                  </p>
                  {v.reason && <span className="text-xs text-gray-500">{v.reason}</span>}
                </div>
                {(v.vet_name || v.clinic_name) && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {[v.vet_name, v.clinic_name].filter(Boolean).join(" · ")}
                  </p>
                )}
                {v.notes && <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">{v.notes}</p>}
              </div>
              <button onClick={() => handleDelete(v.id)} className="p-1 text-gray-300 hover:text-red-400 transition-colors shrink-0">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
