"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Download } from "lucide-react";

interface Props {
  petId: string;
  petName: string;
}

export function ExportButton({ petId, petName }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pets/${petId}/export`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${petName.toLowerCase().replace(/\s+/g, "-")}-health-logs.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Failed to export logs.");
    }
    setLoading(false);
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-emerald-700 border border-gray-200 hover:border-emerald-300 rounded-lg px-3 py-1.5 transition-colors bg-white disabled:opacity-50"
    >
      <Download className="w-3.5 h-3.5" />
      {loading ? "Exporting..." : "Export CSV"}
    </button>
  );
}
