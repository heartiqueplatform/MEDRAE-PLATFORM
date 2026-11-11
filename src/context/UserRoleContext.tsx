// src/context/UserRoleContext.tsx
"use client";

import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    ReactNode,
} from "react";
import { supabase } from "@/lib/supabaseClient";

interface UserRoleContextType {
    role: string;
    setRole: (role: string) => void;
    refreshRole: () => Promise<void>;
    isLoading: boolean;
}

const UserRoleContext = createContext<UserRoleContextType | undefined>(undefined);

const VALID_ROLES = ["student", "tutor", "staff"] as const;

/* ------------------------------------------------------------------ */
/*  Cache helpers — 5 sources, in priority order                      */
/* ------------------------------------------------------------------ */

function getCachedRole(): string | null {
    if (typeof window === "undefined") return null;

    // 1. last_known_role — most reliable, written on every successful fetch
    try {
        const last = localStorage.getItem("last_known_role");
        if (last && (VALID_ROLES as readonly string[]).includes(last)) {
            return last;
        }
    } catch { }

    // 2. medrae_profile_cache
    try {
        const profileCache = localStorage.getItem("medrae_profile_cache");
        if (profileCache) {
            const parsed = JSON.parse(profileCache);
            const cachedRole = String(parsed?.role || "").toLowerCase();
            if (cachedRole === "tutor") return "tutor";
            if (cachedRole === "staff") return "staff";
            if (cachedRole === "student") return "student";
        }
    } catch { }

    // 3. app_user_profile_cache (used by App.tsx)
    try {
        const appCache = localStorage.getItem("app_user_profile_cache");
        if (appCache) {
            const parsed = JSON.parse(appCache);
            const cachedRole = String(parsed?.data?.role || "").toLowerCase();
            if (cachedRole === "tutor") return "tutor";
            if (cachedRole === "staff") return "staff";
            if (cachedRole === "student") return "student";
        }
    } catch { }

    // 4. userProfile (legacy)
    try {
        const legacy = localStorage.getItem("userProfile");
        if (legacy) {
            const parsed = JSON.parse(legacy);
            const cachedRole = String(parsed?.role || "").toLowerCase();
            if (cachedRole === "tutor") return "tutor";
            if (cachedRole === "staff") return "staff";
            if (cachedRole === "student") return "student";
        }
    } catch { }

    // 5. 🆕 Supabase auth session user_metadata — works offline
    try {
        const sbKey = Object.keys(localStorage).find(
            (k) => k.startsWith("sb-") && k.endsWith("-auth-token")
        );
        if (sbKey) {
            const raw = localStorage.getItem(sbKey);
            if (raw) {
                const parsed = JSON.parse(raw);
                const metaRole = parsed?.user?.user_metadata?.role;
                if (
                    metaRole === "tutor" ||
                    metaRole === "student" ||
                    metaRole === "staff"
                ) {
                    return metaRole;
                }
            }
        }
    } catch { }

    return null;
}

function getCachedRoleForUser(userId: string | null): string | null {
    if (!userId || typeof window === "undefined") return null;
    try {
        const stored = localStorage.getItem(`userRole_${userId}`);
        if (stored && (VALID_ROLES as readonly string[]).includes(stored)) {
            return stored;
        }
    } catch { }
    return null;
}

function persistRole(userId: string | null, role: string) {
    if (typeof window === "undefined") return;
    try {
        localStorage.setItem("last_known_role", role);
        if (userId) localStorage.setItem(`userRole_${userId}`, role);
    } catch { }
}

/* ------------------------------------------------------------------ */
/*  Provider                                                          */
/* ------------------------------------------------------------------ */

export function UserRoleProvider({ children }: { children: ReactNode }) {
    const [role, setRoleState] = useState<string>(() => {
        return getCachedRole() || "student";
    });

    const [isLoading, setIsLoading] = useState<boolean>(() => {
        if (typeof window === "undefined") return true;
        try {
            return !getCachedRole();
        } catch {
            return true;
        }
    });

    const setRole = useCallback((newRole: string) => {
        if (!newRole) return;
        setRoleState(newRole);
        persistRole(null, newRole);
    }, []);

    const refreshRole = useCallback(async () => {
        try {
            // 🔧 OFFLINE GUARD — don't even try if we know we're offline
            if (typeof navigator !== "undefined" && navigator.onLine === false) {
                // Keep whatever the cache gave us
                setIsLoading(false);
                return;
            }

            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                setIsLoading(false);
                return;
            }

            // Per-user cache — instant
            const perUser = getCachedRoleForUser(user.id);
            if (perUser) {
                setRoleState(perUser);
                persistRole(user.id, perUser);
            }

            // Verify with DB
            const { data: profile, error } = await supabase
                .from("profiles")
                .select("role")
                .eq("user_id", user.id)
                .single();

            if (error) {
                console.error("Error fetching role:", error);
                // 🔧 Network error — keep cached role, don't reset to "student"
                setIsLoading(false);
                return;
            }

            if (profile?.role) {
                setRoleState(profile.role);
                persistRole(user.id, profile.role);
            }
        } catch (error) {
            console.error("Error in refreshRole:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshRole();

        // 🔧 Re-fetch when we come back online
        const onOnline = () => {
            refreshRole();
        };
        window.addEventListener("online", onOnline);

        const handleRoleChange = (event: Event) => {
            const customEvent = event as CustomEvent;
            const newRole = customEvent.detail?.role;
            const userId = customEvent.detail?.userId;
            if (newRole) {
                setRoleState(newRole);
                persistRole(userId || null, newRole);

                setTimeout(() => {
                    window.location.reload();
                }, 500);
            }
        };

        const handleProfileUpdate = (event: Event) => {
            const customEvent = event as CustomEvent;
            const updatedProfile = customEvent.detail;
            if (updatedProfile?.role) {
                setRoleState(updatedProfile.role);
                persistRole(updatedProfile.user_id || null, updatedProfile.role);
            }
        };

        const handleStorage = (event: StorageEvent) => {
            if (event.key === "last_known_role" && event.newValue) {
                if ((VALID_ROLES as readonly string[]).includes(event.newValue)) {
                    setRoleState(event.newValue);
                }
            }
        };

        window.addEventListener("roleChanged", handleRoleChange);
        window.addEventListener("profileUpdated", handleProfileUpdate);
        window.addEventListener("storage", handleStorage);

        return () => {
            window.removeEventListener("online", onOnline);
            window.removeEventListener("roleChanged", handleRoleChange);
            window.removeEventListener("profileUpdated", handleProfileUpdate);
            window.removeEventListener("storage", handleStorage);
        };
    }, [refreshRole]);

    return (
        <UserRoleContext.Provider value={{ role, setRole, refreshRole, isLoading }}>
            {children}
        </UserRoleContext.Provider>
    );
}

export function useUserRole() {
    const context = useContext(UserRoleContext);
    if (!context) {
        throw new Error("useUserRole must be used within a UserRoleProvider");
    }
    return context;
}