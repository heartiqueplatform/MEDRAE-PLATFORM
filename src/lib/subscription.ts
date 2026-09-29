// lib/subscription.ts
import { supabase } from "@/lib/supabaseClient";

const CACHE_KEY = "subscriptionStatus";

// Hard ceiling — never trust a cache older than this, even offline.
const OFFLINE_MAX_TRUST = 30 * 24 * 60 * 60 * 1000; // 30 days

// Throttle network calls (only applies when online & not forced).
const MIN_FETCH_INTERVAL = 60 * 1000;          // 1 min
const BACKGROUND_REFRESH = 5 * 60 * 1000;    // 5 min

export type SubscriptionSnapshot = {
    userId: string | null;
    isPremium: boolean;
    plan_type: string;
    is_active: boolean;
    expires_at: string | null;   // ISO string; null = never expires
    cachedAt: number;
    /** true only when the server positively confirmed this value */
    authoritative: boolean;
};

let inFlight: Promise<SubscriptionSnapshot> | null = null;
let lastFetch = 0;
let memorySnapshot: SubscriptionSnapshot | null = null;

// ─────────────────────────────────────────────────────────────
// Reachability probe — navigator.onLine lies on captive portals.
// ─────────────────────────────────────────────────────────────
let _reachability: { value: boolean; at: number } | null = null;
const REACHABILITY_TTL = 15 * 1000;

async function isReallyOnline(timeoutMs = 2500): Promise<boolean> {
    if (typeof navigator !== "undefined" && navigator.onLine === false) return false;
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

function isOfflineSync() {
    return typeof navigator !== "undefined" && !navigator.onLine;
}

// ─────────────────────────────────────────────────────────────
// Cache IO
// ─────────────────────────────────────────────────────────────
export function readCache(userId?: string | null): SubscriptionSnapshot | null {
    if (memorySnapshot) {
        if (!userId || !memorySnapshot.userId || memorySnapshot.userId === userId) {
            return memorySnapshot;
        }
    }
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as SubscriptionSnapshot;
        if (userId && parsed.userId && parsed.userId !== userId) return null;
        memorySnapshot = parsed;
        return parsed;
    } catch {
        return null;
    }
}

function writeCache(snap: SubscriptionSnapshot) {
    memorySnapshot = snap;
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(snap)); } catch { }
}

function clearCache() {
    memorySnapshot = null;
    try { localStorage.removeItem(CACHE_KEY); } catch { }
}

// ─────────────────────────────────────────────────────────────
// 🔧 Core: is a cached snapshot still valid?
//    Uses expires_at as the source of truth, is_active as override.
// ─────────────────────────────────────────────────────────────
function isCacheStillValid(snap: SubscriptionSnapshot): boolean {
    if (Date.now() - snap.cachedAt > OFFLINE_MAX_TRUST) return false;

    // Free cache — always valid until we can reach the server
    if (!snap.isPremium) return true;

    // Premium cache — must be active
    if (snap.is_active === false) return false;

    // Premium + has expiry → must not have passed
    if (snap.expires_at) {
        const exp = new Date(snap.expires_at).getTime();
        if (Number.isFinite(exp) && Date.now() >= exp) return false;
    }

    // Premium + no expiry → lifetime grant, still valid
    return true;
}

/**
 * 🔧 Sync read — safe during render / useState initializer.
 *
 * Returns:
 *   true  → cached premium, unexpired, active
 *   false → cached free
 *   null  → unknown / stale → caller should NOT assume free
 *
 * Offline: never downgrades. Returns the last known value.
 */
export function getCachedPremium(userId?: string | null): boolean | null {
    const c = readCache(userId);
    if (!c) return null;

    if (isCacheStillValid(c)) return c.isPremium;

    // Stale or expired.
    // Offline → trust the last known value (grace for paying users).
    // Online  → return null so caller re-fetches.
    if (isOfflineSync()) return c.isPremium;
    return null;
}

// ─────────────────────────────────────────────────────────────
// Server fetch — your schema: user_id is UNIQUE
// ─────────────────────────────────────────────────────────────
async function fetchFromServer(userId: string): Promise<SubscriptionSnapshot> {
    const { data, error } = await supabase
        .from("subscriptions")
        .select("plan_type, is_active, expires_at")
        .eq("user_id", userId)
        .maybeSingle();

    if (error) throw error;

    // No row → user is free (authoritative)
    if (!data) {
        return {
            userId,
            isPremium: false,
            plan_type: "free",
            is_active: false,
            expires_at: null,
            cachedAt: Date.now(),
            authoritative: true,
        };
    }

    const expiry = data.expires_at ? new Date(data.expires_at) : null;
    const notExpired = expiry ? expiry.getTime() > Date.now() : true; // null = never expires
    const isPaidTier = data.plan_type === "premium";
    const isPremium = !!(data.is_active && isPaidTier && notExpired);

    return {
        userId,
        isPremium,
        plan_type: data.plan_type ?? "free",
        is_active: !!data.is_active,
        expires_at: data.expires_at ?? null,
        cachedAt: Date.now(),
        authoritative: true,
    };
}

