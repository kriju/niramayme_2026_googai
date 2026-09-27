import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TRANSLATIONS } from "../constants";
import { getAuthErrorCode, useAuth } from "../lib/auth";

type AuthMode = "login" | "signup" | "reset";

const ERROR_KEY_BY_CODE: Record<string, string> = {
  // Recent Firebase projects return invalid-credential (not wrong-password/
  // user-not-found) for any bad email+password pair, precisely so a login
  // form can't be used to enumerate which emails have accounts — showing one
  // generic message for all three keeps that same guarantee either way.
  "auth/invalid-credential": "invalidCredential",
  "auth/wrong-password": "invalidCredential",
  "auth/user-not-found": "invalidCredential",
  "auth/email-already-in-use": "emailInUse",
  "auth/weak-password": "weakPassword",
  "auth/invalid-email": "invalidEmail",
  "auth/too-many-requests": "tooManyRequests",
};

// Firebase itself only requires 6 characters with no complexity; this adds a
// stricter client-side floor (8+ chars, a letter and a number) on top.
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

const inputClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

export const AuthDialog = ({ lang, open, onOpenChange, initialMode = "login" }: {
  lang: "EN" | "DE";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMode?: AuthMode;
}) => {
  const t = TRANSLATIONS[lang].auth;
  const { signUp, logIn, resetPassword } = useAuth();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setError(null);
      setResetSent(false);
    } else {
      // Delay past the close animation so the dialog doesn't visibly reset
      // to a blank form while it's still fading out.
      const timer = setTimeout(() => {
        setName("");
        setEmail("");
        setPassword("");
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [open, initialMode]);

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setError(null);
    setResetSent(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    if (mode === "signup" && !PASSWORD_PATTERN.test(password)) {
      setError(t.errors.weakPassword);
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "login") {
        await logIn(email.trim(), password);
        onOpenChange(false);
      } else if (mode === "signup") {
        await signUp(email.trim(), password, name.trim());
        onOpenChange(false);
      } else {
        await resetPassword(email.trim());
        setResetSent(true);
      }
    } catch (err) {
      const key = ERROR_KEY_BY_CODE[getAuthErrorCode(err)];
      setError(key ? t.errors[key as keyof typeof t.errors] : t.errors.generic);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif">
            {mode === "login" ? t.loginTitle : mode === "signup" ? t.signUpTitle : t.resetTitle}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {mode === "login" ? t.loginDesc : mode === "signup" ? t.signUpDesc : t.resetDesc}
          </p>
        </DialogHeader>

        {mode === "reset" && resetSent ? (
          <div className="space-y-4 py-2">
            <p className="text-sm">{t.resetSuccess}</p>
            <Button type="button" variant="outline" className="rounded-full w-full" onClick={() => switchMode("login")}>
              {t.backToLogin}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid gap-4 py-2">
            {mode === "signup" && (
              <div className="grid gap-2">
                <label className="text-sm font-medium">{t.fields.name}</label>
                <input
                  required
                  autoComplete="name"
                  className={inputClass}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}
            <div className="grid gap-2">
              <label className="text-sm font-medium">{t.fields.email}</label>
              <input
                required
                type="email"
                autoComplete="email"
                className={inputClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {mode !== "reset" && (
              <div className="grid gap-2">
                <label className="text-sm font-medium">{t.fields.password}</label>
                <input
                  required
                  type="password"
                  minLength={8}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  className={inputClass}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                {mode === "signup" && <p className="text-xs text-muted-foreground">{t.passwordHint}</p>}
              </div>
            )}

            {mode === "login" && (
              <button type="button" onClick={() => switchMode("reset")} className="-mt-2 text-left text-sm text-muted-foreground hover:text-primary underline underline-offset-2">
                {t.forgotPassword}
              </button>
            )}

            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

            <Button type="submit" size="lg" className="rounded-full w-full" disabled={submitting}>
              {mode === "login"
                ? (submitting ? t.loginSubmitting : t.loginBtn)
                : mode === "signup"
                ? (submitting ? t.signUpSubmitting : t.signUpBtn)
                : (submitting ? t.resetSubmitting : t.resetBtn)}
            </Button>

            {mode === "login" && (
              <button type="button" onClick={() => switchMode("signup")} className="text-center text-sm text-muted-foreground hover:text-primary underline underline-offset-2">
                {t.switchToSignUp}
              </button>
            )}
            {mode === "signup" && (
              <button type="button" onClick={() => switchMode("login")} className="text-center text-sm text-muted-foreground hover:text-primary underline underline-offset-2">
                {t.switchToLogin}
              </button>
            )}
            {mode === "reset" && (
              <button type="button" onClick={() => switchMode("login")} className="text-center text-sm text-muted-foreground hover:text-primary underline underline-offset-2">
                {t.backToLogin}
              </button>
            )}
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
