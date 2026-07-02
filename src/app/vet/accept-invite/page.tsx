"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Nav } from "@/components/nav";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error" | "unauthenticated">("loading");
  const [petName, setPetName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [userEmail, setUserEmail] = useState<string | undefined>();
  const [userName, setUserName] = useState<string | undefined>();

  useEffect(() => {
    async function accept() {
      if (!token) {
        setStatus("error");
        setErrorMsg("No invite token found in the URL.");
        return;
      }

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) { setStatus("unauthenticated"); return; }

      setUserEmail(user.email);
      setUserName(user.user_metadata?.full_name);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setStatus("unauthenticated"); return; }

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/vet/accept-invite?token=${encodeURIComponent(token)}`,
          { headers: { Authorization: `Bearer ${session.access_token}` } }
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.detail ?? "Failed to accept invitation.");
        }
        const data = await res.json();
        setPetName(data.pet_name ?? "the pet");
        setStatus("success");
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
        setStatus("error");
      }
    }
    accept();
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav userEmail={userEmail} userName={userName} userRole="vet" />
      <main className="max-w-md mx-auto px-6 py-20">
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
          {status === "loading" && (
            <>
              <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mx-auto mb-4" />
              <h1 className="text-lg font-semibold text-gray-900">Accepting invitation...</h1>
            </>
          )}
          {status === "success" && (
            <>
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
              <h1 className="text-xl font-bold text-gray-900 mb-2">Access granted</h1>
              <p className="text-gray-500 text-sm mb-6">
                You now have access to <strong>{petName}</strong>&apos;s health records on PawLog.
              </p>
              <Link href="/vet/dashboard" className="inline-flex items-center px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors">
                Go to vet dashboard
              </Link>
            </>
          )}
          {status === "error" && (
            <>
              <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <h1 className="text-xl font-bold text-gray-900 mb-2">Invitation error</h1>
              <p className="text-gray-500 text-sm mb-6">{errorMsg}</p>
              <Link href="/vet/dashboard" className="inline-flex items-center px-5 py-2.5 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors">
                Go to dashboard
              </Link>
            </>
          )}
          {status === "unauthenticated" && (
            <>
              <XCircle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
              <h1 className="text-xl font-bold text-gray-900 mb-2">Sign in required</h1>
              <p className="text-gray-500 text-sm mb-6">
                You need to sign in to accept this invitation.
              </p>
              <Link href={`/auth?next=/vet/accept-invite?token=${encodeURIComponent(token ?? "")}`} className="inline-flex items-center px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors">
                Sign in to PawLog
              </Link>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    }>
      <AcceptInviteContent />
    </Suspense>
  );
}
