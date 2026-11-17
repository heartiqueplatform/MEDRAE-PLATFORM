"use client";
import React from "react";
import { Loader2, CheckCircle2, AlertCircle, Trash2 } from "lucide-react";

export function AdminContent(props: any) {
    const {
        shows, importInput, setImportInput, onImport, importing, importMsg,
        onDelete, confirmDelete, setConfirmDelete,
    } = props;

    return (
        <div className="space-y-5">
            <div className="rounded-xl bg-gh-l-card dark:bg-gh-card p-5">
                <h3 className="text-sm tracking-tight text-gh-l-text dark:text-gh-text mb-1">
                    Add a nursing podcast
                </h3>
                <p className="text-[11px] text-gh-l-muted dark:text-gh-muted mb-4">
                    Paste any Apple Podcasts show link. All episodes will be imported and playable inside Studify.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                    <input
                        value={importInput}
                        onChange={(e) => setImportInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && !importing && onImport()}
                        placeholder="https://podcasts.apple.com/.../id1546623428"
                        className="flex-1 px-3 py-2.5 rounded-xl bg-gh-l-canvas dark:bg-gh-canvas text-sm outline-none focus:ring-2 focus:ring-blue-500 text-gh-l-text dark:text-gh-text"
                    />
                    <button
                        onClick={onImport}
                        disabled={importing || !importInput.trim()}
                        className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                    >
                        {importing ? <><Loader2 size={16} className="animate-spin" /> Importing…</> : <>Import</>}
                    </button>
                </div>
                {importMsg && (
                    <div className={`mt-3 flex items-start gap-2 text-xs rounded-lg p-2.5 ${importMsg.kind === "ok"
                        ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400"
                        : "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400"
                        }`}>
                        {importMsg.kind === "ok"
                            ? <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
                            : <AlertCircle size={14} className="shrink-0 mt-0.5" />}
                        <span className="break-words">{importMsg.text}</span>
                    </div>
                )}
            </div>

            <div>
                <h3 className="text-sm tracking-tight text-gh-l-text dark:text-gh-text mb-3">
                    Your shows
                </h3>
                {shows.length === 0 && (
                    <p className="text-xs text-gh-l-muted dark:text-gh-muted py-6 text-center">
                        No shows imported yet.
                    </p>
                )}
                <div className="space-y-2">
                    {shows.map((s: any) => (
                        <div key={s.id} className="flex items-center gap-3 p-3 rounded-2xl bg-gh-l-card dark:bg-gh-card">
                            {s.artwork_url && (
                                <img src={s.artwork_url} alt="" loading="lazy" decoding="async" className="w-14 h-14 rounded-xl object-cover" />
                            )}
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold truncate text-gh-l-text dark:text-gh-text">
                                    {s.title}
                                </p>
                                <p className="text-[10px] text-gh-l-muted dark:text-gh-muted">
                                    {s.episode_count} episodes · {s.endorsement_count} endorsements
                                </p>
                            </div>
                            {confirmDelete === s.id ? (
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => onDelete(s.id)}
                                        className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-500"
                                    >
                                        Delete
                                    </button>
                                    <button
                                        onClick={() => setConfirmDelete(null)}
                                        className="px-3 py-1.5 rounded-lg bg-gh-l-hover dark:bg-gh-hover text-xs font-bold text-gh-l-text dark:text-gh-text"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setConfirmDelete(s.id)}
                                    className="p-2 rounded-lg text-gh-l-muted dark:text-gh-muted hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                                    title="Delete show"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}