import { prisma } from "@/lib/prisma";

// The latest posts of the store's own Instagram account, through Instagram's official API (Instagram API with Instagram Login,
// for Business/Creator accounts). It needs a long-lived access token in the INSTAGRAM_ACCESS_TOKEN variable; without it (or if
// Instagram does not answer) nothing is returned and the homepage falls back to the posts the owner added by hand.
export type InstagramPost = { id: string; image: string; permalink: string; caption: string };

const API = "https://graph.instagram.com";
const TTL = 30 * 60 * 1000; // the feed is read at most every 30 minutes
const RETRY = 5 * 60 * 1000; // after a failure, try again in 5 minutes
const REFRESH_EVERY = 7 * 24 * 60 * 60 * 1000; // the 60-day token is renewed weekly so it never expires
const REFRESHED_KEY = "instagram.tokenRefreshedAt";

let cache: { at: number; posts: InstagramPost[] } | null = null;
let token = "";
let refreshing = false;

async function maybeRefresh() {
  if (refreshing || !token) return;
  refreshing = true;
  try {
    const row = await prisma.siteText.findUnique({ where: { key: REFRESHED_KEY } });
    if (row && Date.now() - Number(row.value) < REFRESH_EVERY) return;
    const res = await fetch(`${API}/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return;
    const j = (await res.json()) as { access_token?: string };
    if (j.access_token) token = j.access_token; // normally the same token with 60 more days
    await prisma.siteText.upsert({ where: { key: REFRESHED_KEY }, create: { key: REFRESHED_KEY, value: String(Date.now()) }, update: { value: String(Date.now()) } });
  } catch {
    // best effort: the token still has days left
  } finally {
    refreshing = false;
  }
}

export async function getInstagramPosts(limit = 8): Promise<InstagramPost[]> {
  const envToken = process.env.INSTAGRAM_ACCESS_TOKEN?.trim() ?? "";
  if (!envToken) return [];
  if (!token) token = envToken;
  if (cache && Date.now() - cache.at < TTL) return cache.posts.slice(0, limit);
  try {
    const fields = "id,caption,media_type,media_url,thumbnail_url,permalink";
    const res = await fetch(`${API}/me/media?fields=${fields}&limit=${Math.min(25, limit * 2)}&access_token=${encodeURIComponent(token)}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(4500),
    });
    if (!res.ok) throw new Error(`instagram ${res.status}`);
    const j = (await res.json()) as { data?: { id: string; caption?: string; media_type?: string; media_url?: string; thumbnail_url?: string; permalink?: string }[] };
    const posts = (j.data ?? [])
      .map((m) => ({
        id: m.id,
        // A video or reel shows its cover; a photo or album shows its (first) picture.
        image: m.media_type === "VIDEO" ? m.thumbnail_url || "" : m.media_url || m.thumbnail_url || "",
        permalink: m.permalink || "",
        caption: (m.caption || "").slice(0, 140),
      }))
      .filter((p) => p.image && p.permalink)
      .slice(0, limit);
    cache = { at: Date.now(), posts };
    void maybeRefresh();
  } catch (e) {
    console.error("[instagram] could not read the feed:", e instanceof Error ? e.message : e);
    // Keep showing the last good result (if any) and try again soon.
    cache = { at: Date.now() - TTL + RETRY, posts: cache?.posts ?? [] };
  }
  return cache.posts.slice(0, limit);
}
