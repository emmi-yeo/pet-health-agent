"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Nav } from "@/components/nav";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Loader2, Copy, Check, Printer } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function SummaryPage() {
  const { id } = useParams<{ id: string }>();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [petName, setPetName] = useState("");
  const [summary, setSummary] = useState<{
    content: string;
    key_concerns: string[];
    recommended_questions: string[];
  } | null>(null);
  const [copied, setCopied] = useState(false);

  async function generateSummary() {
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated. Please sign in again.");

      if (!petName) {
        const { data: pet } = await supabase.from("pets").select("name").eq("id", id).single();
        if (pet) setPetName(pet.name);
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/pets/${id}/summary`,
        {
          method: "POST",
          headers: { "Authorization": `Bearer ${session.access_token}` },
        }
      );
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setSummary(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function copyToClipboard() {
    if (!summary) return;
    const text = [
      summary.content,
      "",
      "Questions to ask:",
      ...summary.recommended_questions.map((q) => `• ${q}`),
    ].join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handlePrint() {
    window.print();
  }

  const dateStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Nav />

      <main className="max-w-2xl mx-auto px-6 py-10">
        <Link href={`/pets/${id}`} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white mb-6" data-print-hide>
          <ArrowLeft className="w-4 h-4" />
          Back to pet profile
        </Link>

        {/* Print header — only visible when printing */}
        <div className="hidden print:block mb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">🐾</span>
            <span className="text-xl font-bold text-gray-900">PawLog</span>
          </div>
          <p className="text-sm text-gray-500">Vet Visit Report — Generated {dateStr}</p>
          {petName && <p className="text-sm text-gray-500 mt-0.5">Patient: {petName}</p>}
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-8" data-printable>
          <div className="flex items-center gap-3 mb-2" data-print-hide>
            <div className="w-8 h-8 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Vet Visit Summary</h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-8" data-print-hide>
            The report agent analyzes recent health logs and generates a structured summary to bring to your vet.
          </p>

          {!summary ? (
            <>
              {error && (
                <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2 mb-4">{error}</p>
              )}
              <Button
                onClick={generateSummary}
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-11 gap-2"
                data-print-hide
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating summary...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    Generate vet summary
                  </>
                )}
              </Button>

              <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700" data-print-hide>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  The summary covers the last 90 days of logs, highlights recurring symptoms, lists active medications, and suggests questions for your vet. It is not a diagnosis.
                </p>
              </div>
            </>
          ) : (
            <div className="space-y-6">
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {summary.content}
                </p>
              </div>

              {summary.key_concerns.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                    Key concerns
                  </p>
                  <ul className="space-y-1.5">
                    {summary.key_concerns.map((c, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <span className="text-amber-500 mt-0.5 shrink-0">⚠</span>
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {summary.recommended_questions.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                    Questions to ask your vet
                  </p>
                  <ul className="space-y-1.5">
                    {summary.recommended_questions.map((q, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <span className="text-emerald-500 mt-0.5 shrink-0">?</span>
                        {q}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Print footer */}
              <p className="hidden print:block text-xs text-gray-400 mt-4 pt-4 border-t border-gray-200">
                Generated by PawLog AI on {dateStr}. This is not veterinary advice — always consult a licensed veterinarian.
              </p>

              <div className="flex gap-3 pt-2" data-print-hide>
                <Button onClick={copyToClipboard} variant="outline" className="gap-2 flex-1">
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copied!" : "Copy"}
                </Button>
                <Button onClick={handlePrint} variant="outline" className="gap-2 flex-1">
                  <Printer className="w-4 h-4" />
                  Print / Save PDF
                </Button>
                <Button
                  onClick={() => { setSummary(null); setError(""); }}
                  variant="outline"
                  className="flex-1"
                >
                  Regenerate
                </Button>
              </div>

              <p className="text-xs text-gray-400 dark:text-gray-500 text-center" data-print-hide>
                PawLog does not provide veterinary advice. Always consult a licensed veterinarian.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
