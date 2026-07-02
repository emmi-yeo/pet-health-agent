"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Trash2 } from "lucide-react";

interface DeleteLogButtonProps {
  logId: string;
  petId: string;
}

export function DeleteLogButton({ logId, petId }: DeleteLogButtonProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("Delete this log entry? This cannot be undone.")) return;
    setDeleting(true);
    const supabase = createClient();
    await supabase.from("health_logs").delete().eq("id", logId);
    router.refresh();
    setDeleting(false);
  }

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="text-gray-300 hover:text-red-400 transition-colors disabled:opacity-50"
      title="Delete log"
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  );
}
