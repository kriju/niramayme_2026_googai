import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "./firebase";

export type UserProfile = { displayName: string; email: string };

type AuthContextValue = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  logIn: (email: string, password: string) => Promise<void>;
  logOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// firebase/auth (~270KB) is loaded lazily here for the same reason
// ./firebase-auth.ts is only statically imported from the /write admin
// page: most visitors never touch login/signup, so this keeps the SDK out
// of the bundle they download. Every AuthProvider method funnels through
// this one loader so the dynamic import only ever resolves once.
async function loadAuth() {
  const [authFns, { auth }] = await Promise.all([
    import("firebase/auth"),
    import("./firebase-auth"),
  ]);
  return { ...authFns, auth };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    loadAuth().then(({ onAuthStateChanged, auth }) => {
      if (cancelled) return;
      unsubscribe = onAuthStateChanged(auth, (u) => {
        setUser(u);
        setLoading(false);
      });
    });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    // Own profile doc only — firestore.rules deny reading any other uid's.
    return onSnapshot(doc(db, "users", user.uid), (snap) => {
      const data = snap.data();
      if (data) setProfile({ displayName: data.displayName ?? "", email: data.email ?? "" });
    });
  }, [user]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    profile,
    loading,
    async signUp(email, password, displayName) {
      const { createUserWithEmailAndPassword, updateProfile, auth } = await loadAuth();
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName });
      // Store email from the auth credential, not the raw form input —
      // firestore.rules requires it to match request.auth.token.email.
      await setDoc(doc(db, "users", cred.user.uid), {
        displayName,
        email: cred.user.email,
        createdAt: serverTimestamp(),
      });
    },
    async logIn(email, password) {
      const { signInWithEmailAndPassword, auth } = await loadAuth();
      await signInWithEmailAndPassword(auth, email, password);
    },
    async logOut() {
      const { signOut, auth } = await loadAuth();
      await signOut(auth);
    },
    async resetPassword(email) {
      const { sendPasswordResetEmail, auth } = await loadAuth();
      await sendPasswordResetEmail(auth, email);
    },
  }), [user, profile, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

// Firebase throws errors shaped like { code: "auth/..." }; anything else
// (network failure, etc.) falls back to a generic error key.
export function getAuthErrorCode(err: unknown): string {
  return typeof err === "object" && err !== null && "code" in err
    ? String((err as { code: unknown }).code)
    : "unknown";
}
