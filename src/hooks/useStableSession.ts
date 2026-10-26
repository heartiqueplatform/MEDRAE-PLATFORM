// src/hooks/useStableSession.ts
import { useSession } from "@supabase/auth-helpers-react";
import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";

type StableSession = {
    session: Session | null;
    user: User | null;
    ready: boolean;
    timedOut: boolean;
};

/**
 * Waits for Supabase session to load, but never waits more than `timeoutMs`.
 * - `ready` becomes true once we either have a session OR we gave up waiting.
 * - This prevents components from hanging on a skeleton forever.
 */
export function useStableSession(timeoutMs = 3000): StableSession {
    const session = useSession();
    const [timedOut, setTimedOut] = useState(false);

    useEffect(() => {
        if (session) return;
        const t = setTimeout(() => setTimedOut(true), timeoutMs);
        return () => clearTimeout(t);
    }, [session, timeoutMs]);

    const user = session?.user ?? null;
    const ready = !!session || timedOut;

    return { session: session ?? null, user, ready, timedOut };
}