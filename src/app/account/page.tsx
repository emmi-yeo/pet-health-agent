"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Nav } from "@/components/nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, LogOut, Trash2 } from "lucide-react";

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email?: string; user_metadata?: Record<string, string> } | null>(null);
  const [profile, setProfile] = useState<{ role: string; full_name?: string; clinic_name?: string } | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth"); return; }
      setUser(user);

      const { data: prof } = await supabase
        .from("profiles")
        .select("role, full_name, clinic_name")
        .eq("id", user.id)
        .single();
      setProfile(prof);
      setDisplayName(prof?.full_name ?? user.user_metadata?.full_name ?? "");
      setClinicName(prof?.clinic_name ?? "");
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveMsg("");

    const supabase = createClient();
    await supabase.auth.updateUser({ data: { full_name: displayName } });
    await supabase
      .from("profiles")
      .update({
        full_name: displayName,
        ...(profile?.role === "vet" ? { clinic_name: clinicName } : {}),
      })
      .eq("id", user!.id);

    setSaveMsg("Changes saved.");
    setSaving(false);
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/account`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!res.ok) throw new Error(await res.text());

      await supabase.auth.signOut();
      router.push("/");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete account.");
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Nav />
        <div className="max-w-xl mx-auto px-6 py-10">
          <div className="h-48 bg-card rounded-2xl border border-border animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Nav
        userEmail={user?.email}
        userName={displayName || undefined}
        userRole={(profile?.role as "owner" | "vet") ?? "owner"}
      />

      <main className="max-w-xl mx-auto px-6 py-10">
        <Link
          href={profile?.role === "vet" ? "/vet/dashboard" : "/dashboard"}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to dashboard
        </Link>

        <h1 className="text-2xl font-bold text-foreground mb-8">Account settings</h1>

        {/* Profile form */}
        <div className="bg-card rounded-2xl border border-border shadow-sm p-7 mb-5">
          <h2 className="text-base font-semibold text-foreground mb-6">Profile</h2>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="displayName">Display name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={user?.email ?? ""} disabled className="text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Email cannot be changed here.</p>
            </div>

            {profile?.role === "vet" && (
              <div className="space-y-1.5">
                <Label htmlFor="clinic">Clinic name</Label>
                <Input
                  id="clinic"
                  value={clinicName}
                  onChange={(e) => setClinicName(e.target.value)}
                  placeholder="Your clinic or practice name"
                />
              </div>
            )}

            {saveMsg && (
              <p className="text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 rounded-lg px-3 py-2">{saveMsg}</p>
            )}

            <Button
              type="submit"
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            >
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </form>
        </div>

        {/* Account actions */}
        <div className="bg-card rounded-2xl border border-border shadow-sm p-7">
          <h2 className="text-base font-semibold text-foreground mb-6">Account actions</h2>

          <div className="space-y-4">
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>

            <div className="border-t border-border pt-4">
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-2 text-sm text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete account
                </button>
              ) : (
                <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl p-4">
                  <p className="text-sm text-red-700 dark:text-red-400 font-medium mb-3">
                    This will permanently delete your account and all your pets&apos; data. This cannot be undone.
                  </p>
                  <div className="flex gap-3">
                    <Button
                      onClick={handleDeleteAccount}
                      disabled={deleting}
                      className="bg-red-600 hover:bg-red-700 text-white text-sm"
                    >
                      {deleting ? "Deleting..." : "Yes, delete my account"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={deleting}
                      className="text-sm"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
