export function speciesEmoji(species: string): string {
  const map: Record<string, string> = {
    dog: "🐶", cat: "🐱", rabbit: "🐰", bird: "🐦",
    fish: "🐟", hamster: "🐹", turtle: "🐢", other: "🐾",
  };
  return map[species?.toLowerCase()] ?? "🐾";
}

export function severityColor(severity?: string): string {
  if (severity === "high") return "bg-red-50 text-red-600 border-red-200";
  if (severity === "medium") return "bg-amber-50 text-amber-600 border-amber-200";
  return "bg-blue-50 text-blue-600 border-blue-200";
}

export function formatLogDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });
}

export function petDisplayName(pet: { name: string; breed?: string; species: string; age_years?: number }): string {
  const parts = [pet.breed || pet.species];
  if (pet.age_years) parts.push(`${pet.age_years}yr`);
  return parts.join(" · ");
}

export function isLogFlagged(log: { flagged: boolean; severity?: string }): boolean {
  return log.flagged;
}

export function hasSevereFlagged(logs: Array<{ flagged: boolean; severity?: string }>): boolean {
  return logs.some((l) => l.flagged && l.severity === "high");
}
