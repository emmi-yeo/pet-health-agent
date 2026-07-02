"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Nav } from "@/components/nav";
import { PetForm, PetFormData } from "@/components/pet-form";
import { ArrowLeft, PawPrint } from "lucide-react";

export default function NewPetPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push("/auth");
    });
  }, [router]);

  async function handleSubmit(data: PetFormData) {
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth"); return; }

    const { data: pet, error: err } = await supabase.from("pets").insert({
      user_id: user.id,
      name: data.name,
      species: data.species.toLowerCase(),
      breed: data.breed || null,
      age_years: data.age_years ?? null,
      birthday: data.birthday || null,
      weight_kg: data.weight_kg ?? null,
      color: data.color || null,
      microchip_id: data.microchip_id || null,
    }).select().single();

    if (err) {
      setError(err.message);
      setLoading(false);
    } else {
      router.push(`/pets/${pet.id}`);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
      <Nav />
      <main className="max-w-lg mx-auto px-6 py-10">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to dashboard
        </Link>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-8 py-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <PawPrint className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Add a pet</h1>
                <p className="text-emerald-100 text-sm">Create a health profile</p>
              </div>
            </div>
          </div>

          <div className="p-8">
            {error && (
              <div className="mb-6 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                {error}
              </div>
            )}
            <PetForm onSubmit={handleSubmit} submitLabel="Create pet profile" loading={loading} />
          </div>
        </div>
      </main>
    </div>
  );
}