// ─────────────────────────────────────────────────────────────
// Main resolver — same signature as before
// ─────────────────────────────────────────────────────────────
export async function resolveSubscription(
    userId: string,
    opts: { force?: boolean } = {}
): Promise<SubscriptionSnapshot> {
    const cached = readCache(userId);

    // 1. Valid cache + not forced → return it (fast, offline-friendly)
    if (cached && !opts.force && isCacheStillValid(cached)) {
        if (!isOfflineSync()) {
            // fall through — we may still want to opportunistically refresh
        } else {
            return cached;
        }
    }

    // 2. Stale + offline → return cache (never downgrade offline)
    if (cached && !opts.force && !isCacheStillValid(cached) && isOfflineSync()) {
        return cached;
    }

    // 3. Throttle (only when we have something to fall back on)
    if (!opts.force && Date.now() - lastFetch < MIN_FETCH_INTERVAL && cached) {
        return cached;
    }

    // 4. Reachability
    const online = await isReallyOnline();

    if (!online) {
        if (cached) return cached;
        return {
            userId,
            isPremium: false,
            plan_type: "unknown",
            is_active: false,
            expires_at: null,
            cachedAt: 0,
            authoritative: false,
        };
    }

    // 5. Dedupe concurrent fetches
    if (inFlight) return inFlight;

    lastFetch = Date.now();
    inFlight = (async () => {
        try {
            const snap = await fetchFromServer(userId);
            // 🔧 Server-confirmed value ALWAYS overwrites cache — including downgrades.
            writeCache(snap);
            return snap;
        } catch {
            // Network error → keep cache, never downgrade
            if (cached) return cached;
            if (memorySnapshot && memorySnapshot.userId === userId) return memorySnapshot;
            return {
                userId,
                isPremium: false,
                plan_type: "unknown",
                is_active: false,
                expires_at: null,
                cachedAt: 0,
                authoritative: false,
            };
        } finally {
            inFlight = null;
        }
    })();

    return inFlight;
}

// ─────────────────────────────────────────────────────────────
// 🔧 Self-managing re-validation.
//    Runs automatically on module import — no other file changes needed.
//
//    Triggers a background refresh on:
//      - window "online"
//      - tab visibility → visible
//      - window "focus"
//      - every BACKGROUND_REFRESH while the app is open
//
//    Emits a "subscription-updated" CustomEvent on window so any
//    component can listen without importing anything new.
// ─────────────────────────────────────────────────────────────

// In-memory pub/sub (also exported, but no other file needs to change
// to receive updates — they can listen to the CustomEvent instead).
type Listener = (snap: SubscriptionSnapshot) => void;
const listeners = new Set<Listener>();

export function subscribeToSubscription(fn: Listener): () => void {
    listeners.add(fn);
    return () => { listeners.delete(fn); };
}

function emit(snap: SubscriptionSnapshot) {
    for (const fn of listeners) {
        try { fn(snap); } catch { }
    }
    try {
        window.dispatchEvent(
            new CustomEvent("subscription-updated", { detail: snap })
        );
    } catch { }
}

async function refreshFor(userId: string, force = false) {
    try {
        const snap = await resolveSubscription(userId, { force });
        emit(snap);
    } catch { }
}

// ─── Auto-wire (guarded so it runs once per page load) ────────
if (typeof window !== "undefined") {
    let _wired = false;
    let _backgroundTimer: ReturnType<typeof setInterval> | null = null;

    const currentUserId = () =>
        memorySnapshot?.userId ?? readCache()?.userId ?? null;

    const wire = () => {
        if (_wired) return;
        _wired = true;

        window.addEventListener("online", () => {
            _reachability = null;
            const uid = currentUserId();
            if (uid) refreshFor(uid, true);
        });

        window.addEventListener("offline", () => {
            _reachability = { value: false, at: Date.now() };
        });

        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible") {
                const uid = currentUserId();
                if (uid) refreshFor(uid, false);
            }
        });

        window.addEventListener("focus", () => {
            const uid = currentUserId();
            if (uid) refreshFor(uid, false);
        });

        if (_backgroundTimer) clearInterval(_backgroundTimer);
        _backgroundTimer = setInterval(() => {
            const uid = currentUserId();
            if (uid) refreshFor(uid, false);
        }, BACKGROUND_REFRESH);
    };

    wire();
}

// Optional: call on logout so a different user doesn't inherit the cache.
export { clearCache as clearSubscriptionCache };