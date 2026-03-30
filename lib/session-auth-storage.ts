/**
 * Lightweight client cache for org slug (Better Auth era).
 * Session lives in HttpOnly cookies on the API origin; we only persist
 * `{ slug, _id }` for slug-mismatch redirects after a successful org fetch.
 */

const ORG_CACHE_KEY = "flotick_org_cache";

export const SessionAuthStorage = {
  getUserData(): unknown {
    return null;
  },
  setUserData(_data: unknown): void {},

  getOrganization(): { slug?: string; _id?: string } | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(ORG_CACHE_KEY);
      if (!raw) return null;
      const o = JSON.parse(raw) as { slug?: string; _id?: string };
      return o?.slug ? o : null;
    } catch {
      return null;
    }
  },

  setOrganization(org: { slug?: string; _id?: string } | null): void {
    if (typeof window === "undefined" || !org?.slug) return;
    localStorage.setItem(
      ORG_CACHE_KEY,
      JSON.stringify({ slug: org.slug, _id: org._id }),
    );
  },

  clearAll(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(ORG_CACHE_KEY);
    localStorage.removeItem("flotick_user_data");
    localStorage.removeItem("flotick_organization");
  },
};

export default SessionAuthStorage;
