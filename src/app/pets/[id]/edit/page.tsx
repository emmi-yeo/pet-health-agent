"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Nav } from "@/components/nav";
import { PetForm, PetFormData } from "@/components/pet-form";
import { PhotoUpload } from "@/components/photo-upload";
import { Pet } from "@/lib/types";
import { ArrowLeft } from "lucide-react";

export default function EditPetPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [pet, setPet] = useState<Pet | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [userEmail, setUserEmail] = useState<string | undefined>();
  const [userName, setUserName] = useState<string | undefined>();

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth"); return; }
      setUserEmail(user.email);
      setUserName(user.user_metadata?.full_name);

      const { data, error } = await supabase
        .from("pets")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (error || !data) {
        router.push("/dashboard");
        return;
      }
      setPet(data);
      setLoading(false);
    }
    load();
  }, [id, router]);

  async function handleSubmit(data: PetFormData) {
    setSaving(true);
    setError("");

    const supabase = createClient();
    const { error } = await supabase
      .from("pets")
      .update({
        name: data.name,
        species: data.species,
        breed: data.breed ?? null,
        age_years: data.age_years ?? null,
        birthday: data.birthday ?? null,
        weight_kg: data.weight_kg ?? null,
        color: data.color ?? null,
        microchip_id: data.microchip_id ?? null,
      })
      .eq("id", id);

    if (error) {
      setError(error.message);
      setSaving(false);
    } else {
      router.push(`/pets/${id}`);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Nav userEmail={userEmail} userName={userName} />
        <div className="max-w-xl mx-auto px-6 py-10">
          <div className="h-64 bg-white rounded-2xl border border-gray-100 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav userEmail={userEmail} userName={userName} />

      <main className="max-w-xl mx-auto px-6 py-10">
        <Link
          href={`/pets/${id}`}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to {pet?.name}
        </Link>

        <div className="bg-white rounded-2xl border border-gray-100 p-8">
          <h1 className="text-xl font-bold text-gray-900 mb-1">Edit pet profile</h1>
          <p className="text-gray-500 text-sm mb-8">
            Update {pet?.name}&apos;s information.
          </p>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2 mb-4">{error}</p>
          )}

          {pet && (
            <>
              <div className="mb-6 pb-6 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-700 mb-3">Profile photo</p>
                <PhotoUpload
                  petId={id}
                  currentPhotoUrl={pet.photo_url}
                  petName={pet.name}
                />
              </div>
              <PetForm
                initialData={pet}
                onSubmit={handleSubmit}
                submitLabel="Save changes"
                loading={saving}
              />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
