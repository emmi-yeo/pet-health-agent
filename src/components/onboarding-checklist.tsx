"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CheckCircle, Circle, X, ChevronRight } from "lucide-react";

interface Step {
  id: string;
  title: string;
  description: string;
  href: string;
  cta: string;
  done: boolean;
}

interface Props {
  hasPets: boolean;
  hasLogs: boolean;
  hasShares: boolean;
  firstPetId?: string;
}

export function OnboardingChecklist({ hasPets, hasLogs, hasShares, firstPetId }: Props) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(localStorage.getItem("onboarding-dismissed") === "1");
  }, []);

  const steps: Step[] = [
    {
      id: "pet",
      title: "Add your first pet",
      description: "Create a profile with your pet's details.",
      href: "/pets/new",
      cta: "Add pet",
      done: hasPets,
    },
    {
      id: "log",
      title: "Log a health observation",
      description: "Describe what you noticed — the AI extracts the details.",
      href: firstPetId ? `/pets/${firstPetId}/log` : "/dashboard",
      cta: "Log now",
      done: hasLogs,
    },
    {
      id: "share",
      title: "Share with your vet",
      description: "Invite your vet to view records and add clinical notes.",
      href: firstPetId ? `/pets/${firstPetId}/share` : "/dashboard",
      cta: "Share",
      done: hasShares,
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const allDone = completedCount === steps.length;

  if (dismissed || allDone) return null;

  function dismiss() {
    localStorage.setItem("onboarding-dismissed", "1");
    setDismissed(true);
  }

  return (
    <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm overflow-hidden mb-8">
      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-white">Get started with PawLog</h2>
          <p className="text-emerald-100 text-sm mt-0.5">{completedCount} of {steps.length} steps complete</p>
        </div>
        <button onClick={dismiss} className="text-emerald-200 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-emerald-50">
        <div
          className="h-full bg-emerald-500 transition-all duration-500"
          style={{ width: `${(completedCount / steps.length) * 100}%` }}
        />
      </div>

      <div className="divide-y divide-gray-50">
        {steps.map((step) => (
          <div key={step.id} className={`flex items-center gap-4 px-6 py-4 ${step.done ? "opacity-60" : ""}`}>
            {step.done ? (
              <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
            ) : (
              <Circle className="w-5 h-5 text-gray-300 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${step.done ? "line-through text-gray-400" : "text-gray-900"}`}>
                {step.title}
              </p>
              {!step.done && <p className="text-xs text-gray-500 mt-0.5">{step.description}</p>}
            </div>
            {!step.done && (
              <Link
                href={step.href}
                className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 shrink-0"
              >
                {step.cta}
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
