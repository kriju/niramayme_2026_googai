import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

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
