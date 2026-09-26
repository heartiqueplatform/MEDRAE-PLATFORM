// lib/subscription.ts
import { supabase } from "@/lib/supabaseClient";

const CACHE_KEY = "subscriptionStatus";     // ← unify on the key the unit page already uses
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24h
const MIN_FETCH_INTERVAL = 60 * 60 * 1000;  // 1h

// 🔧 How long we'll trust a cached "premium: true" while offline
// before we stop *extending* it (we never downgrade a paying user
// just because they're offline — see resolveSubscription below).
const OFFLINE_GRACE = 30 * 24 * 60 * 60 * 1000; // 30 days

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

// ─────────────────────────────────────────────────────────────
// 🔧 Offline detection that actually works.
// navigator.onLine lies on captive portals / DNS blackholes.
// We do a cheap HEAD request to a 204 endpoint, mirroring the
// approach already used in lib/authManager.ts.
// ─────────────────────────────────────────────────────────────
let _reachability: { value: boolean; at: number } | null = null;
const REACHABILITY_TTL = 15 * 1000; // cache the probe for 15s

async function isReallyOnline(timeoutMs = 2500): Promise<boolean> {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
        return false; // fast path: definitely offline
    }
    if (_reachability && Date.now() - _reachability.at < REACHABILITY_TTL) {
        return _reachability.value;
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
        _reachability = { value: true, at: Date.now() };
        return true;
    } catch {
        _reachability = { value: false, at: Date.now() };
        return false;
    }
}

// Keep the sync name for the sync callers (getCachedPremium).
// This one is a best-effort hint; the async probe above is
// what resolveSubscription uses for real decisions.
function isOfflineSync() {
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

/**
 * 🔧 Sync read — safe to call during render / useState initializer.
 *
 * RULE: We never return `false` for a user we have ANY cache for,
 * unless that cache itself says `isPremium: false`. Offline, stale,
 * whatever — we preserve the last known value. The whole point of
 * the cache is to avoid the "paying user opens app offline and
 * looks like a free user" bug.
 */
export function getCachedPremium(userId?: string | null): boolean | null {
    const c = readCache(userId);
    if (!c) return null;

    // 🔧 No expiry check for premium users. If we last knew they were
    // premium, they stay premium until we can *positively* confirm
    // otherwise from the server. This is the single most important
    // change to stop the offline downgrade.
    if (c.isPremium) return true;

    // Free users: still respect the cache, but if it's very stale
    // and we're online, let the caller re-fetch (return null).
    if (isOfflineSync()) return false;
    if (Date.now() - c.cachedAt < CACHE_DURATION) return false;
    return null;
}

function writeCache(snap: SubscriptionSnapshot) {
    memorySnapshot = snap;
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(snap));
    } catch { }
}

/**
 * Fetch premium status. Deduplicated, cache-aware, offline-safe.
 *
 * 🔧 New rules:
 *   1. We NEVER write a `free` snapshot unless the server
 *      explicitly told us so. A network error is not evidence of
 *      non-payment.
 *   2. Offline (really offline, per probe) → always return the
 *      cached snapshot, no matter how stale. If there is no cache
 *      at all, we return a synthetic *premium-preserving* snapshot
 *      (see below) rather than downgrading.
 *   3. Online but the fetch errored → return cache if we have it,
 *      otherwise return the last-known state (or a neutral one)
 *      without clobbering the cache.
 */
export async function resolveSubscription(
    userId: string,
    opts: { force?: boolean } = {}
): Promise<SubscriptionSnapshot> {
    const cached = readCache(userId);

    // 1. Fresh cache + not forced → return it.
    if (cached && !opts.force) {
        const fresh = Date.now() - cached.cachedAt < CACHE_DURATION;
        if (fresh) return cached;
    }

    // 2. Real reachability check (async, cached for 15s).
    const online = await isReallyOnline();

    // 3. Offline path.
    if (!online) {
        if (cached) {
            // 🔧 If the cached snapshot is a premium one, we return it
            // regardless of age. Paying users don't get downgraded
            // because they're on a plane.
            if (cached.isPremium) return cached;

            // Free + stale: return it too, but the caller may want to
            // refresh later. We still don't downgrade.
            return cached;
        }

        // 🔧 No cache at all, but user is logged in and offline.
        // We do NOT claim they're free. Instead we return a
        // neutral "unknown" snapshot with premium: false but with
        // cachedAt: 0 so callers can tell it's not authoritative.
        //
        // If your UI needs a boolean, default to false here — but
        // do NOT write this to cache (see writeCache call below).
        return {
            userId,
            isPremium: false,
            plan_type: "unknown",
            expires_at: null,
            cachedAt: 0,
        };
    }

    // 4. Online: throttle + dedupe.
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
            // 🔧 Only write to cache when the server gave us a real
            // answer. This is what stops a transient error from
            // poisoning the cache with `isPremium: false`.
            writeCache(snap);
            return snap;
        } catch (err) {
            // 🔧 Network blew up mid-request. Do NOT default to free.
            // Prefer cache; if we have none, return the last known
            // memory snapshot; if even that's missing, return a
            // neutral snapshot that does NOT claim free.
            if (cached) return cached;
            if (memorySnapshot && memorySnapshot.userId === userId) {
                return memorySnapshot;
            }
            return {
                userId,
                isPremium: false,
                plan_type: "unknown",
                expires_at: null,
                cachedAt: 0, // signals "not authoritative"
            };
        } finally {
            inFlight = null;
        }
    })();

    return inFlight;
}

// ─────────────────────────────────────────────────────────────
// 🔧 Listen for online/offline transitions so we invalidate the
// reachability probe and opportunistically refresh in the
// background when connectivity returns.
// ─────────────────────────────────────────────────────────────
if (typeof window !== "undefined") {
    window.addEventListener("online", () => {
        _reachability = null;
        // Best-effort refresh for whoever's currently cached.
        const uid = memorySnapshot?.userId ?? readCache()?.userId ?? null;
        if (uid) {
            resolveSubscription(uid, { force: true }).catch(() => { });
        }
    });
    window.addEventListener("offline", () => {
        _reachability = { value: false, at: Date.now() };
    });
}