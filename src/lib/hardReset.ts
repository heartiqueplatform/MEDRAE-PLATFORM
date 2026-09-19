// src/lib/hardReset.ts
//
// Nukes every trace of app state on this device and reloads to the landing page.
// Use as a last-resort "something is broken, make it brand new" button.
//
// Two modes:
//   - keepLoggedIn: false  →  full reset. Signs out, wipes everything,
//                             navigates to "/". User must sign in again.
//   - keepLoggedIn: true   →  soft reset. Clears caches/offline data but
//                             preserves BOTH auth keys so the user stays
//                             signed in. Navigates back to current path.
//
// What it clears (both modes):
//   - localStorage (except auth keys when keepLoggedIn)
//   - sessionStorage
//   - All Cache Storage entries (workbox / SW caches)
//   - All IndexedDB databases
//   - All registered service workers
//   - Cookies for this origin (best-effort)
//
// Why BOTH auth keys matter:
//   `supabaseUser` is our own cache (read by authManager / useAuth).
//   `medrae_auth` is supabase-js's session blob (read by the Supabase client
//   when it attaches Authorization headers to REST calls).
//   If we preserve only one, the app ends up half-logged-in: pages render
//   as if authenticated, but every Supabase request goes out unauthenticated
//   (401) and loaders hang forever.

import { supabase } from "./supabaseClient";

const KNOWN_DBS = [
    "MedraeDB",
    "medrae_offline_db",
    "nck-offline-db",
    "medrae-offline-auth",
];

// Both keys must be preserved together. Keep this list in sync with
// `storageKey` in supabaseClient.ts if it ever changes.
const AUTH_KEYS = ["supabaseUser", "medrae_auth"];

export async function hardResetApp(options?: { keepLoggedIn?: boolean }) {
    const keepLoggedIn = options?.keepLoggedIn ?? false;

    // 1. Snapshot auth keys if we're supposed to keep the user signed in.
    const saved: Record<string, string | null> = {};
    if (keepLoggedIn) {
        try {
            for (const k of AUTH_KEYS) {
                saved[k] = localStorage.getItem(k);
            }
        } catch {
            /* ignore */
        }
    }

    // 2. Full reset → sign out from Supabase FIRST.
    //    This clears the token in supabase-js's own storage (medrae_auth).
    //    Best-effort — offline signOut still clears local state.
    if (!keepLoggedIn) {
        try {
            await supabase.auth.signOut({ scope: "local" });
        } catch {
            /* ignore — we're nuking storage below anyway */
        }
    }

    // 3. Clear localStorage + sessionStorage
    try {
        localStorage.clear();
    } catch {
        /* ignore */
    }
    try {
        sessionStorage.clear();
    } catch {
        /* ignore */
    }

    // 4. Restore auth keys (both of them) if requested
    if (keepLoggedIn) {
        try {
            for (const k of AUTH_KEYS) {
                if (saved[k]) localStorage.setItem(k, saved[k] as string);
            }
        } catch {
            /* ignore */
        }
    }

    // 5. Clear all Cache Storage entries
    if (typeof caches !== "undefined") {
        try {
            const keys = await caches.keys();
            await Promise.all(keys.map((k) => caches.delete(k)));
        } catch {
            /* ignore */
        }
    }

    // 6. Delete all IndexedDB databases — prefer the enumerate API,
    //    fall back to a known list for iOS Safari.
    if (typeof indexedDB !== "undefined") {
        try {
            const dbs =
                typeof (indexedDB as any).databases === "function"
                    ? await (indexedDB as any).databases()
                    : null;

            const names: string[] = dbs
                ? dbs.filter((db: any) => db?.name).map((db: any) => db.name)
                : KNOWN_DBS;

            // Ensure we always try the known list too, in case some
            // databases aren't enumerated (iOS).
            const allNames = Array.from(new Set([...names, ...KNOWN_DBS]));

            await Promise.all(
                allNames.map(
                    (name) =>
                        new Promise<void>((resolve) => {
                            const req = indexedDB.deleteDatabase(name);
                            req.onsuccess = () => resolve();
                            req.onerror = () => resolve();
                            req.onblocked = () => resolve();
                        })
                )
            );
        } catch {
            /* ignore */
        }
    }

    // 7. Unregister all service workers
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
        try {
            const regs = await navigator.serviceWorker.getRegistrations();
            await Promise.all(regs.map((r) => r.unregister()));
        } catch {
            /* ignore */
        }
    }

    // 8. Best-effort cookie clear (non-httpOnly only)
    try {
        const cookies = document.cookie.split(";");
        for (const c of cookies) {
            const eq = c.indexOf("=");
            const name = (eq > -1 ? c.substr(0, eq) : c).trim();
            if (!name) continue;
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${location.hostname}`;
        }
    } catch {
        /* ignore */
    }

    // 9. Navigate with a cache-busting param.
    //    - Full reset: go to "/" so the user lands on the home page.
    //    - Keep-login: return to the current path so the user resumes
    //      where they were (usually the page that was broken).
    const origin = window.location.origin;
    const basePath = keepLoggedIn ? window.location.pathname : "/";
    const target = `${origin}${basePath}?_hr=${Date.now()}`;
    window.location.replace(target);
}