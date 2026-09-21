// lib/subscription.ts
import { supabase } from "@/lib/supabaseClient";

const CACHE_KEY = "subscriptionStatus";     // ← unify on the key the unit page already uses
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24h
const MIN_FETCH_INTERVAL = 60 * 60 * 1000;  // 1h

export type SubscriptionSnapshot = {
    userId: string | null;
    isPremium: boolean;
    plan_type: string;
    expires_at: string | null;
    cachedAt: number;
};

let inFlight: Promise<SubscriptionSnapshot> | null = null;
let lastFetch = 0;
let memorySnapshot: SubscriptionSnapshot | null = null;

function isOffline() {
    return typeof navigator !== "undefined" && !navigator.onLine;
}

export function readCache(userId?: string | null): SubscriptionSnapshot | null {
    if (memorySnapshot) {
        // reject if it belongs to a different user
        if (!userId || !memorySnapshot.userId || memorySnapshot.userId === userId) {
            return memorySnapshot;
        }
    }
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as SubscriptionSnapshot;
        // user mismatch → ignore
        if (userId && parsed.userId && parsed.userId !== userId) return null;
        return parsed;
    } catch {
        return null;
    }
}

/** Sync read — safe to call during render / useState initializer. */
export function getCachedPremium(userId?: string | null): boolean | null {
    const c = readCache(userId);
    if (!c) return null;

    // Offline: trust cache no matter the age.
    if (isOffline()) return c.isPremium;

    // Online: only trust if fresh.
    if (Date.now() - c.cachedAt < CACHE_DURATION) return c.isPremium;

    // Stale + online → return last known value anyway (better UX than a flash of "locked")
    // but signal the caller to refresh. We still return the boolean.
    return c.isPremium;
}

function writeCache(snap: SubscriptionSnapshot) {
    memorySnapshot = snap;
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(snap));
    } catch { }
}

/**
 * Fetch premium status. Deduplicated, cache-aware, offline-safe.
 * Never returns null for a logged-in user if there is ANY cache.
 */
export async function resolveSubscription(
    userId: string,
    opts: { force?: boolean } = {}
): Promise<SubscriptionSnapshot> {
    const cached = readCache(userId);

    // 1. If we have cache and it's fresh (or we're offline), return it.
    if (cached) {
        const fresh = Date.now() - cached.cachedAt < CACHE_DURATION;
        if (!opts.force && (fresh || isOffline())) {
            return cached;
        }
    }

    // 2. Offline with only a stale cache → return the stale cache.
    if (isOffline()) {
        if (cached) return cached;
        // no cache at all offline: default to free but don't clobber anything
        return {
            userId,
            isPremium: false,
            plan_type: "free",
            expires_at: null,
            cachedAt: 0,
        };
    }

    // 3. Online: throttle + dedupe.
    if (!opts.force && Date.now() - lastFetch < MIN_FETCH_INTERVAL && cached) {
        return cached;
    }
    if (inFlight) return inFlight;

    lastFetch = Date.now();
    inFlight = (async () => {
        try {
            const { data, error } = await supabase
                .from("subscriptions")
                .select("plan_type, is_active, expires_at")
                .eq("user_id", userId)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) throw error;

            const expiry = data?.expires_at ? new Date(data.expires_at) : null;
            const notExpired = expiry ? expiry > new Date() : true;
            const isPaidTier =
                data?.plan_type === "pro" || data?.plan_type === "premium";
            const isPremium = !!(data?.is_active && isPaidTier && notExpired);

            const snap: SubscriptionSnapshot = {
                userId,
                isPremium,
                plan_type: data?.plan_type ?? "free",
                expires_at: data?.expires_at ?? null,
                cachedAt: Date.now(),
            };
            writeCache(snap);
            return snap;
        } catch (err) {
            // Network blew up mid-request — fall back to cache.
            if (cached) return cached;
            return {
                userId,
                isPremium: false,
                plan_type: "free",
                expires_at: null,
                cachedAt: Date.now(),
            };
        } finally {
            inFlight = null;
        }
    })();

    return inFlight;
}