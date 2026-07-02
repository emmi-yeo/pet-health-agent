import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  HeartPulse, Brain, FileText, Bell, ShieldCheck,
  ChevronRight, PawPrint, Stethoscope, ClipboardList,
  Users, Activity, Star, CheckCircle2,
} from "lucide-react";

const ownerFeatures = [
  {
    icon: Brain,
    title: "AI Pattern Detection",
    description: "Our analysis agent scans logs and flags recurring symptoms before they become serious.",
  },
  {
    icon: FileText,
    title: "Vet Visit Summaries",
    description: "Generate a structured health report with key concerns — ready to bring to your appointment.",
  },
  {
    icon: HeartPulse,
    title: "Daily Health Logs",
    description: "Just describe what you observed in plain language. AI extracts symptoms and mood automatically.",
  },
  {
    icon: Bell,
    title: "Medication Tracking",
    description: "Track medications, doses, and schedules. Get reminders before a dose runs out.",
  },
];

const vetFeatures = [
  {
    icon: ClipboardList,
    title: "Patient Dashboard",
    description: "See all your linked patients in one place. Flagged conditions surface immediately.",
  },
  {
    icon: Activity,
    title: "Full Health Timeline",
    description: "View every log, observation, and symptom your patient's owner has recorded.",
  },
  {
    icon: Stethoscope,
    title: "Clinical Notes",
    description: "Add observations, diagnoses, and treatment plans directly to a patient's record.",
  },
  {
    icon: Users,
    title: "Secure Sharing",
    description: "Owners invite you via email. You accept, get instant access, and can revoke anytime.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="border-b border-border bg-card/80 backdrop-blur-md px-6 py-0 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center shadow-md shadow-emerald-200/50">
              <PawPrint className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">PawLog</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/auth">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">Sign in</Button>
            </Link>
            <Link href="/auth">
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
                Get started free
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative px-6 py-28 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-50/70 via-background to-background dark:from-emerald-950/20 dark:via-background pointer-events-none" />
        <div className="absolute top-[-80px] left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-emerald-400/10 dark:bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative max-w-3xl mx-auto">
          <Badge className="mb-6 bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700/50 hover:bg-emerald-50 shadow-sm text-sm px-4 py-1">
            ✦ AI-Powered Pet Health Journal
          </Badge>
          <h1 className="text-5xl sm:text-6xl font-bold leading-tight mb-6 tracking-tight text-foreground">
            Never forget a symptom
            <br />
            <span className="bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
              your vet needs to know
            </span>
          </h1>
          <p className="text-xl text-muted-foreground mb-10 leading-relaxed max-w-2xl mx-auto">
            PawLog uses AI to track your pet&apos;s daily health, detect patterns in symptoms, and generate structured summaries before every vet visit — so you walk in prepared.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/auth">
              <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 h-12 text-base shadow-lg shadow-emerald-200/50 dark:shadow-emerald-900/30 hover:shadow-xl transition-all">
                Start for free
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
            <Link href="#for-vets">
              <Button size="lg" variant="outline" className="h-12 text-base border-border hover:border-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-400">
                I&apos;m a veterinarian →
              </Button>
            </Link>
          </div>
          <p className="text-sm text-muted-foreground mt-5">Free forever for personal use · No credit card required</p>
        </div>
      </section>

      {/* Trust strip */}
      <section className="bg-muted/50 border-y border-border px-6 py-5">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
          {[
            { icon: ShieldCheck, text: "Private & encrypted" },
            { icon: Brain, text: "Powered by Gemini AI" },
            { icon: PawPrint, text: "Any pet, any species" },
            { icon: Star, text: "Always free for owners" },
          ].map(({ icon: Icon, text }) => (
            <span key={text} className="flex items-center gap-2">
              <Icon className="w-4 h-4 text-emerald-500" />
              {text}
            </span>
          ))}
        </div>
      </section>

      {/* For Pet Owners */}
      <section className="px-6 py-24">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <Badge className="mb-4 bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700/50">For Pet Owners</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Everything your vet wishes you tracked
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Most owners rely on memory. PawLog gives you a complete, AI-organized health history.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {ownerFeatures.map((f) => (
              <div key={f.title} className="group p-6 rounded-2xl border border-border bg-card hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-lg hover:shadow-emerald-100/50 dark:hover:shadow-emerald-900/20 transition-all">
                <div className="w-11 h-11 bg-emerald-50 dark:bg-emerald-900/40 rounded-xl flex items-center justify-center mb-4 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/60 transition-colors">
                  <f.icon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Veterinarians */}
      <section id="for-vets" className="px-6 py-24 bg-muted/30 border-y border-border">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <Badge className="mb-4 bg-teal-50 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-700/50">For Veterinarians</Badge>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-5 leading-tight">
                Your patients, better prepared
              </h2>
              <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
                When owners use PawLog, you get access to weeks or months of detailed daily observations — not just what they can remember in the waiting room.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  "See full health timelines before an appointment",
                  "Add clinical notes and diagnoses to patient records",
                  "Get notified when a flagged patient has new logs",
                  "Review AI-detected patterns across a pet's history",
                ].map((point) => (
                  <li key={point} className="flex items-start gap-3 text-foreground text-sm">
                    <CheckCircle2 className="w-5 h-5 text-teal-500 mt-0.5 shrink-0" />
                    {point}
                  </li>
                ))}
              </ul>
              <Link href="/auth">
                <Button className="bg-teal-600 hover:bg-teal-700 text-white shadow-sm h-11 px-6">
                  Create a free vet account
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {vetFeatures.map((f) => (
                <div key={f.title} className="p-5 rounded-2xl border border-border bg-card hover:border-teal-300 dark:hover:border-teal-700 hover:shadow-md transition-all">
                  <div className="w-10 h-10 bg-teal-50 dark:bg-teal-900/40 rounded-xl flex items-center justify-center mb-3">
                    <f.icon className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                  </div>
                  <h3 className="font-semibold text-foreground text-sm mb-1">{f.title}</h3>
                  <p className="text-muted-foreground text-xs leading-relaxed">{f.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-24">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-foreground mb-4">How it works</h2>
            <p className="text-muted-foreground">Get started in minutes, see value at every vet visit.</p>
          </div>
          <div className="grid md:grid-cols-4 gap-8 relative">
            <div className="hidden md:block absolute top-5 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-border to-transparent" />
            {[
              { step: "01", title: "Add your pet", desc: "Create a profile with breed, age, weight, and medications." },
              { step: "02", title: "Log daily", desc: "Describe what you observed in plain language. AI does the rest." },
              { step: "03", title: "Get insights", desc: "AI detects patterns across logs and flags anything worth watching." },
              { step: "04", title: "Walk in prepared", desc: "One click generates a structured report for your next appointment." },
            ].map((s) => (
              <div key={s.step} className="text-center relative">
                <div className="w-11 h-11 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-200/50 dark:shadow-emerald-900/30">
                  <span className="text-white font-bold text-sm">{s.step}</span>
                </div>
                <h3 className="font-semibold text-foreground mb-2 text-sm">{s.title}</h3>
                <p className="text-muted-foreground text-xs leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24 bg-gradient-to-br from-emerald-600 to-teal-600 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.12),transparent)] pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <div className="relative max-w-xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Your pet can&apos;t tell you what&apos;s wrong.
          </h2>
          <p className="text-emerald-100 text-lg mb-8">
            PawLog helps you notice — so your vet can act.
          </p>
          <Link href="/auth">
            <Button size="lg" className="bg-white text-emerald-700 hover:bg-emerald-50 px-10 h-12 text-base font-semibold shadow-xl">
              Get started — it&apos;s free
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-8 bg-card">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-md flex items-center justify-center">
              <PawPrint className="w-3 h-3 text-white" />
            </div>
            <span className="font-semibold text-foreground">PawLog</span>
          </div>
          <span>Built with Google ADK + Gemini 2.5 Flash</span>
        </div>
      </footer>
    </div>
  );
}
