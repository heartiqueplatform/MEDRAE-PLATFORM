// lib/authManager.ts
import { supabase } from "./supabaseClient";

interface AuthState {
  user: any | null;
  session: any | null;
  loading: boolean;
  initialized: boolean;   // ← NEW: true once auth resolution has completed at least once
}

const USER_KEY = "supabaseUser";
const TOKENS_KEY = "supabaseUserTokens";

async function isReallyOnline(timeoutMs = 3000): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return false;
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

  private manualLogoutInProgress = false;
  private suppressingSignOut = false;
  private lastValidatedAt = 0;

  private constructor() {
    // HYDRATION: read cached user synchronously from localStorage.
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
      loading: false,
      // If we have a cached user, we can consider auth "initialized" immediately
      // for routing purposes. The background refresh will confirm.
      initialized: !!initialUser,
    };
  }

  static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  public markManualLogout(): void {
    this.manualLogoutInProgress = true;
  }

  async initialize(): Promise<void> {
    if (this.subscriptionInitialized) return;
    this.subscriptionInitialized = true;

    supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (event === "SIGNED_OUT") {
        if (this.manualLogoutInProgress) {
          this.clearPersistedState();
          return;
        }
        if (this.suppressingSignOut) return;

        const hadCachedUser = !!this.getUser();
        const online = await isReallyOnline(1500);

        if (!online) {
          this.setState({
            user: this.state.user,
            session: null,
            loading: false,
            initialized: true,
          });
          return;
        }

        if (hadCachedUser && Date.now() - this.lastValidatedAt < 5000) {
          try {
            const { data } = await supabase.auth.getSession();
            if (data?.session?.user) {
              this.persistSession(data.session);
              this.lastValidatedAt = Date.now();
              return;
            }
          } catch {
            this.setState({
              user: this.state.user,
              session: null,
              loading: false,
              initialized: true,
            });
            return;
          }
        }

        this.clearPersistedState();
        return;
      }

      if (newSession?.user) {
        this.persistSession(newSession);
        this.lastValidatedAt = Date.now();
      }
    });

    // Background validation — never blocks UI.
    const reachable = await isReallyOnline();
    if (!reachable) {
      // Offline: trust cache. Mark initialized so routing can proceed.
      this.setState({ initialized: true });
      return;
    }

    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) {
        this.persistSession(data.session);
        this.lastValidatedAt = Date.now();
      } else {
        this.clearPersistedState();
      }
    } catch {
      // Network hiccup — keep cache, mark initialized.
      this.setState({ initialized: true });
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
      } catch { }
    }
    this.setState({ session, user, loading: false, initialized: true });
  }

  private clearPersistedState() {
    try {
      const hadCachedUser = !!localStorage.getItem(USER_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(TOKENS_KEY);
      if (hadCachedUser && !this.manualLogoutInProgress) {
        localStorage.setItem("kicked_out", "true");
      }
    } catch { }

    this.manualLogoutInProgress = false;
    this.lastValidatedAt = 0;

    this.setState({ session: null, user: null, loading: false, initialized: true });
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