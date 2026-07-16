/**
 * Better Auth React Client
 *
 * Shared auth client used throughout the Next.js frontend.
 * Import `authClient` (or the individual helpers) wherever you need
 * to call auth endpoints or read session state.
 */

import { adminClient, usernameClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  /** Points to the Express backend where Better Auth is mounted */
  baseURL:
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "http://localhost:5002",
  basePath: "/api/auth",
  /** Always send HttpOnly session cookies on cross-origin API calls when CORS allows it. */
  fetchOptions: { credentials: "include" },
  plugins: [usernameClient(), adminClient()],
});

// ─── Convenience re-exports ───
export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
  requestPasswordReset: forgetPassword,
  resetPassword,
} = authClient;
