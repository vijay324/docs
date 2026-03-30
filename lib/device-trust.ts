/**
 * Post-login routing helpers. Org Admin device trust is enforced server-side
 * via `/employees/device-verification/*` and `employeeTrustedDevice` token.
 */

/** Default post-login destination (org dashboard when slug is cached). */
export function getDashboardDefaultPath(): string {
  if (typeof window === "undefined") return "/dashboard";
  const storedOrg = localStorage.getItem("flotick_organization");
  if (storedOrg) {
    try {
      const org = JSON.parse(storedOrg) as { slug?: string };
      if (org?.slug) return `/${org.slug}/dashboard`;
    } catch {
      /* ignore */
    }
  }
  return "/dashboard";
}
