import { SupabaseClient } from "@supabase/supabase-js";

export async function getOrCreateProfile(
  supabase: SupabaseClient,
  userId: string,
  metadata?: Record<string, string>
) {
  const { data: existing } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (existing) return existing;
  const { data } = await supabase
    .from("profiles")
    .insert({
      id: userId,
      role: metadata?.role ?? "owner",
      full_name: metadata?.full_name ?? null,
      clinic_name: metadata?.clinic_name ?? null,
    })
    .select()
    .single();
  return data;
}

export async function getUserRole(
  supabase: SupabaseClient,
  userId: string
): Promise<"owner" | "vet"> {
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  return (data?.role as "owner" | "vet") ?? "owner";
}
