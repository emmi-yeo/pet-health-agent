"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Nav } from "@/components/nav";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Brain, Loader2, Scale } from "lucide-react";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

const CYCLING_MESSAGES = [
  "Extracting symptoms...",
  "Analyzing patterns...",
  "Comparing recent history...",
  "Saving results...",
];

export default function LogPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [input, setInput] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusMsg, setStatusMsg] = useState(CYCLING_MESSAGES[0]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const msgRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCount = useRef(0);

  function clearIntervals() {
    if (pollRef.current) clearInterval(pollRef.current);
    if (msgRef.current) clearInterval(msgRef.current);
  }

  useEffect(() => {
    return () => clearIntervals();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;

    setLoading(true);
    setError("");
    setStatusMsg(CYCLING_MESSAGES[0]);
    pollCount.current = 0;

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated. Please sign in again.");

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pets/${id}/logs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ raw_input: input, weight_kg: weightKg ? parseFloat(weightKg) : null }),
      });

      if (!res.ok) throw new Error(await res.text());

      const { job_id } = await res.json();

      // Cycle status messages every 3s
      let msgIndex = 0;
      msgRef.current = setInterval(() => {
        msgIndex = (msgIndex + 1) % CYCLING_MESSAGES.length;
        setStatusMsg(CYCLING_MESSAGES[msgIndex]);
      }, 3000);

      // Poll for job completion every 2s, max 150 polls (300s)
      pollRef.current = setInterval(async () => {
        pollCount.current += 1;

        if (pollCount.current > 150) {
          clearIntervals();
          setError("Analysis is taking too long. Please try again.");
          setLoading(false);
          return;
        }

        try {
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          const pollRes = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/jobs/${job_id}`,
            { headers: { Authorization: `Bearer ${currentSession?.access_token}` } }
          );

          if (!pollRes.ok) return;
          const job = await pollRes.json();

          if (job.status === "done") {
            clearIntervals();
            router.push(`/pets/${id}`);
          } else if (job.status === "error") {
            clearIntervals();
            setError(job.error ?? "Analysis failed. Please try again.");
            setLoading(false);
          }
        } catch {
          // network glitch — keep polling
        }
      }, 2000);

    } catch (err) {
      clearIntervals();
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />

      <main className="max-w-xl mx-auto px-6 py-10">
        <Link href={`/pets/${id}`} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to pet profile
        </Link>

        <div className="bg-white rounded-2xl border border-gray-100 p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
              <Brain className="w-4 h-4 text-emerald-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Log today&apos;s observations</h1>
          </div>
          <p className="text-gray-500 text-sm mb-8">
            Describe what you noticed in plain language. The AI will extract symptoms, behaviors, and mood automatically.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1.5">
              <Label htmlFor="observation">What did you observe?</Label>
              <Textarea
                id="observation"
                placeholder="e.g. Bella was scratching her left ear a lot today and did not finish her dinner. She seemed a bit lethargic in the afternoon but was happy to go for a short walk."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="min-h-[160px] resize-none text-sm"
                required
                disabled={loading}
              />
              <p className="text-xs text-gray-400">
                Write naturally — appetite, energy, bathroom habits, behavior, anything unusual.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="weight" className="flex items-center gap-1.5 text-gray-700">
                <Scale className="w-3.5 h-3.5" />
                Weight today (optional)
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="e.g. 8.5"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  disabled={loading}
                  className="max-w-[140px]"
                />
                <span className="text-sm text-gray-400">kg</span>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <Button
              type="submit"
              disabled={loading || !input.trim()}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-11 gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {statusMsg}
                </>
              ) : (
                "Save log & analyze"
              )}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
            <p className="text-xs text-gray-500 leading-relaxed">
              <strong className="text-gray-700">How it works:</strong> The intake agent extracts symptoms and behaviors. The analysis agent then compares this log to recent history and flags patterns worth monitoring. Results appear on the pet profile when analysis is complete.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
