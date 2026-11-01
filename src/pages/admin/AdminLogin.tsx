import React, { useState } from "react";
import { Lock, ShieldCheck } from "lucide-react";
import {
  getMultiFactorResolver,
  signInWithEmailAndPassword,
  TotpMultiFactorGenerator,
  type MultiFactorError,
  type MultiFactorResolver,
  type User,
} from "firebase/auth";
import { Button } from "@/components/ui/button";
import { auth } from "../../lib/firebase-auth";
import { BLOG_ADMIN_USERNAMES, TRANSLATIONS, usernameToLoginEmail } from "../../constants";
import { adminFetch } from "./adminApi";

const INPUT = "w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all";

// Records the sign-in in the audit log. Best effort: a failure here must not
// stop someone from signing in.
function logSignIn(user: User) {
  adminFetch(user, "signed-in", { method: "POST" }).catch(() => {});
}

export default function AdminLogin() {
  const wt = TRANSLATIONS.EN.write;
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [resolver, setResolver] = useState<MultiFactorResolver | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const normalized = username.trim().toLowerCase();
    if (!(BLOG_ADMIN_USERNAMES as readonly string[]).includes(normalized)) {
      setError(wt.invalidCredentials);
      return;
    }
    setSubmitting(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, usernameToLoginEmail(normalized), password);
      logSignIn(cred.user);
    } catch (err) {
      // Accounts with 2-step login turned on need their authenticator code.
      if ((err as { code?: string }).code === "auth/multi-factor-auth-required") {
        setResolver(getMultiFactorResolver(auth, err as MultiFactorError));
      } else {
        setError(wt.invalidCredentials);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolver) return;
    const hint = resolver.hints.find(h => h.factorId === TotpMultiFactorGenerator.FACTOR_ID);
    if (!hint) {
      setError("This account's second step isn't an authenticator app. Please contact Riju.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const assertion = TotpMultiFactorGenerator.assertionForSignIn(hint.uid, code.replace(/\s+/g, ""));
      const cred = await resolver.resolveSignIn(assertion);
      logSignIn(cred.user);
    } catch {
      setError("That code didn't work. Check the time on your phone and try the newest code.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-6">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-stone-100 shadow-sm p-8">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <img src="/logo.svg" alt="Niramay Wellbeing" className="w-8 h-8" referrerPolicy="no-referrer" />
          <span className="font-serif text-xl font-bold">Niramay Admin</span>
        </div>
        {resolver ? (
          <form onSubmit={handleCode} className="space-y-4">
            <p className="text-sm text-stone-600">Enter the 6-digit code from your authenticator app.</p>
            <input
              required
              autoFocus
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9 ]{6,7}"
              maxLength={7}
              className={`${INPUT} tracking-widest text-center text-lg`}
              value={code}
              onChange={e => setCode(e.target.value)}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full rounded-full gap-2" disabled={submitting}>
              <ShieldCheck className="w-4 h-4" />
              {submitting ? wt.signingIn : "Confirm"}
            </Button>
            <button type="button" className="w-full text-xs text-muted-foreground underline" onClick={() => { setResolver(null); setCode(""); }}>
              Back
            </button>
          </form>
        ) : (
          <form onSubmit={handlePassword} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-600">{wt.usernameLabel}</label>
              <input required autoFocus autoComplete="username" className={INPUT} value={username} onChange={e => setUsername(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-600">{wt.passwordLabel}</label>
              <input required type="password" autoComplete="current-password" className={INPUT} value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full rounded-full gap-2" disabled={submitting}>
              <Lock className="w-4 h-4" />
              {submitting ? wt.signingIn : wt.signIn}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
