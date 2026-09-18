import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

// Must match firebase-applet-config.json's firestoreDatabaseId — this project
// does NOT use the "(default)" Firestore database.
const FIRESTORE_DATABASE_ID = "ai-studio-594cf9c4-79be-46f5-b470-815b908e1d16";

let cachedApp: App | null = null;

function getAdminApp(): App {
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

  cachedApp = initializeApp({ credential: cert(serviceAccount as any) });
  return cachedApp;
}

export function getAdminDb(): Firestore {
  return getFirestore(getAdminApp(), FIRESTORE_DATABASE_ID);
}
