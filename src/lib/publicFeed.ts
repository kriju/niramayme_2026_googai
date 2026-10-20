import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { db } from './firebase';

// The homepage's published-post list and approved reviews come from
// /api/public-feed (api/_lib/publicFeed.ts), which the CDN caches, rather
// than from Firestore directly: a direct query costs one read per document
// for every single visitor. If the endpoint can't be reached (plain
// `vite` dev has no /api, or the function is down) this falls back to the
// same Firestore queries the page used before.
//
// Results are also kept in memory for a few minutes, so the two sections
// that show reviews share one request and moving around the site doesn't
// refetch.

const MEMO_MS = 5 * 60 * 1000;
const memo = new Map<string, { at: number; promise: Promise<any[]> }>();

function remember(key: string, load: () => Promise<any[]>): Promise<any[]> {
  const hit = memo.get(key);
  if (hit && Date.now() - hit.at < MEMO_MS) return hit.promise;
  const promise = load();
  memo.set(key, { at: Date.now(), promise });
  promise.catch(() => memo.delete(key));
  return promise;
}

// Rebuilds the Timestamp-like shape the components expect from the
// { millis } the API sends (same as readEmbeddedPost in src/App.tsx).
function revive(item: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = { ...item };
  for (const [key, value] of Object.entries(item)) {
    if (value && typeof value === 'object' && typeof value.millis === 'number' && Object.keys(value).length === 1) {
      const millis = value.millis;
      out[key] = { toDate: () => new Date(millis), toMillis: () => millis };
    }
  }
  return out;
}

async function fromApi(params: string): Promise<any[]> {
  const response = await fetch(`/api/public-feed?${params}`, { headers: { accept: 'application/json' } });
  if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
    throw new Error(`public-feed ${response.status}`);
  }
  const body = await response.json();
  if (!Array.isArray(body?.items)) throw new Error('public-feed: unexpected response');
  return body.items.map(revive);
}

async function withFallback(params: string, direct: () => Promise<any[]>): Promise<any[]> {
  try {
    return await fromApi(params);
  } catch (error) {
    console.warn('Falling back to Firestore for', params, error);
    return direct();
  }
}

export function loadPublishedBlogs(lang: 'EN' | 'DE'): Promise<any[]> {
  return remember(`blogs:${lang}`, () => withFallback(`kind=blogs&lang=${lang}`, async () => {
    // Public visitors only ever see published posts — see the isBlogAdmin()
    // OR clause in firestore.rules that additionally lets Richa/Riju read
    // their own drafts from the /write dashboard.
    const snapshot = await getDocs(query(
      collection(db, 'blogs'),
      where('lang', '==', lang),
      where('published', '==', true),
      orderBy('createdAt', 'desc'),
    ));
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  }));
}

export function loadApprovedReviews(): Promise<any[]> {
  return remember('reviews', () => withFallback('kind=reviews', async () => {
    const snapshot = await getDocs(query(collection(db, 'reviews'), where('approved', '==', true), orderBy('createdAt', 'desc')));
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  }));
}
