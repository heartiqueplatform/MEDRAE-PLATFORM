"use client";
import { useCallback, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";

export function useReportPlay() {
    const reportedRef = useRef<Set<string>>(new Set());
    const sessionId = useRef(
        typeof crypto !== "undefined" ? crypto.randomUUID() : String(Date.now())
    );

    const report = useCallback(
        (episodeId: string, showId: string, positionSeconds = 0) => {
            // Hard guard — if the caller doesn't have an episode or show id,
            // we can't report anything. Log so you see the miss in DevTools.
            if (!episodeId || !showId) {
                console.warn("[reportPlay] missing ids", { episodeId, showId });
                return;
            }

            // Dedupe: one report per episode per hour per session.
            // (Server also dedupes; this avoids the roundtrip entirely.)
            const key = `${episodeId}:${Math.floor(Date.now() / 3_600_000)}`;
            if (reportedRef.current.has(key)) {
                console.log("[reportPlay] deduped (already reported this hour)", episodeId);
                return;
            }
            reportedRef.current.add(key);

            console.log("[reportPlay] firing", {
                episodeId,
                showId,
                positionSeconds,
                sessionId: sessionId.current,
            });

            // Fire-and-forget: don't await, don't block UI.
            // But DO log the response so we can see the RPC land or fail.
            void supabase
                .rpc("report_play", {
                    p_episode_id: episodeId,
                    p_show_id: showId,
                    p_position_seconds: Math.floor(positionSeconds),
                    p_session_id: sessionId.current,
                })
                .then(({ data, error }) => {
                    if (error) {
                        console.error("[reportPlay] RPC failed:", error);
                    } else {
                        console.log("[reportPlay] RPC ok", data);
                    }
                })
                .catch((err) => {
                    console.error("[reportPlay] network error:", err);
                });
        },
        []
    );

    return { report };
}