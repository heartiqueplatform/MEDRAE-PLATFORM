"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
    getAudioBlob,
    putAudioBlob,
    deleteAudioBlob,
    listDownloadedIds,
} from "@/lib/studifyDb";
import { supabase } from "@/lib/supabaseClient";
import type { Track } from "@/components/MusicPlayerProvider";

export type DownloadState = "idle" | "downloading" | "downloaded" | "error";

export interface DownloadedItem {
    episodeId: string;
    downloadedAt: number;
    size: number;
}

export function estimateBytes(durationSec?: number): number {
    if (!durationSec || !isFinite(durationSec)) return 0;
    return Math.round((durationSec * 128 * 1000) / 8);
}

export function fmtBytes(n: number): string {
    if (!n) return "—";
    if (n >= 1e9) return `${(n / 1e9).toFixed(1)} GB`;
    if (n >= 1e6) return `${(n / 1e6).toFixed(1)} MB`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(0)} KB`;
    return `${n} B`;
}

function isCellularConnection(): boolean {
    if (typeof navigator === "undefined") return false;
    const conn = (navigator as any).connection;
    if (!conn) return false;
    if (conn.type === "cellular") return true;
    if (conn.effectiveType && ["slow-2g", "2g", "3g"].includes(conn.effectiveType)) return true;
    return false;
}

export function useDownloads() {
    const [states, setStates] = useState<Map<string, DownloadState>>(new Map());
    const [progress, setProgress] = useState<Map<string, number>>(new Map());
    const blobUrlRef = useRef<Map<string, string>>(new Map());
    const inFlightRef = useRef<Set<string>>(new Set());
    const abortRef = useRef<Map<string, AbortController>>(new Map());

    const [downloadedItems, setDownloadedItems] = useState<DownloadedItem[]>([]);

    const refreshList = useCallback(async () => {
        try {
            const keys = await listDownloadedIds();
            const { studifyDb } = await import("@/lib/studifyDb");
            const rows = await (studifyDb as any).audioBlobs.bulkGet(keys);
            const items: DownloadedItem[] = rows
                .filter(Boolean)
                .map((r: any) => ({
                    episodeId: r.episodeId,
                    downloadedAt: r.downloadedAt,
                    size: r.size,
                }));
            items.sort((a, b) => b.downloadedAt - a.downloadedAt);
            setDownloadedItems(items);
        } catch (e) {
            console.error("[useDownloads] refreshList failed", e);
        }
    }, []);

    useEffect(() => { refreshList(); }, [refreshList]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const ids = await listDownloadedIds();
            if (cancelled) return;
            setStates((prev) => {
                const next = new Map(prev);
                ids.forEach((id) => next.set(id, "downloaded"));
                return next;
            });
        })();
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        const cache = blobUrlRef.current;
        const aborts = abortRef.current;
        return () => {
            cache.forEach((url) => { try { URL.revokeObjectURL(url); } catch { } });
            cache.clear();
            aborts.forEach((c) => c.abort());
            aborts.clear();
        };
    }, []);

    // 🔥 Refs so the API functions stay STABLE — no dependency on `states`/`progress`.
    const statesRef = useRef(states);
    const progressRef = useRef(progress);
    useEffect(() => { statesRef.current = states; }, [states]);
    useEffect(() => { progressRef.current = progress; }, [progress]);

    // ⚡ Stable identities — same function objects across renders.
    const getState = useCallback(
        (episodeId?: string): DownloadState => {
            if (!episodeId) return "idle";
            return statesRef.current.get(episodeId) ?? "idle";
        },
        []
    );

    const getProgress = useCallback(
        (episodeId?: string): number => {
            if (!episodeId) return 0;
            return progressRef.current.get(episodeId) ?? 0;
        },
        []
    );

    const resolvePlayableSrc = useCallback(async (track: Track): Promise<string> => {
        if (!track.id) return track.src;
        const cached = blobUrlRef.current.get(track.id);
        if (cached) return cached;
        const row = await getAudioBlob(track.id);
        if (row?.blob) {
            const url = URL.createObjectURL(row.blob);
            blobUrlRef.current.set(track.id, url);
            return url;
        }
        return track.src;
    }, []);

    const cancel = useCallback((episodeId: string) => {
        const ctrl = abortRef.current.get(episodeId);
        if (ctrl) {
            ctrl.abort();
            abortRef.current.delete(episodeId);
        }
        inFlightRef.current.delete(episodeId);
        setStates((prev) => {
            const next = new Map(prev);
            next.delete(episodeId);
            return next;
        });
        setProgress((prev) => {
            const next = new Map(prev);
            next.delete(episodeId);
            return next;
        });
        toast.message("Download cancelled", { id: `dl-cancel-${episodeId}` });
    }, []);

    const download = useCallback(async (track: Track) => {
        if (!track.id || !track.src) {
            toast.error("Can't download this episode", {
                description: "Missing episode id or audio URL.",
            });
            return;
        }
        const id = track.id;
        if (inFlightRef.current.has(id)) return;

        if (isCellularConnection()) {
            const sizeHint = fmtBytes(estimateBytes(track.duration));
            const proceed = await new Promise<boolean>((resolve) => {
                toast("Download on cellular?", {
                    id: `dl-cell-${id}`,
                    description: `This will use mobile data${sizeHint !== "—" ? ` (~${sizeHint})` : ""}. Continue?`,
                    action: { label: "Download", onClick: () => resolve(true) },
                    cancel: { label: "Cancel", onClick: () => resolve(false) },
                    onDismiss: () => resolve(false),
                    duration: 10000,
                });
            });
            if (!proceed) return;
        }

        inFlightRef.current.add(id);

        const controller = new AbortController();
        abortRef.current.set(id, controller);

        setStates((prev) => {
            const next = new Map(prev);
            next.set(id, "downloading");
            return next;
        });
        setProgress((prev) => {
            const next = new Map(prev);
            next.set(id, 0);
            return next;
        });

        if (track.showId) {
            supabase
                .rpc("report_download", {
                    p_episode_id: track.id,
                    p_show_id: track.showId,
                })
                .then(({ error }) => {
                    if (error) console.error("[report_download]", error);
                })
                .catch((err) => console.error("[report_download] threw", err));
        }

        try {
            const proxyUrl =
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/download-episode?url=` +
                encodeURIComponent(track.src);

            const res = await fetch(proxyUrl, {
                cache: "no-store",
                signal: controller.signal,
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const contentLength = Number(res.headers.get("Content-Length") || 0);
            const reader = res.body?.getReader();
            if (!reader) throw new Error("Stream not available");

            const chunks: BlobPart[] = [];
            let received = 0;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                if (value) {
                    chunks.push(value);
                    received += value.byteLength;
                    if (contentLength > 0) {
                        const pct = Math.min(0.99, received / contentLength);
                        setProgress((prev) => {
                            const next = new Map(prev);
                            next.set(id, pct);
                            return next;
                        });
                    }
                }
            }

            const mimeType = res.headers.get("Content-Type") || "audio/mpeg";
            const blob = new Blob(chunks, { type: mimeType });

            await putAudioBlob({
                episodeId: id,
                blob,
                mimeType,
                size: blob.size,
                downloadedAt: Date.now(),
            });

            const url = URL.createObjectURL(blob);
            blobUrlRef.current.set(id, url);

            setStates((prev) => {
                const next = new Map(prev);
                next.set(id, "downloaded");
                return next;
            });
            setProgress((prev) => {
                const next = new Map(prev);
                next.set(id, 1);
                return next;
            });

            await refreshList();

            toast.success("Downloaded", {
                description: track.name,
                id: `dl-ok-${id}`,
            });
        } catch (err: any) {
            if (err?.name === "AbortError") return;
            console.error("[download] failed:", err);
            setStates((prev) => {
                const next = new Map(prev);
                next.set(id, "error");
                return next;
            });
            toast.error("Download failed", {
                description: err?.message ?? "Check your connection.",
                id: `dl-err-${id}`,
            });
        } finally {
            inFlightRef.current.delete(id);
            abortRef.current.delete(id);
        }
    }, [refreshList]);

    const remove = useCallback(async (episodeId: string) => {
        try {
            await deleteAudioBlob(episodeId);
            const url = blobUrlRef.current.get(episodeId);
            if (url) {
                try { URL.revokeObjectURL(url); } catch { }
                blobUrlRef.current.delete(episodeId);
            }
            setStates((prev) => {
                const next = new Map(prev);
                next.delete(episodeId);
                return next;
            });
            setProgress((prev) => {
                const next = new Map(prev);
                next.delete(episodeId);
                return next;
            });
            await refreshList();
            toast.success("Removed from downloads", { id: `rm-${episodeId}` });
        } catch (err) {
            console.error("[remove] failed:", err);
            toast.error("Couldn't remove download");
        }
    }, [refreshList]);

    // 🚀 STABLE return — same object shape, stable function identities.
    //    The `downloadedItems` array is the only thing that changes when
    //    downloads change — everything else is ref-stable.
    return useMemo(
        () => ({
            getState,
            getProgress,
            resolvePlayableSrc,
            download,
            cancel,
            remove,
            downloadedItems,
            refreshList,
        }),
        [getState, getProgress, resolvePlayableSrc, download, cancel, remove, downloadedItems, refreshList]
    );
}