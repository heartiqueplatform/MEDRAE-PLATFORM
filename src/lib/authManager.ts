/**
 * Singleton Auth Manager
 * Ensures only ONE auth state listener and prevents repeated session checks
 */

import { supabase } from "./supabaseClient";

interface AuthState {
  user: any | null;
  session: any | null;
  loading: boolean;
}

class AuthManager {
  private static instance: AuthManager;
  private state: AuthState = {
    user: null,
    session: null,
    loading: true,
  };

  private listeners: Set<(state: AuthState) => void> = new Set();
  private subscriptionInitialized = false;

  /**
   * Get singleton instance
   */
  static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  /**
   * Initialize auth listener (called once on app startup)
   */
  async initialize(): Promise<void> {
    if (this.subscriptionInitialized) return;
    this.subscriptionInitialized = true;

    // Set up ONE auth state change listener for entire app
    supabase.auth.onAuthStateChange((event, newSession) => {
      this.setState({
        session: newSession,
        user: newSession?.user ?? null,
        loading: false,
      });
    });

    // Get initial session (only once)
    const { data: { session: initialSession } } = await supabase.auth.getSession();
    this.setState({
      session: initialSession,
      user: initialSession?.user ?? null,
      loading: false,
    });
  }

  /**
   * Get current auth state
   */
  getState(): AuthState {
    return { ...this.state };
  }

  /**
   * Subscribe to auth state changes
   */
  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Update state and notify listeners
   */
  private setState(newState: Partial<AuthState>): void {
    this.state = { ...this.state, ...newState };
    this.listeners.forEach((listener) => listener(this.state));
  }

  /**
   * Get just the user
   */
  getUser() {
    return this.state.user;
  }

  /**
   * Get just the session
   */
  getSession() {
    return this.state.session;
  }

  /**
   * Check if loading
   */
  isLoading(): boolean {
    return this.state.loading;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.state.user;
  }

  /**
   * Get user ID (shortcut)
   */
  getUserId(): string | null {
    return this.state.user?.id ?? null;
  }
}

export const authManager = AuthManager.getInstance();
