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
    // HYDRATION: Look for user in localStorage instantly
    const storedUser =
      typeof window !== "undefined"
        ? localStorage.getItem("supabaseUser")
        : null;

    let initialUser = null;

    try {
      initialUser = storedUser ? JSON.parse(storedUser) : null;
    } catch {
      initialUser = null;
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

    // Listen for auth changes
    supabase.auth.onAuthStateChange((event, newSession) => {
      this.updatePersistedState(newSession);
    });

    // Initial session check
    const {
      data: { session: initialSession },
    } = await supabase.auth.getSession();

    this.updatePersistedState(initialSession);
  }

  // Keep localStorage + state synchronized
  private updatePersistedState(session: any) {
    const user = session?.user ?? null;

    if (user) {
      localStorage.setItem("supabaseUser", JSON.stringify(user));
    } else {
      localStorage.removeItem("supabaseUser");
    }

    this.setState({
      session,
      user,
      loading: false,
    });
  }

  // Get entire auth state
  getState(): AuthState {
    return { ...this.state };
  }

  // ✅ NEW: Get current user directly
  getUser() {
    return this.state.user;
  }

  // ✅ NEW: Get current session directly
  getSession() {
    return this.state.session;
  }

  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  private setState(newState: Partial<AuthState>): void {
    this.state = {
      ...this.state,
      ...newState,
    };

    this.listeners.forEach((listener) => listener(this.state));
  }
}

export const authManager = AuthManager.getInstance();