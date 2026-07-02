"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PawPrint } from "lucide-react";

type Mode = "signin" | "signup";
type Role = "owner" | "vet";

export default function AuthPage() {
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("owner");
  const [clinicName, setClinicName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleDemoLogin(demoEmail: string, demoPassword: string) {
    setLoading(true);
    setError("");
    setMessage("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email: demoEmail, password: demoPassword });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    const { data: { user: u } } = await supabase.auth.getUser();
    if (u) {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", u.id).single();
      router.push(profile?.role === "vet" ? "/vet/dashboard" : "/dashboard");
    } else {
      router.push("/dashboard");
    }
    router.refresh();
  }

  async function handleGoogleSignIn() {
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    const supabase = createClient();

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            role,
            clinic_name: role === "vet" ? clinicName : undefined,
          },
        },
      });
      if (error) {
        setError(error.message);
      } else {
        setMessage("Check your email to confirm your account, then sign in.");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
      } else {
        // Check role and redirect accordingly
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();
          if (profile?.role === "vet") {
            router.push("/vet/dashboard");
          } else {
            router.push("/dashboard");
          }
        } else {
          router.push("/dashboard");
        }
        router.refresh();
      }
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side — branding (hidden on mobile) */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] shrink-0 bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-700 p-10 text-white">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
            <PawPrint className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight">PawLog</span>
        </div>
        <div>
          <p className="text-emerald-100 text-sm leading-relaxed mb-8 italic">
            &ldquo;PawLog helped me catch my dog&apos;s recurring digestive issues across three months of logs. My vet was impressed.&rdquo;
          </p>
          <div className="space-y-3">
            {[
              "AI-powered symptom tracking",
              "Vet visit summaries in one click",
              "Medication & vaccination reminders",
              "Shareable records for your vet",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2.5 text-sm text-emerald-100">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-300 shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </div>
        <p className="text-emerald-300/70 text-xs">Free forever for personal use</p>
      </div>

      {/* Right side — form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Mobile logo */}
        <Link href="/" className="flex items-center gap-2 mb-8 lg:hidden group">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-md">
            <PawPrint className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-2xl text-foreground">PawLog</span>
        </Link>

        <div className="w-full max-w-[400px]">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-1">
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="text-muted-foreground text-sm">
              {mode === "signin" ? "Sign in to continue to PawLog" : "Start tracking your pet's health for free"}
            </p>
          </div>

          {/* Demo shortcuts */}
          <div className="mb-6 p-3.5 rounded-xl border border-dashed border-border bg-muted/40">
            <p className="text-xs text-muted-foreground font-medium mb-2.5 text-center uppercase tracking-wide">Try a demo account</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDemoLogin("pawlog.e2e@test.local", "PawLogTest2026!")}
                disabled={loading}
                className="flex flex-col items-center gap-1 p-3 rounded-lg bg-card border border-border hover:border-emerald-400 dark:hover:border-emerald-600 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20 transition-all disabled:opacity-50 group"
              >
                <span className="text-xl">🐾</span>
                <span className="text-xs font-semibold text-foreground group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">Pet Owner</span>
                <span className="text-[10px] text-muted-foreground">Demo account</span>
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin("pawlog.vet@test.local", "PawLogVet2026!")}
                disabled={loading}
                className="flex flex-col items-center gap-1 p-3 rounded-lg bg-card border border-border hover:border-teal-400 dark:hover:border-teal-600 hover:bg-teal-50/50 dark:hover:bg-teal-900/20 transition-all disabled:opacity-50 group"
              >
                <span className="text-xl">🩺</span>
                <span className="text-xs font-semibold text-foreground group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">Veterinarian</span>
                <span className="text-[10px] text-muted-foreground">Demo account</span>
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex rounded-xl bg-muted p-1 mb-7">
            <button
              onClick={() => { setMode("signin"); setError(""); setMessage(""); }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                mode === "signin"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Sign in
            </button>
            <button
              onClick={() => { setMode("signup"); setError(""); setMessage(""); }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                mode === "signup"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Create account
            </button>
          </div>

          {/* Google OAuth */}
          <Button
            variant="outline"
            className="w-full mb-5 h-11 gap-3 border-border"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </Button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or continue with email</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Email form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {mode === "signup" && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                {/* Role selection */}
                <div className="space-y-2">
                  <Label className="text-foreground font-medium">I am a</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className={`flex flex-col gap-1 border-2 rounded-xl px-4 py-3 cursor-pointer transition-all ${
                      role === "owner"
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30"
                        : "border-border hover:border-muted-foreground/30"
                    }`}>
                      <div className="flex items-center gap-2">
                        <input type="radio" name="role" value="owner" checked={role === "owner"} onChange={() => setRole("owner")} className="accent-emerald-600" />
                        <span className="text-sm font-semibold text-foreground">🐾 Pet Owner</span>
                      </div>
                      <p className="text-xs text-muted-foreground pl-5">Track health & share with vet</p>
                    </label>
                    <label className={`flex flex-col gap-1 border-2 rounded-xl px-4 py-3 cursor-pointer transition-all ${
                      role === "vet"
                        ? "border-teal-500 bg-teal-50 dark:bg-teal-900/30"
                        : "border-border hover:border-muted-foreground/30"
                    }`}>
                      <div className="flex items-center gap-2">
                        <input type="radio" name="role" value="vet" checked={role === "vet"} onChange={() => setRole("vet")} className="accent-teal-600" />
                        <span className="text-sm font-semibold text-foreground">🩺 Veterinarian</span>
                      </div>
                      <p className="text-xs text-muted-foreground pl-5">View patients & add notes</p>
                    </label>
                  </div>
                </div>

                {role === "vet" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="clinic">Clinic name</Label>
                    <Input
                      id="clinic"
                      type="text"
                      placeholder="Your clinic or practice name"
                      value={clinicName}
                      onChange={(e) => setClinicName(e.target.value)}
                    />
                  </div>
                )}
              </>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                {mode === "signin" && (
                  <Link
                    href="/auth/reset-password"
                    className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300"
                  >
                    Forgot password?
                  </Link>
                )}
              </div>
              <Input
                id="password"
                type="password"
                placeholder={mode === "signup" ? "Min. 8 characters" : "Your password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-lg px-3 py-2">{error}</p>
            )}
            {message && (
              <p className="text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-lg px-3 py-2">{message}</p>
            )}

            <Button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-11 shadow-sm"
              disabled={loading}
            >
              {loading
                ? "Please wait..."
                : mode === "signin"
                ? "Sign in"
                : "Create account"}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground mt-6 text-center">
            By continuing, you agree to our privacy policy.
            <br />
            PawLog does not provide veterinary advice.
          </p>
        </div>
      </div>
    </div>
  );
}
