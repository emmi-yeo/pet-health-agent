"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PawPrint, LayoutDashboard, LogOut, Plus, User, Menu, X, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DarkModeToggle } from "@/components/dark-mode-toggle";

interface NavProps {
  userEmail?: string;
  userName?: string;
  userRole?: "owner" | "vet";
}

export function Nav({ userEmail, userName, userRole = "owner" }: NavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const initials = userName
    ? userName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : userEmail?.[0]?.toUpperCase() ?? "?";

  const dashboardHref = userRole === "vet" ? "/vet/dashboard" : "/dashboard";
  const dashboardLabel = userRole === "vet" ? "Patients" : "Dashboard";
  const DashboardIcon = userRole === "vet" ? Stethoscope : LayoutDashboard;

  return (
    <nav className="border-b border-border bg-card/90 backdrop-blur-md px-6 py-0 sticky top-0 z-50 shadow-sm">
      <div className="max-w-6xl mx-auto flex items-center justify-between h-16">
        {/* Left: logo + nav links */}
        <div className="flex items-center gap-8">
          <Link href={dashboardHref} className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center shadow-md shadow-emerald-200/50 dark:shadow-emerald-900/30 group-hover:scale-105 transition-transform">
              <PawPrint className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="font-bold text-lg text-foreground tracking-tight">PawLog</span>
            {userRole === "vet" && (
              <span className="text-xs bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-700/50 rounded-full px-2 py-0.5 font-medium">Vet</span>
            )}
          </Link>

          <div className="hidden sm:flex items-center gap-1">
            <Link
              href={dashboardHref}
              className={`flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg transition-all ${
                pathname === dashboardHref
                  ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <DashboardIcon className="w-3.5 h-3.5" />
              {dashboardLabel}
            </Link>
          </div>
        </div>

        {/* Right: desktop actions */}
        <div className="hidden sm:flex items-center gap-1.5">
          <DarkModeToggle />
          {userRole === "owner" && (
            <Link href="/pets/new">
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white gap-1.5 shadow-sm h-8 text-xs font-medium ml-1">
                <Plus className="w-3.5 h-3.5" />
                Add pet
              </Button>
            </Link>
          )}
          <Link href="/account" className="ml-1 hover:opacity-80 transition-opacity">
            <Avatar className="w-8 h-8 cursor-pointer ring-2 ring-transparent hover:ring-emerald-400/50 dark:hover:ring-emerald-500/50 transition-all">
              <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Link>
          <button
            onClick={signOut}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Mobile: hamburger */}
        <div className="sm:hidden flex items-center gap-1">
          <DarkModeToggle />
          <button
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="sm:hidden border-t border-border py-2 space-y-0.5 pb-3">
          <Link
            href={dashboardHref}
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-foreground hover:bg-muted transition-colors font-medium"
          >
            <DashboardIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            {dashboardLabel}
          </Link>
          {userRole === "owner" && (
            <Link
              href="/pets/new"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-foreground hover:bg-muted transition-colors"
            >
              <Plus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Add pet
            </Link>
          )}
          <Link
            href="/account"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-foreground hover:bg-muted transition-colors"
          >
            <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Account
          </Link>
          <button
            onClick={() => { setMenuOpen(false); signOut(); }}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted w-full text-left transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      )}
    </nav>
  );
}
