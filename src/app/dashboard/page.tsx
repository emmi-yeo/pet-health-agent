import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/profile";
import { Nav } from "@/components/nav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PawPrint, Plus, AlertTriangle, ChevronRight, Activity } from "lucide-react";
import { OnboardingChecklist } from "@/components/onboarding-checklist";

function speciesEmoji(species: string) {
  const map: Record<string, string> = {
    dog: "🐶", cat: "🐱", rabbit: "🐰", bird: "🐦",
    fish: "🐟", hamster: "🐹", turtle: "🐢", other: "🐾",
  };
  return map[species.toLowerCase()] ?? "🐾";
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth");

  const role = await getUserRole(supabase, user.id);
  if (role === "vet") redirect("/vet/dashboard");

  const { data: pets } = await supabase
    .from("pets")
    .select("*, health_logs(id, flagged, logged_at, flag_reason, severity)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const userName = user.user_metadata?.full_name ?? user.email;
  const totalFlagged = (pets ?? []).reduce((sum, p) =>
    sum + (p.health_logs ?? []).filter((l: any) => l.flagged).length, 0);

  const hasPets = (pets ?? []).length > 0;
  const hasLogs = (pets ?? []).some((p) => (p.health_logs ?? []).length > 0);
  const { data: shares } = await supabase.from("pet_shares").select("id").eq("owner_id", user.id).limit(1);
  const hasShares = (shares ?? []).length > 0;
  const firstPetId = (pets ?? [])[0]?.id;

  return (
    <div className="min-h-screen bg-background">
      <Nav userEmail={user.email} userName={user.user_metadata?.full_name} userRole="owner" />

      <main className="max-w-6xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Welcome back{userName ? `, ${userName.split(" ")[0]}` : ""}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {pets?.length
                ? `Tracking ${pets.length} pet${pets.length > 1 ? "s" : ""}${totalFlagged > 0 ? ` · ${totalFlagged} flagged observation${totalFlagged > 1 ? "s" : ""}` : ""}`
                : "Add your first pet to get started"}
            </p>
          </div>
          <Link href="/pets/new">
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-sm">
              <Plus className="w-4 h-4" />
              Add pet
            </Button>
          </Link>
        </div>

        {/* Onboarding checklist for new users */}
        {!hasLogs && (
          <OnboardingChecklist
            hasPets={hasPets}
            hasLogs={hasLogs}
            hasShares={hasShares}
            firstPetId={firstPetId}
          />
        )}

        {/* Empty state */}
        {(!pets || pets.length === 0) && (
          <div className="bg-card rounded-2xl border border-border shadow-sm p-16 text-center">
            <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <PawPrint className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">No pets yet</h2>
            <p className="text-muted-foreground text-sm mb-6 max-w-xs mx-auto">
              Add your first pet to start tracking their health with AI.
            </p>
            <Link href="/pets/new">
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
                Add your first pet
              </Button>
            </Link>
          </div>
        )}

        {/* Pet grid */}
        {pets && pets.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pets.map((pet) => {
              const logs = pet.health_logs ?? [];
              const flaggedLogs = logs.filter((l: any) => l.flagged);
              const highSeverity = flaggedLogs.some((l: any) => l.severity === "high");
              const recentLog = [...logs].sort(
                (a: any, b: any) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime()
              )[0];

              return (
                <Link key={pet.id} href={`/pets/${pet.id}`}>
                  <div className="bg-card rounded-2xl border border-border shadow-sm p-6 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-md dark:hover:shadow-emerald-900/20 transition-all cursor-pointer group">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/40 dark:to-teal-900/40 rounded-xl flex items-center justify-center text-2xl shrink-0 overflow-hidden">
                          {pet.photo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={pet.photo_url} alt={pet.name} className="w-full h-full object-cover" />
                          ) : (
                            speciesEmoji(pet.species)
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{pet.name}</h3>
                          <p className="text-sm text-muted-foreground capitalize">
                            {pet.breed || pet.species}
                            {pet.age_years ? ` · ${pet.age_years}yr` : ""}
                          </p>
                        </div>
                      </div>
                      {flaggedLogs.length > 0 && (
                        <Badge className={`text-xs shrink-0 ${highSeverity ? "bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800" : "bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800"}`}>
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          {flaggedLogs.length}
                        </Badge>
                      )}
                    </div>
                    <div className="border-t border-border pt-3.5 flex items-center justify-between">
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Activity className="w-3 h-3" />
                        {recentLog
                          ? `${new Date(recentLog.logged_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                          : "No logs yet"}
                      </p>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-emerald-400 transition-colors" />
                    </div>
                  </div>
                </Link>
              );
            })}

            {/* Add pet card */}
            <Link href="/pets/new">
              <div className="rounded-2xl border-2 border-dashed border-border p-6 hover:border-emerald-400 dark:hover:border-emerald-600 hover:bg-emerald-50/30 dark:hover:bg-emerald-900/10 transition-all cursor-pointer flex flex-col items-center justify-center min-h-[148px] gap-3 group">
                <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/40 transition-colors">
                  <Plus className="w-5 h-5 text-muted-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" />
                </div>
                <p className="text-sm text-muted-foreground font-medium">Add another pet</p>
              </div>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
