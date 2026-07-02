import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Nav } from "@/components/nav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle, Plus, FileText, Pill,
  ArrowLeft, Scale, Calendar, Pencil, Share2, Stethoscope, Cake,
  QrCode, MessageSquare, ShieldCheck, FlaskConical,
} from "lucide-react";
import { DeleteLogButton } from "@/components/delete-log-button";
import { AppointmentForm } from "@/components/appointment-form";
import { VaccinationForm } from "@/components/vaccination-form";
import { VisitForm } from "@/components/visit-form";
import { WeightChart } from "@/components/weight-chart";
import { ExportButton } from "@/components/export-button";
import { LabResultUpload } from "@/components/lab-result-upload";

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

export default async function PetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth");

  const { data: pet } = await supabase
    .from("pets").select("*").eq("id", id).eq("user_id", user.id).single();

  if (!pet) notFound();

  const [
    { data: logs },
    { data: medications },
    { data: summaries },
    { data: vetNotes },
    { data: appointments },
    { data: visits },
    { data: vaccinations },
    { data: labResults },
  ] = await Promise.all([
    supabase.from("health_logs").select("*").eq("pet_id", id)
      .order("logged_at", { ascending: false }).limit(90),
    supabase.from("medications").select("*").eq("pet_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("vet_summaries").select("*").eq("pet_id", id)
      .order("generated_at", { ascending: false }).limit(5),
    supabase.from("vet_notes").select("*, profiles(full_name, clinic_name, verified)").eq("pet_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("appointments").select("*").eq("pet_id", id)
      .order("scheduled_at", { ascending: true }),
    supabase.from("vet_visits").select("*").eq("pet_id", id)
      .order("visit_date", { ascending: false }),
    supabase.from("vaccinations").select("*").eq("pet_id", id)
      .order("administered_date", { ascending: false }),
    supabase.from("lab_results").select("*").eq("pet_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const flaggedLogs = (logs ?? []).filter((l) => l.flagged);
  const today = new Date().toISOString().split("T")[0];
  const activeMeds = (medications ?? []).filter(
    (m) => m.active && (!m.end_date || m.end_date >= today)
  );

  const displayAge = pet.birthday
    ? ageFromBirthday(pet.birthday)
    : pet.age_years ? `${pet.age_years}yr` : null;

  const birthdayFormatted = pet.birthday
    ? new Date(pet.birthday + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : null;

  // Weight trend data from logs + pet's current weight
  const weightPoints = (logs ?? [])
    .filter((l) => l.weight_kg)
    .map((l) => ({
      date: new Date(l.logged_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      weight: Number(l.weight_kg),
    }))
    .reverse();

  const upcomingAppts = (appointments ?? []).filter((a) => new Date(a.scheduled_at) >= new Date());

  return (
    <div className="min-h-screen bg-background">
      <Nav userEmail={user.email} userName={user.user_metadata?.full_name} userRole="owner" />

      <main className="max-w-4xl mx-auto px-6 py-8">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          All pets
        </Link>

        {/* Pet header card */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 h-1.5" />
          <div className="p-6">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/40 dark:to-teal-900/40 rounded-2xl flex items-center justify-center text-4xl shrink-0 overflow-hidden ring-2 ring-border">
                  {pet.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={pet.photo_url} alt={pet.name} className="w-full h-full object-cover" />
                  ) : (
                    speciesEmoji(pet.species)
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold text-foreground">{pet.name}</h1>
                    <Link href={`/pets/${id}/edit`}>
                      <button className="p-1.5 text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted rounded-lg transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </Link>
                  </div>
                  <p className="text-muted-foreground capitalize mt-0.5 text-sm">{pet.breed || pet.species}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    {displayAge && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {displayAge}
                      </span>
                    )}
                    {birthdayFormatted && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Cake className="w-3 h-3" />
                        {birthdayFormatted}
                      </span>
                    )}
                    {pet.weight_kg && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Scale className="w-3 h-3" />
                        {pet.weight_kg} kg
                      </span>
                    )}
                    {upcomingAppts.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        <Calendar className="w-3 h-3" />
                        {upcomingAppts.length} upcoming
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Link href={`/pets/${id}/share`}>
                  <Button size="sm" variant="outline" className="gap-1.5 border-border hover:border-emerald-300 dark:hover:border-emerald-700 hover:text-emerald-700 dark:hover:text-emerald-400">
                    <Share2 className="w-3.5 h-3.5" />
                    Share
                  </Button>
                </Link>
                <Link href={`/pets/${id}/qr`}>
                  <Button size="sm" variant="outline" className="gap-1.5 border-border hover:border-border">
                    <QrCode className="w-3.5 h-3.5" />
                    QR
                  </Button>
                </Link>
                <Link href={`/pets/${id}/chat`}>
                  <Button size="sm" variant="outline" className="gap-1.5 border-border hover:border-violet-300 dark:hover:border-violet-700 hover:text-violet-700 dark:hover:text-violet-400">
                    <MessageSquare className="w-3.5 h-3.5" />
                    Ask AI
                  </Button>
                </Link>
                <Link href={`/pets/${id}/log`}>
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm">
                    <Plus className="w-3.5 h-3.5" />
                    Log today
                  </Button>
                </Link>
                <Link href={`/pets/${id}/summary`}>
                  <Button size="sm" variant="outline" className="gap-1.5 border-border hover:border-emerald-300 dark:hover:border-emerald-700 hover:text-emerald-700 dark:hover:text-emerald-400">
                    <FileText className="w-3.5 h-3.5" />
                    Summary
                  </Button>
                </Link>
              </div>
            </div>

            {flaggedLogs.length > 0 && (
              <div className="mt-5 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 rounded-xl flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  <strong>{flaggedLogs.length} flagged observation{flaggedLogs.length > 1 ? "s" : ""}</strong> detected by AI. Consider generating a vet summary.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="logs">
          <TabsList className="mb-6 bg-card border border-border shadow-sm rounded-xl p-1 h-auto gap-0.5 flex-wrap w-full">
            {[
              { value: "logs", label: `Logs (${logs?.length ?? 0})` },
              { value: "medications", label: `Meds (${activeMeds.length})` },
              { value: "appointments", label: `Appts (${upcomingAppts.length})` },
              { value: "vaccinations", label: `Vaccines (${vaccinations?.length ?? 0})` },
              { value: "visits", label: `Visits (${visits?.length ?? 0})` },
              { value: "vet-notes", label: `Vet Notes (${vetNotes?.length ?? 0})` },
              { value: "labs", label: `Labs (${labResults?.length ?? 0})` },
              { value: "summaries", label: `AI Summaries (${summaries?.length ?? 0})` },
            ].map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="rounded-lg text-xs font-medium data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-sm text-muted-foreground"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Logs tab */}
          <TabsContent value="logs">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">{logs?.length ?? 0} entries</p>
              <ExportButton petId={id} petName={pet.name} />
            </div>

            {weightPoints.length >= 2 && (
              <div className="mb-4">
                <WeightChart data={weightPoints} currentWeight={pet.weight_kg} />
              </div>
            )}

            {(!logs || logs.length === 0) ? (
              <div className="bg-card rounded-2xl border border-border shadow-sm p-12 text-center">
                <p className="text-muted-foreground mb-4">No logs yet. Start tracking {pet.name}&apos;s health.</p>
                <Link href={`/pets/${id}/log`}>
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">Add first log</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {logs.map((log) => (
                  <div key={log.id} className="bg-card rounded-xl border border-border shadow-sm p-5 hover:border-emerald-200 dark:hover:border-emerald-800 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <p className="text-xs text-muted-foreground font-medium">
                        {new Date(log.logged_at).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                      </p>
                      <div className="flex items-center gap-2">
                        {log.weight_kg && (
                          <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                            <Scale className="w-3 h-3" /> {log.weight_kg} kg
                          </span>
                        )}
                        {log.extracted_mood && (
                          <Badge className="bg-muted text-muted-foreground border-border text-xs capitalize">{log.extracted_mood}</Badge>
                        )}
                        {log.flagged && (
                          <Badge className={`text-xs ${severityColor(log.severity)}`}>
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            {log.severity ?? "flagged"}
                          </Badge>
                        )}
                        <DeleteLogButton logId={log.id} petId={id} />
                      </div>
                    </div>
                    <p className="text-foreground text-sm mb-3 leading-relaxed">{log.raw_input}</p>
                    {log.extracted_symptoms?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {log.extracted_symptoms.map((s: string) => (
                          <span key={s} className="text-xs bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/50 rounded-full px-2.5 py-0.5">{s}</span>
                        ))}
                      </div>
                    )}
                    {log.flag_reason && (
                      <p className="mt-3 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-800/50 rounded-lg px-3 py-2">
                        AI note: {log.flag_reason}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Medications tab */}
          <TabsContent value="medications">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">{activeMeds.length} active medication{activeMeds.length !== 1 ? "s" : ""}</p>
              <Link href={`/pets/${id}/medications`}>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm">
                  <Plus className="w-3.5 h-3.5" />
                  Manage
                </Button>
              </Link>
            </div>
            {activeMeds.length === 0 ? (
              <div className="bg-card rounded-2xl border border-border shadow-sm p-12 text-center">
                <Pill className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm mb-4">No active medications tracked.</p>
                <Link href={`/pets/${id}/medications`}>
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">Add medication</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {activeMeds.slice(0, 5).map((med) => (
                  <div key={med.id} className="bg-card rounded-xl border border-border shadow-sm p-5 flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950/40 rounded-xl flex items-center justify-center shrink-0">
                      <Pill className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{med.name}</p>
                      <p className="text-sm text-muted-foreground">{med.dose && `${med.dose} · `}{med.frequency}</p>
                    </div>
                    {med.end_date && (
                      <p className="text-xs text-muted-foreground">Until {new Date(med.end_date + "T00:00:00").toLocaleDateString()}</p>
                    )}
                  </div>
                ))}
                {activeMeds.length > 5 && (
                  <Link href={`/pets/${id}/medications`} className="block">
                    <div className="bg-muted/50 rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors">
                      +{activeMeds.length - 5} more — view all
                    </div>
                  </Link>
                )}
              </div>
            )}
          </TabsContent>

          {/* Appointments tab */}
          <TabsContent value="appointments">
            <AppointmentForm petId={id} initial={appointments ?? []} />
          </TabsContent>

          {/* Vaccinations tab */}
          <TabsContent value="vaccinations">
            <VaccinationForm petId={id} initial={vaccinations ?? []} canAdd={true} />
          </TabsContent>

          {/* Vet Visits tab */}
          <TabsContent value="visits">
            <VisitForm petId={id} initial={visits ?? []} />
          </TabsContent>

          {/* Vet Notes tab */}
          <TabsContent value="vet-notes">
            {(!vetNotes || vetNotes.length === 0) ? (
              <div className="bg-card rounded-2xl border border-border shadow-sm p-12 text-center">
                <Stethoscope className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">No vet notes yet.</p>
                <p className="text-muted-foreground/60 text-xs mt-1">Share {pet.name}&apos;s records with a vet to receive clinical notes.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {vetNotes.map((note: any) => (
                  <div key={note.id} className="bg-card rounded-xl border border-border shadow-sm p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-teal-50 dark:bg-teal-900/40 rounded-lg flex items-center justify-center">
                          <Stethoscope className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium text-foreground">{note.profiles?.full_name ?? "Veterinarian"}</p>
                            {note.profiles?.verified && (
                              <span title="Verified vet" className="inline-flex items-center justify-center w-4 h-4 bg-emerald-500 rounded-full">
                                <ShieldCheck className="w-2.5 h-2.5 text-white" />
                              </span>
                            )}
                          </div>
                          {note.profiles?.clinic_name && (
                            <p className="text-xs text-muted-foreground">{note.profiles.clinic_name}</p>
                          )}
                        </div>
                        {note.note_type && (
                          <Badge className="bg-teal-50 dark:bg-teal-900/40 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800/50 text-xs capitalize ml-1">{note.note_type}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(note.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">{note.content}</p>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Labs tab */}
          <TabsContent value="labs">
            <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
              <LabResultUpload petId={id} initial={labResults ?? []} />
            </div>
          </TabsContent>

          {/* Summaries tab */}
          <TabsContent value="summaries">
            {(!summaries || summaries.length === 0) ? (
              <div className="bg-card rounded-2xl border border-border shadow-sm p-12 text-center">
                <FileText className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground mb-4">No AI summaries yet.</p>
                <Link href={`/pets/${id}/summary`}>
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">Generate first summary</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {summaries.map((s) => (
                  <div key={s.id} className="bg-card rounded-xl border border-border shadow-sm p-6">
                    <p className="text-sm font-medium text-muted-foreground mb-3">
                      Generated {new Date(s.generated_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                    </p>
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap mb-4">{s.content}</p>
                    {s.recommended_questions?.length > 0 && (
                      <div className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800/50 rounded-xl p-4">
                        <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide mb-2">Questions to ask your vet</p>
                        <ul className="space-y-1">
                          {s.recommended_questions.map((q: string, i: number) => (
                            <li key={i} className="text-sm text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
                              <span className="text-emerald-500 mt-0.5">•</span>
                              {q}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
