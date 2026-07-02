"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Calendar } from "lucide-react";

interface Appointment {
  id: string;
  scheduled_at: string;
  notes?: string;
  status: string;
}

interface Props {
  petId: string;
  initial?: Appointment[];
}

export function AppointmentForm({ petId, initial = [] }: Props) {
  const [appointments, setAppointments] = useState<Appointment[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
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
        `${process.env.NEXT_PUBLIC_API_URL}/api/pets/${petId}/appointments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ scheduled_at: scheduledAt, notes, status: "upcoming" }),
        }
      );
      if (!res.ok) throw new Error(await res.text());
      const appt = await res.json();
      setAppointments((prev) => [...prev, appt].sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at)));
      setScheduledAt("");
      setNotes("");
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    const token = await getToken();
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pets/${petId}/appointments/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setAppointments((prev) => prev.filter((a) => a.id !== id));
  }

  const upcoming = appointments.filter((a) => a.status === "upcoming" && new Date(a.scheduled_at) >= new Date());
  const past = appointments.filter((a) => a.status !== "upcoming" || new Date(a.scheduled_at) < new Date());

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{upcoming.length} upcoming appointment{upcoming.length !== 1 ? "s" : ""}</p>
        <Button size="sm" onClick={() => setShowForm(!showForm)} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm">
          <Plus className="w-3.5 h-3.5" />
          Schedule
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-200">
          <div className="space-y-1.5">
            <Label htmlFor="appt-date">Date & time</Label>
            <Input
              id="appt-date"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="appt-notes">Notes (optional)</Label>
            <Textarea
              id="appt-notes"
              placeholder="Reason for visit, vet name, clinic..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {saving ? "Saving..." : "Save"}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </form>
      )}

      {appointments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No appointments scheduled.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {upcoming.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-2">Upcoming</p>
              {upcoming.map((appt) => (
                <AppointmentRow key={appt.id} appt={appt} onDelete={handleDelete} />
              ))}
            </div>
          )}
          {past.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mt-4 mb-2">Past</p>
              {past.map((appt) => (
                <AppointmentRow key={appt.id} appt={appt} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AppointmentRow({ appt, onDelete }: { appt: Appointment; onDelete: (id: string) => void }) {
  const dt = new Date(appt.scheduled_at);
  const isPast = dt < new Date();
  return (
    <div className={`flex items-center gap-3 bg-white rounded-xl border shadow-sm px-4 py-3 mb-2 ${isPast ? "border-gray-100 opacity-60" : "border-emerald-100"}`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isPast ? "bg-gray-50" : "bg-emerald-50"}`}>
        <Calendar className={`w-4 h-4 ${isPast ? "text-gray-400" : "text-emerald-600"}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">
          {dt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
          {" · "}
          {dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
        </p>
        {appt.notes && <p className="text-xs text-gray-500 truncate mt-0.5">{appt.notes}</p>}
      </div>
      <button onClick={() => onDelete(appt.id)} className="p-1 text-gray-300 hover:text-red-400 transition-colors shrink-0">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
