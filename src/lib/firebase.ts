import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import productionConfig from '../../firebase-applet-config.json';
import previewConfig from '../../firebase-preview-config.json';

// Vercel preview deployments talk to the separate niramay-me-prev Firebase
// project, so testing a branch never touches the live site's reviews, blog
// posts, bookings or accounts. Production and local dev use the live
// project. VITE_FIREBASE_TARGET is set at build time in vite.config.ts.
const usePreview = import.meta.env.VITE_FIREBASE_TARGET === 'preview' && previewConfig.apiKey !== '';
if (import.meta.env.VITE_FIREBASE_TARGET === 'preview' && !usePreview) {
  console.warn('firebase-preview-config.json is incomplete — this preview is using the live Firebase project.');
}
const firebaseConfig = usePreview ? previewConfig : productionConfig;

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
// Blog image/audio uploads go to Vercel Blob (see api/blog-upload.ts), not
// Firebase Storage — Cloud Storage on Firebase now requires the paid Blaze
// plan, while Vercel Blob's free tier covers this easily and needs no new
// vendor account since the site's already hosted there.
//
// firebase/auth (~270KB) is deliberately not initialized here: only the
// /write admin dashboard signs in, so it imports it from ./firebase-auth
// instead, keeping the auth SDK out of the bundle every other visitor
// downloads.
