import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/profile";
import { Nav } from "@/components/nav";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, AlertTriangle, Stethoscope, Users, ShieldCheck } from "lucide-react";

function speciesEmoji(species: string) {
  const map: Record<string, string> = {
    dog: "🐶", cat: "🐱", rabbit: "🐰", bird: "🐦",
    fish: "🐟", hamster: "🐹", turtle: "🐢", other: "🐾",
  };
  return map[species?.toLowerCase()] ?? "🐾";
}

export default async function VetDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth");

  const role = await getUserRole(supabase, user.id);
  if (role !== "vet") redirect("/dashboard");

  // Fetch accepted shares joined to pet data AND owner profile
  const { data: shares } = await supabase
    .from("pet_shares")
    .select(`
      *,
      pets(id, name, species, breed, age_years, birthday, health_logs(id, flagged, logged_at)),
      owner:profiles!pet_shares_owner_id_fkey(full_name)
    `)
    .eq("vet_id", user.id)
    .eq("status", "accepted");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, clinic_name, verified")
    .eq("id", user.id)
    .maybeSingle();

  const vetName = profile?.full_name ?? user.email;
  const totalFlagged = (shares ?? []).reduce((sum, s) => {
    const logs = (s.pets as any)?.health_logs ?? [];
    return sum + logs.filter((l: any) => l.flagged).length;
  }, 0);

  return (
    <div className="min-h-screen bg-background">
      <Nav userEmail={user.email} userName={profile?.full_name} userRole="vet" />

      <main className="max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-foreground">
              Welcome{vetName ? `, ${vetName.split(" ")[0]}` : ""}
            </h1>
            {profile?.verified && (
              <span className="inline-flex items-center gap-1 text-xs bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700/50 rounded-full px-2 py-0.5 font-medium">
                <ShieldCheck className="w-3 h-3" /> Verified
              </span>
            )}
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            {profile?.clinic_name && <span>{profile.clinic_name} · </span>}
            {shares?.length
              ? `${shares.length} patient${shares.length > 1 ? "s" : ""} in your care`
              : "No patients yet"}
          </p>
        </div>

        {/* Stats bar */}
        {shares && shares.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { label: "Patients", value: shares.length, icon: Users, color: "text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/40" },
              { label: "Flagged issues", value: totalFlagged, icon: AlertTriangle, color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/40" },
              { label: "Pending review", value: shares.filter(s => ((s.pets as any)?.health_logs ?? []).some((l: any) => l.flagged)).length, icon: Stethoscope, color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/40" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-card rounded-2xl border border-border shadow-sm p-5 flex items-center gap-4">
                <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center shrink-0`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {(!shares || shares.length === 0) ? (
          <div className="bg-card rounded-2xl border border-border shadow-sm p-16 text-center">
            <div className="w-16 h-16 bg-teal-50 dark:bg-teal-900/40 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Stethoscope className="w-8 h-8 text-teal-600 dark:text-teal-400" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">No patients yet</h2>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              Ask a pet owner to share their pet&apos;s profile with you. They&apos;ll send you an invite link via PawLog.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {shares.map((share) => {
              const pet = share.pets as {
                id: string; name: string; species: string; breed?: string;
                age_years?: number; birthday?: string;
                health_logs?: { id: string; flagged: boolean; logged_at: string }[];
              } | null;
              const owner = share.owner as { full_name?: string } | null;
              if (!pet) return null;

              const logs = pet.health_logs ?? [];
              const flaggedCount = logs.filter((l) => l.flagged).length;
              const lastLog = [...logs].sort(
                (a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime()
              )[0];

              return (
                <Link key={share.id} href={`/vet/patients/${pet.id}`}>
                  <div className="bg-card rounded-2xl border border-border shadow-sm p-6 hover:border-teal-300 dark:hover:border-teal-700 hover:shadow-md transition-all cursor-pointer group">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-900/40 dark:to-emerald-900/40 rounded-xl flex items-center justify-center text-2xl">
                          {speciesEmoji(pet.species)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">{pet.name}</h3>
                          <p className="text-sm text-muted-foreground capitalize">
                            {pet.breed || pet.species}
                            {pet.age_years ? ` · ${pet.age_years}yr` : ""}
                          </p>
                          {owner?.full_name && (
                            <p className="text-xs text-muted-foreground/70 mt-0.5">Owner: {owner.full_name}</p>
                          )}
                        </div>
                      </div>
                      {flaggedCount > 0 && (
                        <Badge className="bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800 text-xs shrink-0">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          {flaggedCount} flag{flaggedCount > 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>
                    <div className="border-t border-border pt-3.5 flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        {lastLog
                          ? `Last log: ${new Date(lastLog.logged_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                          : "No logs yet"}
                      </p>
                      <div className="flex items-center gap-2 text-muted-foreground/40 group-hover:text-teal-400 transition-colors">
                        <span className="text-xs">{logs.length} logs</span>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
