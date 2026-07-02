"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Nav } from "@/components/nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PetShare, ShareLink } from "@/lib/types";
import { ArrowLeft, Share2, CheckCircle, XCircle, Clock } from "lucide-react";
import { ShareLinkManager } from "@/components/share-link-button";
import { CoOwnerForm } from "@/components/co-owner-form";

export default function SharePetPage() {
  const { id } = useParams<{ id: string }>();
  const [petName, setPetName] = useState("");
  const [vetEmail, setVetEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [shares, setShares] = useState<PetShare[]>([]);
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [coOwners, setCoOwners] = useState<any[]>([]);
  const [userEmail, setUserEmail] = useState<string | undefined>();
  const [userName, setUserName] = useState<string | undefined>();
  const [token, setToken] = useState<string | null>(null);

  const fetchShares = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("pet_shares")
      .select("*")
      .eq("pet_id", id)
      .order("created_at", { ascending: false });
    setShares(data ?? []);
  }, [id]);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserEmail(user.email);
      setUserName(user.user_metadata?.full_name);

      const { data: { session } } = await supabase.auth.getSession();
      setToken(session?.access_token ?? null);

      const { data: pet } = await supabase
        .from("pets").select("name").eq("id", id).eq("user_id", user.id).single();
      if (pet) setPetName(pet.name);

      await fetchShares();

      // Fetch share links
      if (session?.access_token) {
        const linksRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/pets/${id}/share-link`,
          { headers: { Authorization: `Bearer ${session.access_token}` } }
        );
        if (linksRes.ok) setShareLinks(await linksRes.json());

        const coRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/pets/${id}/co-owners`,
          { headers: { Authorization: `Bearer ${session!.access_token}` } }
        );
        if (coRes.ok) setCoOwners(await coRes.json());
      }
    }
    load();
  }, [id, fetchShares]);

  async function handleSendInvite(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError("");
    setSent(false);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pets/${id}/share`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ vet_email: vetEmail }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt);
      }

      setSent(true);
      setVetEmail("");
      await fetchShares();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send invite.");
    }
    setSending(false);
  }

  async function handleRevoke(shareId: string) {
    if (!confirm("Revoke this vet's access?")) return;
    const supabase = createClient();
    await supabase
      .from("pet_shares")
      .update({ status: "revoked" })
      .eq("id", shareId);
    await fetchShares();
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
    <div className="min-h-screen bg-gray-50">
      <Nav userEmail={userEmail} userName={userName} userRole="owner" />

      <main className="max-w-2xl mx-auto px-6 py-10">
        <Link
          href={`/pets/${id}`}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to {petName}
        </Link>

        <h1 className="text-2xl font-bold text-gray-900 mb-1">Share with vet</h1>
        <p className="text-gray-500 mb-8">
          Invite a veterinarian to view {petName}&apos;s health records.
        </p>

        {/* Invite form */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Share2 className="w-4 h-4 text-emerald-600" />
            <h2 className="font-semibold text-gray-900">Send invite</h2>
          </div>

          {sent && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
              Invite sent! The vet will receive an email with a link to accept.
            </div>
          )}

          <form onSubmit={handleSendInvite} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="vetEmail">Vet&apos;s email address</Label>
              <Input
                id="vetEmail"
                type="email"
                placeholder="vet@clinic.com"
                value={vetEmail}
                onChange={(e) => setVetEmail(e.target.value)}
                required
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <Button
              type="submit"
              disabled={sending || !vetEmail}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {sending ? "Sending..." : "Send invite"}
            </Button>
          </form>
        </div>

        {/* Read-only share links */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <ShareLinkManager petId={id} initial={shareLinks} />
        </div>

        {/* Co-owner access */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-8">
          <CoOwnerForm petId={id} initial={coOwners} />
        </div>

        {/* Current vet shares */}
        {shares.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Current shares</h2>
            <div className="space-y-3">
              {shares.map((share) => (
                <div
                  key={share.id}
                  className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{share.vet_email}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Invited {new Date(share.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {statusBadge(share.status)}
                    {share.status !== "revoked" && (
                      <button
                        onClick={() => handleRevoke(share.id)}
                        className="text-xs text-red-400 hover:text-red-600 transition-colors ml-2"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
