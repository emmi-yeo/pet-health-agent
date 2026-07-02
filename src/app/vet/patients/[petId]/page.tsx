import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/profile";
import { Nav } from "@/components/nav";
import { Badge } from "@/components/ui/badge";
import { VetNoteForm } from "@/components/vet-note-form";
import { VaccinationForm } from "@/components/vaccination-form";
import { PrescribeForm } from "@/components/prescribe-form";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, Calendar, Scale, Pill, User, Cake, Stethoscope, ShieldCheck } from "lucide-react";

function severityColor(severity?: string) {
  if (severity === "high") return "bg-red-50 text-red-600 border-red-200";
  if (severity === "medium") return "bg-amber-50 text-amber-600 border-amber-200";
  return "bg-blue-50 text-blue-600 border-blue-200";
}

function speciesEmoji(species: string) {
  const map: Record<string, string> = {
    dog: "🐶", cat: "🐱", rabbit: "🐰", bird: "🐦",
    fish: "🐟", hamster: "🐹", turtle: "🐢", other: "🐾",
  };
  return map[species?.toLowerCase()] ?? "🐾";
}

function ageFromBirthday(birthday: string): string {
  const birth = new Date(birthday);
  const now = new Date();
  const years = now.getFullYear() - birth.getFullYear();
  const months = now.getMonth() - birth.getMonth();
  const total = months < 0 ? years - 1 : years;
  if (total < 1) {
    const m = ((years * 12) + months + 12) % 12 || months + 12;
    return `${m}mo`;
  }
  return `${total}yr`;
}

