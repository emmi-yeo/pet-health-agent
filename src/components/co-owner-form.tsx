"use client";

import { useState } from "react";
import { Users, CheckCircle, Clock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { CoOwner } from "@/lib/types";

interface CoOwnerFormProps {
  petId: string;
  initial?: CoOwner[];
}

export function CoOwnerForm({ petId, initial = [] }: CoOwnerFormProps) {
  const [coOwners, setCoOwners] = useState<CoOwner[]>(initial);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function getToken() {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError("");
    setSent(false);
    try {
      const token = await getToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pets/${petId}/co-owners`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error(await res.text());
      const created: CoOwner = await res.json();
      setCoOwners((prev) => [created, ...prev]);
      setEmail("");
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send invite.");
    } finally {
      setSending(false);
    }
  }

  async function handleRevoke(coOwnerId: string) {
    if (!confirm("Revoke this co-owner's access?")) return;
    const token = await getToken();
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pets/${petId}/co-owners/${coOwnerId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setCoOwners((prev) => prev.map((c) => c.id === coOwnerId ? { ...c, status: "revoked" } : c));
  }

  function statusBadge(status: string) {
    if (status === "accepted") return (
      <Badge className="bg-emerald-50 text-emerald-600 border-emerald-200 text-xs gap-1">
        <CheckCircle className="w-3 h-3" /> Accepted
      </Badge>
    );
    if (status === "revoked") return (
      <Badge className="bg-gray-50 text-gray-500 border-gray-200 text-xs gap-1">
        <XCircle className="w-3 h-3" /> Revoked
      </Badge>
    );
    return (
      <Badge className="bg-amber-50 text-amber-600 border-amber-200 text-xs gap-1">
        <Clock className="w-3 h-3" /> Pending
      </Badge>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-violet-500" />
        <h2 className="font-semibold text-gray-900 dark:text-white">Co-owner access</h2>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Invite a partner or family member to view and log observations for this pet.
      </p>

      {sent && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
          Invite sent! They will receive an email to accept.
        </div>
      )}

      <form onSubmit={handleInvite} className="flex gap-2">
        <div className="flex-1 space-y-1">
          <Label htmlFor="co-owner-email" className="text-xs">Email address</Label>
          <Input
            id="co-owner-email"
            type="email"
            placeholder="partner@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-9"
          />
        </div>
        <Button
          type="submit"
          disabled={sending || !email}
          className="bg-violet-600 hover:bg-violet-700 text-white mt-5 h-9"
        >
          {sending ? "Sending..." : "Invite"}
        </Button>
      </form>

      {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      {coOwners.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Co-owners</p>
          {coOwners.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700 last:border-0"
            >
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{c.invited_email}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Invited {new Date(c.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {statusBadge(c.status)}
                {c.status !== "revoked" && (
                  <button
                    onClick={() => handleRevoke(c.id)}
                    className="text-xs text-red-400 hover:text-red-600 transition-colors ml-2"
                  >
                    Revoke
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
