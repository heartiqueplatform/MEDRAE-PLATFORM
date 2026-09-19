"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

const ADMIN_ID = "25f37970-c9b9-4c15-b8a2-514a912e3261";

/** Accepts a full Apple URL or just the numeric ID, returns the ID or null */
function extractAppleId(input: string): string | null {
    const trimmed = input.trim();
    if (/^\d+$/.test(trimmed)) return trimmed;
    const match = trimmed.match(/id(\d+)/);
    return match ? match[1] : null;
}

export default function AdminPodcastTest() {
    const [userId, setUserId] = useState<string | null>(null);
    const [input, setInput] = useState("https://podcasts.apple.com/us/podcast/life-in-scrubs/id1546623428");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [episodeCount, setEpisodeCount] = useState<number | null>(null);

    // Load current user
    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            setUserId(data.user?.id ?? null);
        });
    }, []);

    const isAdmin = userId === ADMIN_ID;

    const refreshCount = async () => {
        const { count } = await supabase
            .from("podcast_episodes")
            .select("*", { count: "exact", head: true });
        setEpisodeCount(count ?? 0);
    };

    useEffect(() => {
        if (isAdmin) refreshCount();
    }, [isAdmin]);

    const handleSubmit = async () => {
        setError(null);
        setResult(null);

        const appleId = extractAppleId(input);
        if (!appleId) {
            setError("Could not find a numeric Apple ID in that input.");
            return;
        }

        setLoading(true);
        try {
            const { data: sessionData } = await supabase.auth.getSession();
            const token = sessionData.session?.access_token;
            if (!token) {
                setError("No session. Please log in first.");
                setLoading(false);
                return;
            }

            const res = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/add-podcast`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ appleId }),
                }
            );

            const json = await res.json();
            if (!res.ok) {
                setError(`HTTP ${res.status}: ${json.error ?? "Unknown"}${json.detail ? " — " + json.detail : ""}`);
            } else {
                setResult(json);
                refreshCount();
            }
        } catch (e: any) {
            setError(String(e?.message ?? e));
        } finally {
            setLoading(false);
        }
    };

    if (userId === null) {
        return <div className="p-8 text-center text-slate-500">Checking auth…</div>;
    }

    if (!isAdmin) {
        return (
            <div className="p-8 text-center">
                <p className="text-red-500 font-bold">Not authorized.</p>
                <p className="text-xs text-slate-500 mt-2">Signed in as: {userId}</p>
            </div>
        );
    }

    return (
        <div className="max-w-xl mx-auto p-6 space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-6 space-y-4">
                <div>
                    <h1 className="text-lg font-black tracking-tight">Podcast Importer — Test</h1>
                    <p className="text-xs text-slate-500 mt-1">
                        Admin only. Paste an Apple Podcasts URL or numeric ID.
                    </p>
                </div>

                <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400">Signed in as:</span>
                    <span className="font-mono text-emerald-600">{userId}</span>
                </div>

                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="https://podcasts.apple.com/.../id1546623428"
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />

                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm disabled:opacity-50 transition-colors"
                >
                    {loading ? "Importing…" : "Import Show"}
                </button>

                {error && (
                    <div className="text-xs text-red-600 bg-red-50 dark:bg-red-950/30 rounded-lg p-3 break-words">
                        {error}
                    </div>
                )}

                {result && (
                    <div className="text-xs bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3 space-y-1">
                        <p className="font-bold text-emerald-700 dark:text-emerald-400">✅ Imported</p>
                        <pre className="text-[10px] overflow-auto whitespace-pre-wrap break-words">
                            {JSON.stringify(result, null, 2)}
                        </pre>
                    </div>
                )}

                {episodeCount !== null && (
                    <div className="text-xs text-slate-500">
                        Total episodes in DB: <span className="font-bold text-blue-600">{episodeCount}</span>
                    </div>
                )}
            </div>
        </div>
    );
}