// src/context/ConnectivityContext.tsx

import {
    createContext,
    useContext,
    useEffect,
    useRef,
    useState,
    useCallback,
    type ReactNode,
} from "react";

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════
type ConnState = "online" | "offline" | "checking";

interface ConnectivityValue {
    /** true when we have a working connection */
    isOnline: boolean;
    /** raw state — "checking" only on first mount / manual recheck */
    state: ConnState;
    /** true for ~3s right after we come back online — pages can re-sync once */
    justRecovered: boolean;
    /** manually force a re-check (e.g. right before a payment) */
    recheck: () => Promise<boolean>;
}

const ConnectivityContext = createContext<ConnectivityValue | undefined>(
    undefined
);

// ═══════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════
// Same-origin tiny asset — no CORS, no CDN blocking, fast on slow data.
// Falls back to gstatic only if same-origin fetch isn't possible.
const PING_URL = "/favicon.ico";
const PING_FALLBACK_URL = "https://www.gstatic.com/generate_204";

const PING_TIMEOUT_MS = 6000;         // forgiving for slow mobile data
const PING_RETRIES = 2;               // extra attempts per round
const RETRY_DELAY_MS = 800;           // gap between retries
const FAILURES_BEFORE_OFFLINE = 2;    // need 2 bad rounds in a row to go offline

const POLL_ONLINE_MS = 30_000;        // gentle poll while online
const POLL_OFFLINE_MS = 8_000;        // faster poll while offline
const RECOVERY_FLASH_MS = 3000;       // "justRecovered" window

// ═══════════════════════════════════════════════════════════
// PROVIDER
// ═══════════════════════════════════════════════════════════
export function ConnectivityProvider({ children }: { children: ReactNode }) {
    const [isOnline, setIsOnline] = useState<boolean>(() => {
        if (typeof navigator === "undefined") return true;
        return navigator.onLine;
    });

    const [state, setState] = useState<ConnState>(() => {
        if (typeof navigator === "undefined") return "online";
        return navigator.onLine ? "online" : "checking";
    });

    const [justRecovered, setJustRecovered] = useState(false);

    const pollTimer = useRef<number | null>(null);
    const recoveryTimer = useRef<number | null>(null);
    const mountedRef = useRef(true);
    const failCountRef = useRef(0);

    // ── single low-level fetch with timeout ─────────────────
    const singleFetch = useCallback(
        async (url: string): Promise<boolean> => {
            try {
                const ctrl = new AbortController();
                const timeout = setTimeout(() => ctrl.abort(), PING_TIMEOUT_MS);

                await fetch(`${url}?ts=${Date.now()}`, {
                    method: "GET",
                    cache: "no-store",
                    signal: ctrl.signal,
                    credentials: "omit",
                    mode: url.startsWith("http") ? "no-cors" : "same-origin",
                });

                clearTimeout(timeout);
                return true;
            } catch {
                return false;
            }
        },
        []
    );

    // ── one "round" = try primary URL, then fallback URL ────
    const singlePing = useCallback(async (): Promise<boolean> => {
        if (await singleFetch(PING_URL)) return true;
        if (await singleFetch(PING_FALLBACK_URL)) return true;
        return false;
    }, [singleFetch]);

    // ── ping = retry the round a couple times ───────────────
    const ping = useCallback(async (): Promise<boolean> => {
        // Fast path: browser says offline — trust it
        if (typeof navigator !== "undefined" && navigator.onLine === false) {
            return false;
        }

        for (let i = 0; i <= PING_RETRIES; i++) {
            if (await singlePing()) return true;
            if (i < PING_RETRIES) {
                await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
            }
        }
        return false;
    }, [singlePing]);

    // ── apply a new connectivity value ──────────────────────
    const apply = useCallback((next: boolean) => {
        if (!mountedRef.current) return;

        setIsOnline((prev) => {
            if (prev === next) return prev;

            if (next) {
                setJustRecovered(true);
                if (recoveryTimer.current) {
                    window.clearTimeout(recoveryTimer.current);
                }
                recoveryTimer.current = window.setTimeout(() => {
                    if (mountedRef.current) setJustRecovered(false);
                }, RECOVERY_FLASH_MS);
            }

            return next;
        });

        setState(next ? "online" : "offline");
    }, []);

    // ── apply a ping result, requiring N failures to go offline ─
    const applyPingResult = useCallback(
        (ok: boolean) => {
            if (ok) {
                failCountRef.current = 0;
                apply(true);
            } else {
                failCountRef.current += 1;
                // Only declare offline after consecutive failures.
                // Until then, stay in the current state — no flashing.
                if (failCountRef.current >= FAILURES_BEFORE_OFFLINE) {
                    apply(false);
                }
            }
        },
        [apply]
    );

    // ── manual recheck (exposed) ────────────────────────────
    const recheck = useCallback(async (): Promise<boolean> => {
        setState("checking");
        const ok = await ping();
        if (ok) failCountRef.current = 0;
        apply(ok);
        return ok;
    }, [ping, apply]);

    // ── main effect: listeners + polling ────────────────────
    useEffect(() => {
        if (typeof window === "undefined") return;

        mountedRef.current = true;

        const onOnline = () => {
            // Browser says online — verify with a real ping
            void recheck();
        };

        const onOffline = () => {
            // Browser says offline — trust instantly
            failCountRef.current = FAILURES_BEFORE_OFFLINE;
            apply(false);
        };

        window.addEventListener("online", onOnline);
        window.addEventListener("offline", onOffline);

        // ── recursive poll ─────────────────────────────────
        const scheduleNext = (onlineNow: boolean) => {
            if (pollTimer.current) window.clearTimeout(pollTimer.current);
            const ms = onlineNow ? POLL_ONLINE_MS : POLL_OFFLINE_MS;

            pollTimer.current = window.setTimeout(async () => {
                if (!mountedRef.current) return;
                const ok = await ping();
                applyPingResult(ok);
                scheduleNext(ok);
            }, ms);
        };

        // ── initial verify: DON'T punish user on first load ─
        void (async () => {
            const ok = await ping();
            if (ok) {
                failCountRef.current = 0;
                apply(true);
                scheduleNext(true);
                return;
            }

            // First check failed — try once more before deciding
            const ok2 = await ping();
            if (ok2) {
                failCountRef.current = 0;
                apply(true);
                scheduleNext(true);
            } else {
                failCountRef.current = FAILURES_BEFORE_OFFLINE;
                apply(false);
                scheduleNext(false);
            }
        })();

        return () => {
            mountedRef.current = false;
            window.removeEventListener("online", onOnline);
            window.removeEventListener("offline", onOffline);
            if (pollTimer.current) window.clearTimeout(pollTimer.current);
            if (recoveryTimer.current) window.clearTimeout(recoveryTimer.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // run once

    return (
        <ConnectivityContext.Provider
            value={{ isOnline, state, justRecovered, recheck }}
        >
            {children}
        </ConnectivityContext.Provider>
    );
}

// ═══════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════
export function useConnectivity(): ConnectivityValue {
    const ctx = useContext(ConnectivityContext);

    // Fail-open: if provider is missing, pretend we're online.
    if (!ctx) {
        return {
            isOnline: true,
            state: "online",
            justRecovered: false,
            recheck: async () => true,
        };
    }

    return ctx;
}