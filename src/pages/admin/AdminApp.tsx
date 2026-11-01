import React, { useEffect, useState } from "react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { CalendarDays, ClipboardList, CreditCard, Home, Inbox, Link2, LogOut, PenSquare, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { auth } from "../../lib/firebase-auth";
import { SITE_URL, useNoIndex, useSeo } from "../../lib/seo";
import { WriteDashboard } from "../WritePage";
import PaymentLinksPanel from "../../components/PaymentLinksPanel";
import AdminLogin from "./AdminLogin";
import DashboardPage from "./DashboardPage";
import AuditLogPage from "./AuditLogPage";
import SecurityPage from "./SecurityPage";
import CoursesListPage from "./CoursesListPage";
import CourseEditorPage from "./CourseEditorPage";
import CourseOverviewPage from "./CourseOverviewPage";
import { AdminApiError, adminFetch, describeError, type WhoAmI } from "./adminApi";

// The admin section (docs/admin-section-design.md). Mounted at /admin/* in
// App.tsx, outside the marketing layout, and lazy-loaded so visitors never
// download it. What a founder may see or do is decided by api/admin.ts on
// every request; this file only arranges the pages.

const NAV: { to: string; label: string; icon: React.ElementType; soon?: string }[] = [
  { to: "/admin", label: "Dashboard", icon: Home },
  { to: "/admin/courses", label: "Courses", icon: CalendarDays },
  { to: "/admin/bookings", label: "Bookings", icon: Inbox, soon: "step 3" },
  { to: "/admin/payments", label: "Payments", icon: CreditCard, soon: "step 4" },
  { to: "/admin/payments/links", label: "Payment links", icon: Link2 },
  { to: "/admin/blog", label: "Blog", icon: PenSquare },
  { to: "/admin/audit", label: "Audit log", icon: ClipboardList },
  { to: "/admin/security", label: "Security", icon: ShieldCheck },
];

function EnvironmentBadge({ environment }: { environment: WhoAmI["environment"] }) {
  return environment === "live" ? (
    <span className="rounded-full bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-1">LIVE</span>
  ) : (
    <span className="rounded-full bg-orange-100 text-orange-800 text-xs font-semibold px-2.5 py-1" title="Vercel preview: preview Firebase project and Stripe test mode">
      PREVIEW · test payments, separate database
    </span>
  );
}

function ComingSoon({ title, step, what }: { title: string; step: string; what: string }) {
  return (
    <div className="space-y-3 max-w-xl">
      <h1 className="font-serif text-2xl font-bold">{title}</h1>
      <p className="text-sm text-muted-foreground">Coming in rollout {step}: {what}</p>
    </div>
  );
}

function Shell({ user, who }: { user: User; who: WhoAmI }) {
  // With 2-step login required but not used in this session, only the
  // Security page works (the API refuses everything else).
  const locked = who.twoFactorRequired && !who.twoFactor;

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="sticky top-0 z-20 bg-white border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">
          <img src="/logo.svg" alt="" className="w-7 h-7" referrerPolicy="no-referrer" />
          <span className="font-serif font-bold">Niramay Admin</span>
          <EnvironmentBadge environment={who.environment} />
          <span className="ml-auto text-sm text-muted-foreground hidden sm:inline">{who.name}</span>
          <Button variant="ghost" size="sm" className="gap-2" onClick={() => signOut(auth)}>
            <LogOut className="w-4 h-4" /> Sign out
          </Button>
        </div>
        {/* Phone: a scrollable row of tabs under the header. */}
        <nav className="md:hidden overflow-x-auto border-t border-stone-100">
          <div className="flex gap-1 px-2 py-1.5 w-max">
            {NAV.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/admin" || item.to === "/admin/payments"}
                className={({ isActive }) => `whitespace-nowrap rounded-full px-3 py-1.5 text-sm ${isActive ? "bg-primary text-primary-foreground" : "text-stone-700"}`}
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>
      </header>
      <div className="max-w-6xl mx-auto px-4 py-6 md:flex md:gap-8">
        <nav className="hidden md:block w-52 shrink-0">
          <ul className="space-y-1 sticky top-20">
            {NAV.map(item => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === "/admin" || item.to === "/admin/payments"}
                  className={({ isActive }) => `flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${isActive ? "bg-white border border-stone-200 font-medium" : "text-stone-700 hover:bg-white"}`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                  {item.soon && <span className="ml-auto text-[10px] uppercase text-muted-foreground">soon</span>}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <main className="flex-1 min-w-0">
          {locked ? (
            <Routes>
              <Route path="security" element={<SecurityPage user={user} required />} />
              <Route path="*" element={<Navigate to="/admin/security" replace />} />
            </Routes>
          ) : (
            <Routes>
              <Route index element={<DashboardPage user={user} />} />
              <Route path="courses" element={<CoursesListPage user={user} />} />
              <Route path="courses/:id" element={<CourseOverviewPage user={user} />} />
              <Route path="courses/:id/edit" element={<CourseEditorPage user={user} />} />
              <Route path="bookings/*" element={<ComingSoon title="Bookings" step="step 3" what="one inbox for every booking, UPI verification and 1:1 appointment scheduling." />} />
              <Route path="payments" element={<ComingSoon title="Payments & invoices" step="step 4" what="refunds, credit notes, the invoice ledger and CSV export for the tax adviser." />} />
              <Route path="payments/links" element={<PaymentLinksPanel user={user} />} />
              <Route path="blog" element={<WriteDashboard user={user} embedded />} />
              <Route path="audit" element={<AuditLogPage user={user} />} />
              <Route path="security" element={<SecurityPage user={user} required={who.twoFactorRequired} />} />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Routes>
          )}
        </main>
      </div>
    </div>
  );
}

export default function AdminApp() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [who, setWho] = useState<WhoAmI | null>(null);
  const [error, setError] = useState<string | null>(null);

  useSeo({ title: "Niramay Admin", description: "", canonical: `${SITE_URL}/admin`, lang: "EN" });
  // Not content for visitors — keep it out of the index entirely.
  useNoIndex();

  useEffect(() => onAuthStateChanged(auth, u => {
    setUser(u);
    setWho(null);
    setError(null);
    setAuthLoading(false);
  }), []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    // Force a fresh token once, so a newly set admin claim is picked up.
    user.getIdToken(true)
      .then(() => adminFetch<WhoAmI>(user, "whoami"))
      .then(w => { if (!cancelled) setWho(w); })
      .catch(err => {
        if (cancelled) return;
        // 2-step required but not used: let them reach the Security page.
        if (err instanceof AdminApiError && err.code === "two_factor_required") {
          setWho({ email: user.email ?? "", name: user.email?.split("@")[0] ?? "", role: "owner", twoFactor: false, twoFactorRequired: true, environment: window.location.hostname.endsWith("niramay.me") ? "live" : "preview" });
        } else {
          setError(describeError(err));
        }
      });
    return () => { cancelled = true; };
  }, [user]);

  if (authLoading) return null;
  if (!user) return <AdminLogin />;
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 px-6">
        <div className="max-w-sm text-center space-y-4">
          <p className="text-sm text-red-600">{error}</p>
          <Button variant="outline" onClick={() => signOut(auth)}>Sign out</Button>
        </div>
      </div>
    );
  }
  if (!who) return null;
  return <Shell user={user} who={who} />;
}
