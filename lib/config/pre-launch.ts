/**
 * Pre-Launch Mode Configuration
 *
 * Controls whether the site shows a pre-launch waitlist page or the main landing page.
 * Toggle by setting NEXT_PUBLIC_PRE_LAUNCH environment variable.
 */

/**
 * Whether pre-launch mode is enabled.
 * When true: Root (/) shows waitlist page, landing page at hidden route
 * When false: Root (/) shows main landing page
 */ 
export const PRE_LAUNCH_ENABLED = false;

/**
 * Hidden route path for internal access to the landing page during pre-launch.
 * This allows team members to review and test the full landing page.
 */
export const HIDDEN_LANDING_PATH = "/vijaykumar";

/**
 * Pre-launch page metadata
 */
export const PRE_LAUNCH_CONFIG = {
  title: "Flotick - Coming Soon",
  description:
    "We're not live yet. Join the waitlist to get early beta access to Flotick - the intelligent work management platform for high-performing teams.",
  ctaText: "Join the Early Beta",
  headline: "We're Building Something Amazing",
  subheadline:
    "Flotick is launching soon. Join our exclusive beta waitlist to be among the first to experience intelligent work management.",
  waitlistUrl: "https://waitlist.flotick.com/",
} as const;
