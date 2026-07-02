import { notFound } from "next/navigation";
import Link from "next/link";
import { PawPrint, Calendar, Scale, Pill, ShieldCheck, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

async function fetchPublicPet(token: string) {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/public/pets/${token}`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
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
    return `${m} months`;
  }
  return `${total} year${total !== 1 ? "s" : ""}`;
}

export default async function PublicPetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await fetchPublicPet(token);

  if (!data) notFound();

  const { pet, logs, medications, vaccinations } = data;
  const today = new Date().toISOString().split("T")[0];
  const activeMeds = (medications ?? []).filter(
    (m: any) => m.active && (!m.end_date || m.end_date >= today)
  );

  const displayAge = pet.birthday ? ageFromBirthday(pet.birthday) : pet.age_years ? `${pet.age_years} yr` : null;
  const recentLogs = (logs ?? []).slice(0, 5);

  const overdueVaccines = (vaccinations ?? []).filter(
    (v: any) => v.next_due_date && v.next_due_date < today
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
      {/* Public header */}
      <header className="border-b border-gray-100 bg-white/95 backdrop-blur-sm px-6 py-0 sticky top-0 z-10 shadow-sm">
        <div className="max-w-3xl mx-auto flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center shadow-sm">
              <PawPrint className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg text-gray-900">PawLog</span>
            <Badge className="text-xs bg-gray-100 text-gray-500 border-gray-200 ml-1">Read-only</Badge>
          </div>
          <Link
            href="/auth"
            className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
          >
            Sign in →
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">
        {/* Pet header */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2" />
          <div className="p-6 flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl flex items-center justify-center text-4xl shrink-0">
              {pet.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={pet.photo_url} alt={pet.name} className="w-full h-full object-cover rounded-2xl" />
              ) : (
                speciesEmoji(pet.species)
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{pet.name}</h1>
              <p className="text-gray-500 capitalize mt-0.5">{pet.breed || pet.species}</p>
              <div className="flex flex-wrap items-center gap-3 mt-2">
                {displayAge && (
                  <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                    <Calendar className="w-3 h-3" />
                    {displayAge} old
                  </span>
                )}
                {pet.weight_kg && (
                  <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                    <Scale className="w-3 h-3" />
                    {pet.weight_kg} kg
                  </span>
                )}
                {pet.microchip_id && (
                  <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                    🔖 {pet.microchip_id}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {overdueVaccines.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-700">Overdue vaccinations</p>
              <p className="text-xs text-red-600 mt-0.5">
                {overdueVaccines.map((v: any) => v.vaccine_name).join(", ")}
              </p>
            </div>
          </div>
        )}

        {/* Active medications */}
        {activeMeds.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <Pill className="w-4 h-4 text-blue-500" />
              <h2 className="font-semibold text-gray-900">Active medications</h2>
              <Badge className="ml-auto text-xs bg-blue-50 text-blue-600 border-blue-200">{activeMeds.length}</Badge>
            </div>
            <div className="space-y-2">
              {activeMeds.map((med: any) => (
                <div key={med.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{med.name}</p>
                    {med.dose && <p className="text-xs text-gray-400">{med.dose}{med.frequency ? ` · ${med.frequency}` : ""}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Vaccinations */}
        {(vaccinations ?? []).length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <h2 className="font-semibold text-gray-900">Vaccinations</h2>
            </div>
            <div className="space-y-2">
              {(vaccinations as any[]).map((v: any) => {
                const isOverdue = v.next_due_date && v.next_due_date < today;
                return (
                  <div key={v.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{v.vaccine_name}</p>
                      <p className="text-xs text-gray-400">
                        Given {v.administered_date}
                        {v.next_due_date && ` · Due ${v.next_due_date}`}
                      </p>
                    </div>
                    {isOverdue && (
                      <Badge className="text-xs bg-red-50 text-red-600 border-red-200">Overdue</Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent logs */}
        {recentLogs.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Recent observations</h2>
            <div className="space-y-3">
              {recentLogs.map((log: any) => (
                <div key={log.id} className="py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-xs text-gray-400">
                      {new Date(log.logged_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                    {log.flagged && (
                      <Badge className={`text-xs ${log.severity === "high" ? "bg-red-50 text-red-600 border-red-200" : "bg-amber-50 text-amber-600 border-amber-200"}`}>
                        {log.severity}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-2">{log.raw_input}</p>
                  {(log.extracted_symptoms ?? []).length > 0 && (
                    <p className="text-xs text-gray-400 mt-1">
                      Symptoms: {log.extracted_symptoms.join(", ")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 pb-4">
          This is a read-only health profile shared by {pet.name}&apos;s owner via PawLog. &nbsp;·&nbsp;{" "}
          <Link href="/auth" className="text-emerald-600 hover:text-emerald-700">
            Create your free account
          </Link>
        </p>
      </main>
    </div>
  );
}
