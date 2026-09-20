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

  async initialize(): Promise<void> {
    if (this.subscriptionInitialized) return;
    this.subscriptionInitialized = true;

    // Only an EXPLICIT logout clears the cached user.
    supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === "SIGNED_OUT") {
        this.clearPersistedState();
        return;
      }
      if (newSession?.user) {
        this.persistSession(newSession);
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
      } else {
        // Genuinely online AND Supabase says no session → truly logged out.
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
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(TOKENS_KEY);
    } catch {
      /* ignore */
    }
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