"use client";

import { useState } from "react";
import { Medication } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type MedicationFormData = Omit<Medication, "id" | "pet_id" | "user_id" | "created_at">;

interface MedicationFormProps {
  initialData?: Partial<Medication>;
  onSave: (data: MedicationFormData) => void;
  onCancel: () => void;
  loading?: boolean;
}

export function MedicationForm({ initialData, onSave, onCancel, loading }: MedicationFormProps) {
  const [form, setForm] = useState({
    name: initialData?.name ?? "",
    dose: initialData?.dose ?? "",
    frequency: initialData?.frequency ?? "",
    start_date: initialData?.start_date ?? "",
    end_date: initialData?.end_date ?? "",
    notes: initialData?.notes ?? "",
    active: initialData?.active ?? true,
  });

  function set(field: string, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      name: form.name,
      dose: form.dose || undefined,
      frequency: form.frequency || undefined,
      start_date: form.start_date || undefined,
      end_date: form.end_date || undefined,
      notes: form.notes || undefined,
      active: form.active,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="med-name">Medication name *</Label>
        <Input
          id="med-name"
          placeholder="e.g. Amoxicillin"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="med-dose">Dose</Label>
          <Input
            id="med-dose"
            placeholder="e.g. 250mg"
            value={form.dose}
            onChange={(e) => set("dose", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="med-frequency">Frequency</Label>
          <Input
            id="med-frequency"
            placeholder="e.g. twice daily"
            value={form.frequency}
            onChange={(e) => set("frequency", e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="med-start">Start date</Label>
          <Input
            id="med-start"
            type="date"
            value={form.start_date}
            onChange={(e) => set("start_date", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="med-end">End date</Label>
          <Input
            id="med-end"
            type="date"
            value={form.end_date}
            onChange={(e) => set("end_date", e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="med-notes">Notes</Label>
        <Textarea
          id="med-notes"
          placeholder="Additional instructions or notes..."
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          className="resize-none min-h-[80px] text-sm"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          disabled={loading || !form.name}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {loading ? "Saving..." : "Save medication"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
