"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Nav } from "@/components/nav";
import { MedicationForm } from "@/components/medication-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Medication } from "@/lib/types";
import { ArrowLeft, Pill, Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Sparkles, AlertCircle } from "lucide-react";

type MedicationFormData = Omit<Medication, "id" | "pet_id" | "user_id" | "created_at">;

export default function MedicationsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [medications, setMedications] = useState<Medication[]>([]);
  const [petName, setPetName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingMed, setEditingMed] = useState<Medication | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | undefined>();
  const [userName, setUserName] = useState<string | undefined>();
  const [interactions, setInteractions] = useState<{ interactions: Array<{drugs: string[]; severity: string; description: string}>; summary: string } | null>(null);
  const [checkingInteractions, setCheckingInteractions] = useState(false);

  const fetchData = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth"); return; }
    setUserId(user.id);
    setUserEmail(user.email);
    setUserName(user.user_metadata?.full_name);

    const [petResult, medsResult] = await Promise.all([
      supabase.from("pets").select("name").eq("id", id).eq("user_id", user.id).single(),
      supabase.from("medications").select("*").eq("pet_id", id).order("created_at", { ascending: false }),
    ]);

    if (!petResult.data) { router.push("/dashboard"); return; }
    setPetName(petResult.data.name);
    setMedications(medsResult.data ?? []);
    setLoading(false);
  }, [id, router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const today = new Date().toISOString().split("T")[0];

  const activeMeds = medications.filter(
    (m) => m.active && (!m.end_date || m.end_date >= today)
  );
  const pastMeds = medications.filter(
    (m) => !m.active || (m.end_date && m.end_date < today)
  );

  async function handleSave(data: MedicationFormData) {
    if (!userId) return;
    setSaving(true);
    const supabase = createClient();

    if (editingMed) {
      await supabase
        .from("medications")
        .update(data)
        .eq("id", editingMed.id);
    } else {
      await supabase.from("medications").insert({
        ...data,
        pet_id: id,
        user_id: userId,
      });
    }

    setShowForm(false);
    setEditingMed(null);
    setSaving(false);
    await fetchData();
  }

  async function handleDelete(medId: string) {
    if (!confirm("Delete this medication?")) return;
    const supabase = createClient();
    await supabase.from("medications").delete().eq("id", medId);
    await fetchData();
  }

  async function handleToggleActive(med: Medication) {
    const supabase = createClient();
    await supabase
      .from("medications")
      .update({ active: !med.active })
      .eq("id", med.id);
    await fetchData();
  }

  function startEdit(med: Medication) {
    setEditingMed(med);
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingMed(null);
  }

  async function handleCheckInteractions() {
    setCheckingInteractions(true);
    setInteractions(null);
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pets/${id}/medications/interactions`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const data = await res.json();
      setInteractions(data);
    } catch {
      setInteractions({ interactions: [], summary: "Failed to check interactions. Please try again." });
    }
    setCheckingInteractions(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Nav userEmail={userEmail} userName={userName} />
        <div className="max-w-3xl mx-auto px-6 py-10">
          <div className="h-8 w-48 bg-gray-100 rounded-lg animate-pulse mb-4" />
          <div className="h-32 bg-white rounded-2xl border border-gray-100 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav userEmail={userEmail} userName={userName} />

      <main className="max-w-3xl mx-auto px-6 py-10">
        <Link
          href={`/pets/${id}`}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to {petName}
        </Link>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Medications</h1>
            <p className="text-gray-500 mt-1">{petName}&apos;s medication history</p>
          </div>
          {!showForm && (
            <Button
              onClick={() => { setEditingMed(null); setShowForm(true); }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            >
              <Plus className="w-4 h-4" />
              Add medication
            </Button>
          )}
        </div>

        {/* Add / Edit form */}
        {showForm && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-8">
            <h2 className="font-semibold text-gray-900 mb-6">
              {editingMed ? "Edit medication" : "Add medication"}
            </h2>
            <MedicationForm
              initialData={editingMed ?? undefined}
              onSave={handleSave}
              onCancel={cancelForm}
              loading={saving}
            />
          </div>
        )}

        {/* Active medications */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Active medications ({activeMeds.length})
          </h2>
          {activeMeds.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
              <Pill className="w-8 h-8 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No active medications.</p>
              {!showForm && (
                <button
                  onClick={() => setShowForm(true)}
                  className="mt-3 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  Add one
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {activeMeds.map((med) => (
                <MedicationRow
                  key={med.id}
                  med={med}
                  onEdit={startEdit}
                  onDelete={handleDelete}
                  onToggle={handleToggleActive}
                />
              ))}
            </div>
          )}
        </section>

        {/* Interaction checker */}
        {activeMeds.length >= 2 && (
          <section className="mb-8">
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-violet-50 rounded-lg flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-violet-600" />
                  </div>
                  <h2 className="font-semibold text-gray-900">AI Interaction Check</h2>
                </div>
                <Button
                  size="sm"
                  onClick={handleCheckInteractions}
                  disabled={checkingInteractions}
                  className="bg-violet-600 hover:bg-violet-700 text-white gap-1.5"
                >
                  {checkingInteractions ? "Checking..." : "Check interactions"}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mb-3">AI-powered check for potential drug interactions across {activeMeds.length} active medications. Not a substitute for veterinary advice.</p>

              {interactions && (
                <div className="mt-3 space-y-3">
                  <div className="p-3 bg-gray-50 rounded-xl text-sm text-gray-700 leading-relaxed">
                    {interactions.summary}
                  </div>
                  {(interactions.interactions || []).map((item, i) => (
                    <div key={i} className={`p-3 rounded-xl border text-sm ${
                      item.severity === "high" ? "bg-red-50 border-red-200" :
                      item.severity === "medium" ? "bg-amber-50 border-amber-200" :
                      "bg-blue-50 border-blue-200"
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <AlertCircle className={`w-3.5 h-3.5 shrink-0 ${
                          item.severity === "high" ? "text-red-500" :
                          item.severity === "medium" ? "text-amber-500" : "text-blue-500"
                        }`} />
                        <span className="font-medium text-gray-900">{item.drugs.join(" + ")}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full capitalize ${
                          item.severity === "high" ? "bg-red-100 text-red-700" :
                          item.severity === "medium" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                        }`}>{item.severity}</span>
                      </div>
                      <p className="text-gray-600">{item.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Past medications */}
        {pastMeds.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Past medications ({pastMeds.length})
            </h2>
            <div className="space-y-3">
              {pastMeds.map((med) => (
                <MedicationRow
                  key={med.id}
                  med={med}
                  onEdit={startEdit}
                  onDelete={handleDelete}
                  onToggle={handleToggleActive}
                  faded
                />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function MedicationRow({
  med,
  onEdit,
  onDelete,
  onToggle,
  faded,
}: {
  med: Medication;
  onEdit: (m: Medication) => void;
  onDelete: (id: string) => void;
  onToggle: (m: Medication) => void;
  faded?: boolean;
}) {
  return (
    <div
      className={`bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4 ${
        faded ? "opacity-60" : ""
      }`}
    >
      <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
        <Pill className="w-5 h-5 text-blue-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="font-medium text-gray-900">{med.name}</p>
          {med.active ? (
            <Badge className="bg-emerald-50 text-emerald-600 border-emerald-200 text-xs">Active</Badge>
          ) : (
            <Badge className="bg-gray-50 text-gray-500 border-gray-200 text-xs">Inactive</Badge>
          )}
        </div>
        <p className="text-sm text-gray-500">
          {med.dose && `${med.dose}`}{med.dose && med.frequency && " · "}{med.frequency}
        </p>
        {(med.start_date || med.end_date) && (
          <p className="text-xs text-gray-400 mt-1">
            {med.start_date && `From ${new Date(med.start_date + "T00:00:00").toLocaleDateString()}`}
            {med.start_date && med.end_date && " — "}
            {med.end_date && `Until ${new Date(med.end_date + "T00:00:00").toLocaleDateString()}`}
          </p>
        )}
        {med.notes && (
          <p className="text-xs text-gray-400 mt-1 truncate">{med.notes}</p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => onToggle(med)}
          className="text-gray-400 hover:text-emerald-600 transition-colors"
          title={med.active ? "Mark inactive" : "Mark active"}
        >
          {med.active ? (
            <ToggleRight className="w-5 h-5" />
          ) : (
            <ToggleLeft className="w-5 h-5" />
          )}
        </button>
        <button
          onClick={() => onEdit(med)}
          className="text-gray-400 hover:text-gray-700 transition-colors"
          title="Edit"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDelete(med.id)}
          className="text-gray-400 hover:text-red-500 transition-colors"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