export default async function VetPatientPage({ params }: { params: Promise<{ petId: string }> }) {
  const { petId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth");

  const role = await getUserRole(supabase, user.id);
  if (role !== "vet") redirect("/dashboard");

  // Verify vet has accepted share for this pet
  const { data: shares } = await supabase
    .from("pet_shares")
    .select("id, owner_id")
    .eq("pet_id", petId)
    .eq("vet_id", user.id)
    .eq("status", "accepted")
    .limit(1);

  if (!shares?.length) notFound();

  const ownerId = shares[0].owner_id;

  const [
    { data: pet },
    { data: logs },
    { data: medications },
    { data: vetNotes },
    { data: profile },
    { data: ownerProfile },
    { data: appointments },
    { data: vaccinations },
  ] = await Promise.all([
    supabase.from("pets").select("*").eq("id", petId).maybeSingle(),
    supabase.from("health_logs").select("*").eq("pet_id", petId)
      .order("logged_at", { ascending: false }).limit(30),
    supabase.from("medications").select("*").eq("pet_id", petId)
      .order("created_at", { ascending: false }),
    supabase.from("vet_notes").select("*, profiles(full_name)")
      .eq("pet_id", petId).order("created_at", { ascending: false }),
    supabase.from("profiles").select("full_name, clinic_name").eq("id", user.id).maybeSingle(),
    supabase.from("profiles").select("full_name").eq("id", ownerId).maybeSingle(),
    supabase.from("appointments").select("*").eq("pet_id", petId).order("scheduled_at"),
    supabase.from("vaccinations").select("*").eq("pet_id", petId).order("administered_date", { ascending: false }),
  ]);

  if (!pet) notFound();

  const today = new Date().toISOString().split("T")[0];
  const activeMeds = (medications ?? []).filter(
    (m) => m.active && (!m.end_date || m.end_date >= today)
  );
  const flaggedLogs = (logs ?? []).filter((l) => l.flagged);

  const notesByLog: Record<string, NonNullable<typeof vetNotes>> = {};
  const unattachedNotes: NonNullable<typeof vetNotes> = [];
  for (const note of vetNotes ?? []) {
    if (note.log_id) {
      if (!notesByLog[note.log_id]) notesByLog[note.log_id] = [];
      notesByLog[note.log_id].push(note);
    } else {
      unattachedNotes.push(note);
    }
  }

  const displayAge = pet.birthday
    ? ageFromBirthday(pet.birthday)
    : pet.age_years ? `${pet.age_years}yr` : null;

  const birthdayFormatted = pet.birthday
    ? new Date(pet.birthday + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30">
      <Nav userEmail={user.email} userName={profile?.full_name} userRole="vet" />

      <main className="max-w-4xl mx-auto px-6 py-10">
        <Link href="/vet/dashboard" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          All patients
        </Link>

        {/* Pet header */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-teal-500 to-emerald-500 h-2" />
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-teal-50 to-emerald-50 rounded-2xl flex items-center justify-center text-4xl shrink-0">
                {speciesEmoji(pet.species)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">{pet.name}</h1>
                    <p className="text-gray-500 capitalize mt-0.5">{pet.breed || pet.species}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {flaggedLogs.length > 0 && (
                      <Badge className="bg-amber-50 text-amber-600 border-amber-200 text-xs">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        {flaggedLogs.length} flag{flaggedLogs.length > 1 ? "s" : ""}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4 mt-3">
                  {displayAge && (
                    <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                      <Calendar className="w-3 h-3" /> {displayAge}
                    </span>
                  )}
                  {birthdayFormatted && (
                    <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                      <Cake className="w-3 h-3" /> {birthdayFormatted}
                    </span>
                  )}
                  {pet.weight_kg && (
                    <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                      <Scale className="w-3 h-3" /> {pet.weight_kg} kg
                    </span>
                  )}
                  {ownerProfile?.full_name && (
                    <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                      <User className="w-3 h-3" /> Owner: {ownerProfile.full_name}
                    </span>
                  )}
                </div>
                {pet.microchip_id && (
                  <p className="mt-2 text-xs text-gray-400">Microchip: {pet.microchip_id}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "Total logs", value: logs?.length ?? 0, color: "text-teal-600 bg-teal-50" },
            { label: "Flagged", value: flaggedLogs.length, color: "text-amber-600 bg-amber-50" },
            { label: "Medications", value: activeMeds.length, color: "text-blue-600 bg-blue-50" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
              <p className={`text-2xl font-bold ${color.split(" ")[0]}`}>{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Active medications */}
        {activeMeds.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center">
                <Pill className="w-4 h-4 text-blue-500" />
              </div>
              Active medications
            </h2>
            <div className="space-y-2">
              {activeMeds.map((med) => (
                <div key={med.id} className="flex items-center gap-3 text-sm bg-blue-50/50 rounded-lg px-3 py-2">
                  <span className="font-medium text-gray-900">{med.name}</span>
                  {med.dose && <span className="text-gray-500">{med.dose}</span>}
                  {med.frequency && <span className="text-gray-400">· {med.frequency}</span>}
                  {med.end_date && (
                    <span className="text-xs text-gray-400 ml-auto">
                      Until {new Date(med.end_date + "T00:00:00").toLocaleDateString()}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming appointments */}
        {(appointments ?? []).filter((a) => new Date(a.scheduled_at) >= new Date()).length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <div className="w-7 h-7 bg-emerald-50 rounded-lg flex items-center justify-center">
                <Calendar className="w-4 h-4 text-emerald-600" />
              </div>
              Upcoming appointments
            </h2>
            <div className="space-y-2">
              {(appointments ?? [])
                .filter((a) => new Date(a.scheduled_at) >= new Date())
                .map((a) => (
                  <div key={a.id} className="flex items-center gap-3 text-sm bg-emerald-50/50 rounded-lg px-3 py-2">
                    <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-medium text-gray-900">
                      {new Date(a.scheduled_at).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                      {" · "}
                      {new Date(a.scheduled_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    </span>
                    {a.notes && <span className="text-gray-500 truncate">{a.notes}</span>}
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Vaccinations */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <div className="w-7 h-7 bg-emerald-50 rounded-lg flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
            Vaccination records
          </h2>
          <VaccinationForm petId={petId} initial={vaccinations ?? []} canAdd={true} />
        </div>

        {/* Prescribe medication */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center">
              <Pill className="w-4 h-4 text-blue-500" />
            </div>
            Prescribe medication
          </h2>
          <PrescribeForm petId={petId} />
        </div>

        {/* General vet notes */}
        {unattachedNotes.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <div className="w-7 h-7 bg-teal-50 rounded-lg flex items-center justify-center">
                <Stethoscope className="w-4 h-4 text-teal-600" />
              </div>
              General clinical notes
            </h2>
            <div className="space-y-3">
              {unattachedNotes.map((note) => <VetNoteCard key={note.id} note={note} />)}
            </div>
          </div>
        )}

        {/* Add general note */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <div className="w-7 h-7 bg-emerald-50 rounded-lg flex items-center justify-center">
              <Stethoscope className="w-4 h-4 text-emerald-600" />
            </div>
            Add clinical note
          </h2>
          <VetNoteForm petId={petId} vetId={user.id} />
        </div>

        {/* Health logs */}
        <div>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
            Health logs · last 30 entries
          </h2>
          {(!logs || logs.length === 0) ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
              <p className="text-gray-500 text-sm">No health logs recorded yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => {
                const logNotes = notesByLog[log.id] ?? [];
                return (
                  <div key={log.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-start justify-between mb-3">
                      <p className="text-xs text-gray-400 font-medium">
                        {new Date(log.logged_at).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                      </p>
                      <div className="flex items-center gap-2">
                        {log.extracted_mood && (
                          <Badge className="bg-gray-50 text-gray-600 border-gray-200 text-xs capitalize">{log.extracted_mood}</Badge>
                        )}
                        {log.flagged && (
                          <Badge className={`text-xs ${severityColor(log.severity)}`}>
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            {log.severity ?? "flagged"}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-700 text-sm mb-3 leading-relaxed">{log.raw_input}</p>
                    {log.extracted_symptoms?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {log.extracted_symptoms.map((s: string) => (
                          <span key={s} className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full px-2.5 py-0.5">{s}</span>
                        ))}
                      </div>
                    )}
                    {log.extracted_behaviors?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {log.extracted_behaviors.map((b: string) => (
                          <span key={b} className="text-xs bg-blue-50 text-blue-600 border border-blue-100 rounded-full px-2.5 py-0.5">{b}</span>
                        ))}
                      </div>
                    )}
                    {log.flag_reason && (
                      <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                        AI note: {log.flag_reason}
                      </p>
                    )}
                    {logNotes.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {logNotes.map((note) => <VetNoteCard key={note.id} note={note} />)}
                      </div>
                    )}
                    <VetNoteForm petId={petId} vetId={user.id} logId={log.id} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function VetNoteCard({ note }: { note: { id: string; content: string; note_type: string; created_at: string; profiles?: { full_name?: string } | null } }) {
  const colors: Record<string, string> = {
    observation: "bg-gray-50 text-gray-600 border-gray-200",
    diagnosis: "bg-purple-50 text-purple-600 border-purple-200",
    treatment: "bg-emerald-50 text-emerald-700 border-emerald-200",
    followup: "bg-blue-50 text-blue-600 border-blue-200",
  };
  return (
    <div className="p-3 bg-teal-50/50 border border-teal-100 rounded-xl">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <Badge className={`text-xs capitalize ${colors[note.note_type] ?? colors.observation}`}>
            {note.note_type}
          </Badge>
          {note.profiles?.full_name && (
            <span className="text-xs text-gray-400">by {note.profiles.full_name}</span>
          )}
        </div>
        <span className="text-xs text-gray-400">{new Date(note.created_at).toLocaleDateString()}</span>
      </div>
      <p className="text-sm text-gray-700 leading-relaxed">{note.content}</p>
    </div>
  );
}
