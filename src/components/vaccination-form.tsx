"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, ShieldCheck, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Vaccination {
  id: string;
  vaccine_name: string;
  administered_date: string;
  next_due_date?: string;
  lot_number?: string;
  notes?: string;
}

interface Props {
  petId: string;
  initial?: Vaccination[];
  canAdd?: boolean;
}

export function VaccinationForm({ petId, initial = [], canAdd = true }: Props) {
  const [vaccinations, setVaccinations] = useState<Vaccination[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [vaccineName, setVaccineName] = useState("");
  const [administeredDate, setAdministeredDate] = useState(new Date().toISOString().split("T")[0]);
  const [nextDueDate, setNextDueDate] = useState("");
  const [lotNumber, setLotNumber] = useState("");
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
        `${process.env.NEXT_PUBLIC_API_URL}/api/pets/${petId}/vaccinations`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            vaccine_name: vaccineName,
            administered_date: administeredDate,
            next_due_date: nextDueDate || null,
            lot_number: lotNumber || null,
            notes: notes || null,
          }),
        }
      );
      if (!res.ok) throw new Error(await res.text());
      const vacc = await res.json();
      setVaccinations((prev) => [vacc, ...prev]);
      setVaccineName("");
      setAdministeredDate(new Date().toISOString().split("T")[0]);
      setNextDueDate("");
      setLotNumber("");
      setNotes("");
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    const token = await getToken();
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pets/${petId}/vaccinations/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setVaccinations((prev) => prev.filter((v) => v.id !== id));
  }

  const today = new Date().toISOString().split("T")[0];
  const overdue = vaccinations.filter((v) => v.next_due_date && v.next_due_date < today);
  const dueSoon = vaccinations.filter((v) => {
    if (!v.next_due_date || v.next_due_date < today) return false;
    const due = new Date(v.next_due_date + "T00:00:00");
    const diff = (due.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return diff <= 14;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{vaccinations.length} vaccine record{vaccinations.length !== 1 ? "s" : ""}</p>
        {canAdd && (
          <Button size="sm" onClick={() => setShowForm(!showForm)} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm">
            <Plus className="w-3.5 h-3.5" />
            Add vaccine
          </Button>
        )}
      </div>

      {overdue.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700">
            <strong>{overdue.length} vaccination{overdue.length > 1 ? "s" : ""} overdue.</strong> Check with your vet.
          </p>
        </div>
      )}
      {dueSoon.length > 0 && overdue.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-700">
            <strong>{dueSoon.length} vaccination{dueSoon.length > 1 ? "s" : ""} due soon.</strong>
          </p>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleAdd} className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-200">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="vacc-name">Vaccine name *</Label>
              <Input id="vacc-name" placeholder="e.g. Rabies, DHPP, Bordetella" value={vaccineName} onChange={(e) => setVaccineName(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vacc-date">Date administered *</Label>
              <Input id="vacc-date" type="date" value={administeredDate} onChange={(e) => setAdministeredDate(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vacc-due">Next due date</Label>
              <Input id="vacc-due" type="date" value={nextDueDate} onChange={(e) => setNextDueDate(e.target.value)} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="vacc-lot">Lot number (optional)</Label>
              <Input id="vacc-lot" placeholder="Vaccine lot/batch number" value={lotNumber} onChange={(e) => setLotNumber(e.target.value)} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="vacc-notes">Notes (optional)</Label>
              <Textarea id="vacc-notes" placeholder="Clinic, vet name, reactions..." rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">{saving ? "Saving..." : "Save"}</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </form>
      )}

      {vaccinations.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <ShieldCheck className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No vaccination records yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {vaccinations.map((v) => {
            const isOverdue = v.next_due_date && v.next_due_date < today;
            const isDueSoon = v.next_due_date && v.next_due_date >= today && (() => {
              const diff = (new Date(v.next_due_date + "T00:00:00").getTime() - Date.now()) / (1000 * 60 * 60 * 24);
              return diff <= 14;
            })();
            return (
              <div key={v.id} className="flex items-start gap-3 bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${isOverdue ? "bg-red-50" : "bg-emerald-50"}`}>
                  <ShieldCheck className={`w-4 h-4 ${isOverdue ? "text-red-500" : "text-emerald-600"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-gray-900">{v.vaccine_name}</p>
                    {isOverdue && <Badge className="bg-red-50 text-red-600 border-red-200 text-xs">Overdue</Badge>}
                    {isDueSoon && !isOverdue && <Badge className="bg-amber-50 text-amber-600 border-amber-200 text-xs">Due soon</Badge>}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Given: {new Date(v.administered_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    {v.next_due_date && ` · Next: ${new Date(v.next_due_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
                  </p>
                  {v.notes && <p className="text-xs text-gray-400 mt-0.5">{v.notes}</p>}
                </div>
                <button onClick={() => handleDelete(v.id)} className="p-1 text-gray-300 hover:text-red-400 transition-colors shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
