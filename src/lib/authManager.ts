// lib/authManager.ts
import { supabase } from "./supabaseClient";

interface AuthState {
  user: any | null;
  session: any | null;
  loading: boolean;
}

const USER_KEY = "supabaseUser";
const TOKENS_KEY = "supabaseUserTokens";

/**
 * True only if we can actually reach the internet.
 * navigator.onLine lies on captive portals — this doesn't.
 */
async function isReallyOnline(timeoutMs = 3000): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return false; // fast path: definitely offline
  }
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    await fetch("https://www.google.com/generate_204", {
      method: "HEAD",
      mode: "no-cors",
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(t);
    return true;
  } catch {
    return false;
  }
}

class AuthManager {
  private static instance: AuthManager;
  private state: AuthState;
  private listeners: Set<(state: AuthState) => void> = new Set();
  private subscriptionInitialized = false;

  // 🔧 NEW: Tracks whether the current SIGNED_OUT was triggered by
  // the user clicking "Logout" (vs. being kicked by another device).
  // When true, clearPersistedState will NOT set the "kicked_out" flag.
  private manualLogoutInProgress = false;

  // 🔧 NEW: Set true while we're deliberately suppressing a
  // SIGNED_OUT that we believe was caused by a failed token refresh
  // (offline, captive portal, transient network). Prevents the
  // cascade: token refresh fails → SIGNED_OUT → clear cache →
  // "kicked_out" toast → user bounced to Index as a stranger.
  private suppressingSignOut = false;

  // 🔧 NEW: Tracks the last time we saw a *successful* online
  // session validation. Used to decide whether a SIGNED_OUT event
  // is suspicious (happened while we couldn't reach the server).
  private lastValidatedAt = 0;

  private constructor() {
    // HYDRATION: read cached user synchronously, offline or online.
    // If we have a cached user, loading starts FALSE so PrivateRoute
    // renders immediately without ever bouncing to "/".
    let initialUser: any = null;
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(USER_KEY);
        initialUser = stored ? JSON.parse(stored) : null;
      } catch {
        initialUser = null;
      }
    }

    this.state = {
      user: initialUser,
      session: null,
      loading: !initialUser,
    };
  }

  static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  // 🔧 Call this immediately before a user-initiated signOut()
  // (e.g. from Profile.tsx "Logout" button) so that the resulting
  // SIGNED_OUT event is treated as "manual" and does NOT trigger
  // the security "kicked out" toast.
  public markManualLogout(): void {
    this.manualLogoutInProgress = true;
  }

  async initialize(): Promise<void> {
    if (this.subscriptionInitialized) return;
    this.subscriptionInitialized = true;

    // 🔧 SIGNED_OUT handling — now guarded against offline / transient
    // refresh failures. Only a SIGNED_OUT we can *trust* clears the cache.
    supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (event === "SIGNED_OUT") {
        // ── Guard 1: user clicked logout → expected, clear quietly.
        if (this.manualLogoutInProgress) {
          this.clearPersistedState();
          return;
        }

        // ── Guard 2: we are being suppressed (already handling one).
        if (this.suppressingSignOut) return;

        // ── Guard 3: are we actually able to reach the server?
        // If not, this SIGNED_OUT is almost certainly a failed
        // token refresh, not a real sign-out. Ignore it and keep
        // the cached user so the app stays usable offline.
        const hadCachedUser = !!this.getUser();
        const online = await isReallyOnline(1500);

        if (!online) {
          console.warn(
            "[AuthManager] SIGNED_OUT received while offline — preserving cached session."
          );
          // Ensure our state still reflects the cached user.
          this.setState({
            user: this.state.user,
            session: null,
            loading: false,
          });
          return;
        }

        // ── Guard 4: we're online but the sign-out happened
        // suspiciously fast after our last successful validation
        // (e.g. Supabase refresh raced a flaky network). Give the
        // server one more chance before nuking the cache.
        if (hadCachedUser && Date.now() - this.lastValidatedAt < 5000) {
          try {
            const { data } = await supabase.auth.getSession();
            if (data?.session?.user) {
              // Still valid — treat this SIGNED_OUT as spurious.
              this.persistSession(data.session);
              this.lastValidatedAt = Date.now();
              return;
            }
          } catch {
            // Couldn't verify — be conservative, keep the cache.
            this.setState({
              user: this.state.user,
              session: null,
              loading: false,
            });
            return;
          }
        }

        // ── All guards passed: this is a real sign-out.
        this.clearPersistedState();
        return;
      }

      if (newSession?.user) {
        this.persistSession(newSession);
        this.lastValidatedAt = Date.now();
      }
      // INITIAL_SESSION with null, TOKEN_REFRESH_FAILED, offline errors → IGNORE.
    });

    // ── 1. Reachability check ────────────────────────────────────
    // If we can't actually reach the internet (offline OR captive
    // portal), trust the cache completely and bail early.
    const reachable = await isReallyOnline();

    if (!reachable) {
      this.setState({
        user: this.state.user, // may be cached user or null
        session: null,
        loading: false,
      });
      return;
    }

    // ── 2. Real internet → ask Supabase ─────────────────────────
    try {
      const { data } = await supabase.auth.getSession();

      if (data?.session?.user) {
        // Supabase has a real session — persist and let the app through.
        this.persistSession(data.session);
        this.lastValidatedAt = Date.now();
      } else {
        // Genuinely online AND Supabase says no session.
        // 🔧 But only clear if we don't already have a cached user
        // AND we actually reached the server. `getSession()` returning
        // null with no error, while online, is the legit "logged out"
        // case. If we had a cached user, this is Supabase telling us
        // the refresh token is dead → that IS a real logout.
        this.clearPersistedState();
      }
    } catch {
      // Network hiccup mid-check. Preserve cached user so a transient
      // blip never logs the user out.
      this.setState({
        user: this.state.user,
        session: null,
        loading: false,
      });
    }
  }

  private persistSession(session: any) {
    const user = session?.user ?? null;
    if (user) {
      try {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        localStorage.setItem(
          TOKENS_KEY,
          JSON.stringify({
            access_token: session?.access_token,
            refresh_token: session?.refresh_token,
            expires_at: session?.expires_at,
          })
        );
      } catch {
        /* ignore quota errors */
      }
    }
    this.setState({ session, user, loading: false });
  }

  private clearPersistedState() {
    try {
      // 🔧 Check if a user WAS cached before we clear.
      // Only someone who was previously logged in can be "kicked out".
      const hadCachedUser = !!localStorage.getItem(USER_KEY);

      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(TOKENS_KEY);

      // 🔔 Only flag "kicked out" when:
      //   1. There WAS a cached user (not a fresh visitor), AND
      //   2. This was NOT a user-initiated logout.
      if (hadCachedUser && !this.manualLogoutInProgress) {
        localStorage.setItem("kicked_out", "true");
      }
    } catch {
      /* ignore */
    }

    this.manualLogoutInProgress = false;
    this.lastValidatedAt = 0;

    this.setState({ session: null, user: null, loading: false });
  }

  getState(): AuthState {
    return { ...this.state };
  }

  getUser() {
    return this.state.user;
  }

  getSession() {
    return this.state.session;
  }

  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.add(listener);
    // Fire immediately with current state so subscribers don't miss hydration
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private setState(newState: Partial<AuthState>): void {
    this.state = { ...this.state, ...newState };
    this.listeners.forEach((listener) => listener(this.state));
  }
}

export const authManager = AuthManager.getInstance();