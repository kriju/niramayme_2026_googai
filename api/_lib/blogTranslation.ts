import type { Firestore } from "firebase-admin/firestore";

type Lang = "EN" | "DE";
export type BlogDoc = { id: string; slug?: string; lang?: Lang; published?: boolean; translationOf?: string; image?: string; audioUrl?: string; [key: string]: unknown };

// Server-side twin of findTranslation in src/App.tsx: a translated post
// stores its original's id in `translationOf`, so the link is followed
// forwards (translation → original) and backwards (whatever points here).
// Unlinked posts fall back to matching on the same cover image or audio,
// which "Translate to German" copies over unchanged (see App.tsx).
export async function findTranslationAdmin(db: Firestore, post: BlogDoc, target: Lang): Promise<BlogDoc | null> {
  if (post.translationOf) {
    const snap = await db.collection("blogs").doc(post.translationOf).get();
    const data = snap.data() as Omit<BlogDoc, "id"> | undefined;
    if (data?.published && data.lang === target && data.slug) return { id: snap.id, ...data };
  }
  const byField = async (field: string, value: string | undefined): Promise<BlogDoc | null> => {
    if (!value) return null;
    const snapshot = await db
      .collection("blogs")
      .where(field, "==", value)
      .where("lang", "==", target)
      .where("published", "==", true)
      .limit(1)
      .get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    const data = doc.data() as Omit<BlogDoc, "id">;
    return data.slug ? { id: doc.id, ...data } : null;
  };
  return (await byField("translationOf", post.id))
    ?? (await byField("image", typeof post.image === "string" ? post.image : undefined))
    ?? (await byField("audioUrl", typeof post.audioUrl === "string" ? post.audioUrl : undefined));
}

export const blogPath = (lang: Lang, slug: string) => `${lang === "DE" ? "/de" : ""}/blog/${slug}`;
