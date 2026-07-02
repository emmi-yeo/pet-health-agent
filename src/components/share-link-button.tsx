"use client";

import { useState } from "react";
import { Link2, Copy, Check, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { ShareLink } from "@/lib/types";

interface ShareLinkButtonProps {
  petId: string;
  initial?: ShareLink[];
}

export function ShareLinkManager({ petId, initial = [] }: ShareLinkButtonProps) {
  const [links, setLinks] = useState<ShareLink[]>(initial);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function getToken() {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }

  async function createLink() {
    setCreating(true);
    setError("");
    try {
      const token = await getToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pets/${petId}/share-link`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setLinks((prev) => [data, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create link.");
    } finally {
      setCreating(false);
    }
  }

  async function deleteLink(linkId: string) {
    if (!confirm("Delete this share link? Anyone using it will lose access.")) return;
    const token = await getToken();
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pets/${petId}/share-link/${linkId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setLinks((prev) => prev.filter((l) => l.id !== linkId));
  }

  function getUrl(shareToken: string) {
    return `${window.location.origin}/p/${shareToken}`;
  }

  async function copyUrl(link: ShareLink) {
    await navigator.clipboard.writeText(getUrl(link.token));
    setCopiedId(link.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-emerald-600" />
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Read-only share links</h2>
        </div>
        <Button
          size="sm"
          onClick={createLink}
          disabled={creating}
          className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-xs gap-1"
        >
          <Plus className="w-3 h-3" />
          {creating ? "Creating..." : "New link"}
        </Button>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400">
        Anyone with this link can view {"{pet name}"}&apos;s profile without signing in. No editing, no personal data.
      </p>

      {error && (
        <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      {links.length === 0 && (
        <p className="text-xs text-gray-400 italic">No links yet. Create one to share with a vet or clinic.</p>
      )}

      {links.map((link) => (
        <div
          key={link.id}
          className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700"
        >
          <p className="text-xs text-gray-500 dark:text-gray-400 flex-1 font-mono truncate">
            /p/{link.token.slice(0, 16)}…
          </p>
          <button
            onClick={() => copyUrl(link)}
            className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
            title="Copy link"
          >
            {copiedId === link.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => deleteLink(link.id)}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete link"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
