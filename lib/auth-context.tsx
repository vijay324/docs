"use client";

/**
 * Better Auth React Auth Context
 *
 * Provides `useAuth()` hook for components to check authentication state,
 * sign in, sign out, etc.  Wraps Better Auth's `useSession` hook and adds
 * a few convenience methods.
 */

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
} from "react";
import type { UserRole } from "@/lib/permissions";
import { authClient } from "./auth-client";
import SessionAuthStorage from "./session-auth-storage";

function mapAppRole(role: string | undefined | null): UserRole {
  const r = (role || "employee").toLowerCase();
  if (r === "admin") return "Admin";
  if (r === "manager") return "Manager";
  return "Employee";
}

// ─── Types ───
export interface AuthUser {
  id: string;
  _id: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  role?: any;
  organizationId?: string;
  avatarUrl?: string | null;
  mobileNumber?: string;
  department?: string;
  subDepartment?: string;
  jobTitle?: string;
  jobType?: any;
  workType?: any;
  /** Better Auth user field; kept in sync when Employee onboarding completes. */
  onboardingCompleted?: boolean;
  username: string;
  isActive?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  [key: string]: any;
}

interface AuthContextValue {
  /** The authenticated user, or `null` */
  user: AuthUser | null;
  /** Whether the session is currently being loaded */
  loading: boolean;
  /** Whether the session has finished loading */
  isLoaded: boolean;
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
  /** Sign in with email or username + password */
  login: (identifier: string, password: string) => Promise<{ error?: string }>;
  /** Register a new account */
  register: (data: {
    email: string;
    password: string;
    name: string;
    username?: string;
    [key: string]: unknown;
  }) => Promise<{ error?: string }>;
  /** Sign out (clears session cookie) */
  signOut: () => Promise<void>;
  /** Sign in with Google; optional post-auth redirect (defaults to onboarding). */
  signInWithGoogle: (callbackURL?: string) => Promise<void>;
  /** Refresh the session (re-fetches from server) */
  refreshSession: () => Promise<unknown>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ─── Provider ───
export function AuthProvider({ children }: { children: ReactNode }) {
  const session = authClient.useSession();

  const loading = session.isPending;
  const isLoaded = !session.isPending;

  // ── Login (email or username) ──
  const login = useCallback(async (identifier: string, password: string) => {
    const trimmed = identifier.trim();
    const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
    const result = looksLikeEmail
      ? await authClient.signIn.email({
          email: trimmed.toLowerCase(),
          password,
          // Explicit true ensures the session cookie always receives a Max-Age
          // attribute (matching expiresIn), so it survives browser restarts.
          // Without this, a missing or falsy value could trigger "don't remember
          // me" behaviour and produce a session-only cookie.
          rememberMe: true,
        })
      : await authClient.signIn.username({
          // Usernames are normalized to lowercase at signup.
          username: trimmed.toLowerCase(),
          password,
          rememberMe: true,
        });
    if (result.error) {
      return { error: result.error.message || "Login failed" };
    }
    return {};
  }, []);

  // ── Register ──
  const register = useCallback(
    async (data: {
      email: string;
      password: string;
      name: string;
      username?: string;
      [key: string]: unknown;
    }) => {
      const result = await authClient.signUp.email(data as any);
      if (result.error) {
        return { error: result.error.message || "Registration failed" };
      }
      return {};
    },
    [],
  );

  // ── Sign out ──
  const handleSignOut = useCallback(async () => {
    await authClient.signOut();
    SessionAuthStorage.clearAll();
  }, []);

  // ── Google OAuth ──
  const signInWithGoogle = useCallback(async (callbackURL?: string) => {
    const next =
      callbackURL?.trim() ||
      `${window.location.origin}/auth/onboarding`;
    await authClient.signIn.social({
      provider: "google",
      callbackURL: next,
    });
  }, []);

  // ── Refresh ──
  const refreshSession = useCallback(() => session.refetch(), [session]);

  const value = useMemo<AuthContextValue>(() => {
    const sessionUser = session.data?.user;
    const rawUser = sessionUser as {
      onboardingCompleted?: boolean;
      organizationId?: string;
      role?: string;
      firstName?: string;
      lastName?: string;
      username?: string;
      name?: string;
      id?: string;
    };

    const user = sessionUser
      ? ({
          ...sessionUser,
          _id: sessionUser.id,
          role: mapAppRole(rawUser.role),
          onboardingCompleted: rawUser.onboardingCompleted === true,
          firstName:
            rawUser.firstName || (sessionUser.name || "").split(" ")[0] || "",
          lastName:
            rawUser.lastName ||
            (sessionUser.name || "").split(" ").slice(1).join(" ") ||
            "",
          username:
            rawUser.username ||
            (sessionUser.name || "").replace(/\s+/g, "").toLowerCase() ||
            "",
        } as AuthUser)
      : null;

    const isAuthenticated = !!user;

    return {
      user,
      loading,
      isLoaded,
      isAuthenticated,
      login,
      register,
      signOut: handleSignOut,
      signInWithGoogle,
      refreshSession,
    };
  }, [
    session.data, // Dependency for user and isAuthenticated
    loading,
    isLoaded,
    login,
    register,
    handleSignOut,
    signInWithGoogle,
    refreshSession,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Hook ───
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}

export default AuthProvider;
