import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAuth, type Auth } from "firebase-admin/auth";

// Must match firebase-applet-config.json's firestoreDatabaseId — the live
// project does NOT use the "(default)" Firestore database. The preview
// project (niramay-me-prev, see firebase-preview-config.json) does.
const PRODUCTION_PROJECT_ID = "gen-lang-client-0204527161";
const PRODUCTION_DATABASE_ID = "ai-studio-594cf9c4-79be-46f5-b470-815b908e1d16";

let cachedApp: App | null = null;

export function getAdminApp(): App {
  if (cachedApp) return cachedApp;
  const existing = getApps();
  if (existing.length) {
    cachedApp = existing[0];
    return cachedApp;
  }

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT env var is not set. Generate a service account key in " +
        "Firebase Console → Project Settings → Service Accounts, and set its JSON " +
        "contents as this Vercel environment variable."
    );
  }

  let serviceAccount: Record<string, unknown>;
  try {
    serviceAccount = JSON.parse(raw);
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT is not valid JSON.");
  }

  cachedApp = initializeApp({
    credential: cert(serviceAccount as any),
    projectId: serviceAccount.project_id as string,
  });
  return cachedApp;
}

// Which project (and so which database) this is depends only on the
// FIREBASE_SERVICE_ACCOUNT Vercel hands this environment: the live project's
// key in Production, the preview project's key in Preview.
export function getProjectId(): string {
  const projectId = getAdminApp().options.projectId;
  if (!projectId) throw new Error("FIREBASE_SERVICE_ACCOUNT has no project_id.");
  return projectId;
}

export function getDatabaseId(): string {
  return getProjectId() === PRODUCTION_PROJECT_ID ? PRODUCTION_DATABASE_ID : "(default)";
}

export function getAdminDb(): Firestore {
  return getFirestore(getAdminApp(), getDatabaseId());
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}
