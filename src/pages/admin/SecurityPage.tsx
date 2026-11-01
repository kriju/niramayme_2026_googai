import React, { useEffect, useState } from "react";
import { multiFactor, TotpMultiFactorGenerator, type TotpSecret, type User } from "firebase/auth";
import { ShieldCheck, Smartphone } from "lucide-react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";

// Two-step login (TOTP: a 6-digit code from an authenticator app such as
// Google Authenticator, Microsoft Authenticator or 1Password).
//
// Needs "TOTP" switched on for the Firebase project (Authentication with
// Identity Platform → Sign-in method → Multi-factor). Until then, starting
// the setup shows a clear message instead of failing silently.
//
// The QR code is drawn in the browser (qrcode library); the secret never
// goes to any third-party service.

function errorText(code: string | undefined): string {
  switch (code) {
    case "auth/requires-recent-login":
      return "For security, please sign out and sign in again, then start the setup within 5 minutes.";
    case "auth/operation-not-allowed":
    case "auth/admin-restricted-operation":
      return "2-step login isn't switched on for this Firebase project yet. Riju needs to enable TOTP in the Firebase console first.";
    case "auth/invalid-verification-code":
      return "That code didn't work. Try the newest code from the app.";
    default:
      return `Something went wrong (${code ?? "unknown"}).`;
  }
}

export default function SecurityPage({ user, required }: { user: User; required: boolean }) {
  const [enrolled, setEnrolled] = useState(() => multiFactor(user).enrolledFactors.length > 0);
  const [secret, setSecret] = useState<TotpSecret | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!secret) return;
    const url = secret.generateQrCodeUrl(user.email ?? "admin", "Niramay Admin");
    QRCode.toDataURL(url, { margin: 1, width: 220 }).then(setQr).catch(() => setQr(null));
  }, [secret, user.email]);

  const start = async () => {
    setError(null);
    setBusy(true);
    try {
      const session = await multiFactor(user).getSession();
      setSecret(await TotpMultiFactorGenerator.generateSecret(session));
    } catch (err) {
      setError(errorText((err as { code?: string }).code));
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secret) return;
    setError(null);
    setBusy(true);
    try {
      const assertion = TotpMultiFactorGenerator.assertionForEnrollment(secret, code.replace(/\s+/g, ""));
      await multiFactor(user).enroll(assertion, "Authenticator app");
      setEnrolled(true);
      setSecret(null);
    } catch (err) {
      setError(errorText((err as { code?: string }).code));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="font-serif text-2xl font-bold">Security</h1>
      {required && !enrolled && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
          The admin section now requires 2-step login. Set it up below, then sign out and sign in again with your code.
        </p>
      )}
      <section className="rounded-xl border border-stone-200 bg-white p-5 space-y-4">
        <h2 className="font-semibold flex items-center gap-2"><ShieldCheck className="w-5 h-5" /> 2-step login</h2>
        {enrolled ? (
          <p className="text-sm text-green-800">On. You'll be asked for a code from your authenticator app each time you sign in.</p>
        ) : secret ? (
          <form onSubmit={confirm} className="space-y-4 text-sm">
            <ol className="list-decimal pl-5 space-y-2 text-stone-700">
              <li>Open an authenticator app on your phone (e.g. Google Authenticator, Microsoft Authenticator).</li>
              <li>Scan this code, or on your phone tap <a className="underline" href={secret.generateQrCodeUrl(user.email ?? "admin", "Niramay Admin")}>add to authenticator</a>.</li>
            </ol>
            {qr && <img src={qr} alt="QR code for your authenticator app" className="w-[220px] h-[220px] rounded-lg border" />}
            <p className="text-xs text-muted-foreground break-all">Or type this key: <code>{secret.secretKey}</code></p>
            <label className="block space-y-2">
              <span className="font-medium">3. Enter the 6-digit code the app shows</span>
              <input
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={7}
                className="w-40 px-4 py-2 rounded-xl border border-stone-200 tracking-widest text-center"
                value={code}
                onChange={e => setCode(e.target.value)}
              />
            </label>
            {error && <p className="text-red-600">{error}</p>}
            <div className="flex gap-2">
              <Button type="submit" disabled={busy}>{busy ? "Checking…" : "Turn on 2-step login"}</Button>
              <Button type="button" variant="ghost" onClick={() => setSecret(null)}>Cancel</Button>
            </div>
          </form>
        ) : (
          <div className="space-y-3 text-sm">
            <p className="text-stone-700">Off. With it on, a stolen password alone can't open the admin section, where refunds and customer data live.</p>
            {error && <p className="text-red-600">{error}</p>}
            <Button onClick={start} disabled={busy} className="gap-2"><Smartphone className="w-4 h-4" />{busy ? "Starting…" : "Set up 2-step login"}</Button>
          </div>
        )}
      </section>
    </div>
  );
}
