// lib/authManager.ts
import { supabase } from "./supabaseClient";

interface AuthState {
  user: any | null;
  session: any | null;
  loading: boolean;
}

class AuthManager {
  private static instance: AuthManager;
  private state: AuthState;
  private listeners: Set<(state: AuthState) => void> = new Set();
  private subscriptionInitialized = false;

  private constructor() {
    // HYDRATION: read cached user instantly, offline or online
    let initialUser: any = null;
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("supabaseUser");
        initialUser = stored ? JSON.parse(stored) : null;
      } catch {
        initialUser = null;
      }
    }

    this.state = {
      user: initialUser,
      session: null,
      loading: !initialUser, // if we have a cached user, we're NOT loading
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

    try {
      const { data } = await supabase.auth.getSession();

      if (data?.session?.user) {
        // ✅ Supabase has a real session — persist and let the app through.
        this.persistSession(data.session);
      } else {
        // ⚠️ Supabase has NO session. Critical rule:
        // The Supabase session is the single source of truth for "am I
        // logged in?". If we were holding a cached supabaseUser but
        // Supabase itself has no session, the app is in a half-logged-in
        // state where every request goes out unauthenticated (401) and
        // loaders hang. Clear the cached user so the app consistently
        // logs the user out and lets them sign in cleanly.
        const hadCachedUser = !!this.state.user;
        if (hadCachedUser) {
          try { localStorage.removeItem("supabaseUser"); } catch { /* ignore */ }
        }
        this.setState({ user: null, session: null, loading: false });
      }
    } catch {
      // Network error (offline). If we have a cached user, keep them
      // logged in — they can still browse cached content.
      // If no cached user, we're logged out.
      const hasCached = !!this.state.user;
      if (!hasCached) {
        try { localStorage.removeItem("supabaseUser"); } catch { /* ignore */ }
      }
      this.setState({
        user: hasCached ? this.state.user : null,
        session: null,
        loading: false,
      });
    }
  }

  private persistSession(session: any) {
    const user = session?.user ?? null;
    if (user) {
      try {
        localStorage.setItem("supabaseUser", JSON.stringify(user));
      } catch { }
    }
    this.setState({ session, user, loading: false });
  }

  private clearPersistedState() {
    try {
      localStorage.removeItem("supabaseUser");
    } catch { }
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