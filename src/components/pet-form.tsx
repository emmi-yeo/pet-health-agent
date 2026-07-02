"use client";

import { useState } from "react";
import { Pet } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type PetFormData = {
  name: string;
  species: string;
  breed?: string;
  age_years?: number;
  birthday?: string;
  weight_kg?: number;
  color?: string;
  microchip_id?: string;
};

const SPECIES = ["Dog", "Cat", "Rabbit", "Bird", "Fish", "Hamster", "Turtle", "Other"];

interface PetFormProps {
  initialData?: Partial<Pet>;
  onSubmit: (data: PetFormData) => void;
  submitLabel: string;
  loading?: boolean;
}

export function PetForm({ initialData, onSubmit, submitLabel, loading }: PetFormProps) {
  const [form, setForm] = useState({
    name: initialData?.name ?? "",
    species: initialData?.species ?? "",
    breed: initialData?.breed ?? "",
    age_years: initialData?.age_years?.toString() ?? "",
    birthday: initialData?.birthday ?? "",
    weight_kg: initialData?.weight_kg?.toString() ?? "",
    color: initialData?.color ?? "",
    microchip_id: initialData?.microchip_id ?? "",
  });

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      name: form.name,
      species: form.species.toLowerCase(),
      breed: form.breed || undefined,
      age_years: form.age_years ? parseFloat(form.age_years) : undefined,
      birthday: form.birthday || undefined,
      weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : undefined,
      color: form.color || undefined,
      microchip_id: form.microchip_id || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name + Species */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-gray-700 font-medium">Name <span className="text-emerald-500">*</span></Label>
          <Input id="name" placeholder="Bella" value={form.name}
            onChange={(e) => set("name", e.target.value)} required
            className="h-10 border-gray-200 focus:border-emerald-400 focus:ring-emerald-400/20" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="species" className="text-gray-700 font-medium">Species <span className="text-emerald-500">*</span></Label>
          <select
            id="species"
            value={form.species}
            onChange={(e) => set("species", e.target.value)}
            required
            className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm transition-colors focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
          >
            <option value="">Select species</option>
            {SPECIES.map((s) => (
              <option key={s} value={s.toLowerCase()}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Breed */}
      <div className="space-y-1.5">
        <Label htmlFor="breed" className="text-gray-700 font-medium">Breed <span className="text-gray-400 font-normal text-xs">(optional)</span></Label>
        <Input id="breed" placeholder="Golden Retriever" value={form.breed}
          onChange={(e) => set("breed", e.target.value)}
          className="h-10 border-gray-200 focus:border-emerald-400 focus:ring-emerald-400/20" />
      </div>

      {/* Birthday + Age */}
      <div className="space-y-2">
        <Label className="text-gray-700 font-medium">Age</Label>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="birthday" className="text-xs text-gray-500 font-normal">Birthday <span className="text-gray-400">(optional)</span></Label>
            <Input id="birthday" type="date" value={form.birthday}
              onChange={(e) => set("birthday", e.target.value)}
              className="h-10 border-gray-200 focus:border-emerald-400 focus:ring-emerald-400/20" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="age" className="text-xs text-gray-500 font-normal">Age in years <span className="text-gray-400">(optional)</span></Label>
            <Input id="age" type="number" step="0.5" min="0" placeholder="3"
              value={form.age_years} onChange={(e) => set("age_years", e.target.value)}
              className="h-10 border-gray-200 focus:border-emerald-400 focus:ring-emerald-400/20" />
          </div>
        </div>
        <p className="text-xs text-gray-400">Set birthday for automatic age tracking, or enter age directly.</p>
      </div>

      {/* Weight */}
      <div className="space-y-1.5">
        <Label htmlFor="weight" className="text-gray-700 font-medium">Weight (kg) <span className="text-gray-400 font-normal text-xs">(optional)</span></Label>
        <Input id="weight" type="number" step="0.1" min="0" placeholder="12.5"
          value={form.weight_kg} onChange={(e) => set("weight_kg", e.target.value)}
          className="h-10 border-gray-200 focus:border-emerald-400 focus:ring-emerald-400/20" />
      </div>

      {/* Color + Microchip */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="color" className="text-gray-700 font-medium">Color / markings <span className="text-gray-400 font-normal text-xs">(optional)</span></Label>
          <Input id="color" placeholder="Golden" value={form.color}
            onChange={(e) => set("color", e.target.value)}
            className="h-10 border-gray-200 focus:border-emerald-400 focus:ring-emerald-400/20" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="microchip" className="text-gray-700 font-medium">Microchip ID <span className="text-gray-400 font-normal text-xs">(optional)</span></Label>
          <Input id="microchip" placeholder="985141001234567" value={form.microchip_id}
            onChange={(e) => set("microchip_id", e.target.value)}
            className="h-10 border-gray-200 focus:border-emerald-400 focus:ring-emerald-400/20" />
        </div>
      </div>

      <Button
        type="submit"
        disabled={loading || !form.name || !form.species}
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-11 font-medium shadow-sm"
      >
        {loading ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
