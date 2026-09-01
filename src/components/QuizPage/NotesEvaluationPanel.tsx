"use client";

import { CheckCircle2, Phone, Users } from 'lucide-react';
import React from 'react';

type NotesEvaluationPanelProps = {
    q: any;
    userId: string | null;
    notes: Record<string, string>;
    setNotes: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    understood: Record<string, boolean>;
    setUnderstood: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    notUnderstood: Record<string, boolean>;
    setNotUnderstood: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    attempts: Record<string, number>;
    setAttempts: React.Dispatch<React.SetStateAction<Record<string, number>>>;
    saving: boolean;
    setSaving: React.Dispatch<React.SetStateAction<boolean>>;
    saved: boolean;
    setSaved: React.Dispatch<React.SetStateAction<boolean>>;
    helpOthersDisabled: Record<string, boolean>;
    setHelpOthersDisabled: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    setHelpMeHelpers: React.Dispatch<React.SetStateAction<any[]>>;
    setCurrentQuestionText: React.Dispatch<React.SetStateAction<string>>;
    setHelpMeOverlayOpen: React.Dispatch<React.SetStateAction<boolean>>;
    saveNoteOffline: (questionId: string, note: string) => Promise<void>;
    saveAnswersOffline: (questionId: string, data: any) => Promise<void>;
    supabase: any;
};

// ✅ Cache for help others data to prevent repeated fetches
const helpOthersCache = new Map();
const pendingHelpOthersRequests = new Map();

async function fetchHelpOthersWithCache(supabase: any, questionId: string) {
    const cacheKey = `help_others_${questionId}`;

    // Check cache (30 second TTL)
    if (helpOthersCache.has(cacheKey)) {
        const { data, timestamp } = helpOthersCache.get(cacheKey);
        if (Date.now() - timestamp < 30000) {
            return data;
        }
        helpOthersCache.delete(cacheKey);
    }

    // Check for pending request
    if (pendingHelpOthersRequests.has(cacheKey)) {
        return pendingHelpOthersRequests.get(cacheKey);
    }

    const promise = (async () => {
        const { data } = await supabase
            .from("question_notes")
            .select(`id, help_others, profiles:user_id(name, avatar_url)`)
            .eq("question_id", questionId)
            .not("help_others", "eq", "none")
            .limit(50);

        const helpers = data?.map((d: any) => ({
            id: d.id,
            whatsapp: d.help_others,
            profiles: d.profiles
        })) || [];

        helpOthersCache.set(cacheKey, { data: helpers, timestamp: Date.now() });

        setTimeout(() => {
            if (helpOthersCache.has(cacheKey)) {
                helpOthersCache.delete(cacheKey);
            }
        }, 60000);

        return helpers;
    })();

    pendingHelpOthersRequests.set(cacheKey, promise);
    const result = await promise;
    pendingHelpOthersRequests.delete(cacheKey);
    return result;
}

let saveTimeout: NodeJS.Timeout | null = null;

export function NotesEvaluationPanel(props: NotesEvaluationPanelProps) {
    const [helpModalOpen, setHelpModalOpen] = React.useState(false);
    const [phoneInput, setPhoneInput] = React.useState("");
    const [activeQuestionId, setActiveQuestionId] = React.useState<string | null>(null);
    const [isLoadingHelpers, setIsLoadingHelpers] = React.useState(false);
    const isMounted = React.useRef(true);

    const {
        q, userId, notes, setNotes, understood, setUnderstood,
        notUnderstood, setNotUnderstood, attempts, setAttempts,
        saving, setSaving, saved, setSaved, helpOthersDisabled,
        setHelpOthersDisabled, setHelpMeHelpers, setCurrentQuestionText,
        setHelpMeOverlayOpen, saveNoteOffline, saveAnswersOffline, supabase,
    } = props;

    React.useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
            if (saveTimeout) clearTimeout(saveTimeout);
        };
    }, []);

    const syncStatus = React.useCallback(async (isUnderstood: boolean, isNotUnderstood: boolean, customAttempts?: number) => {
        if (!userId) return;

        const currentAttempts = customAttempts ?? (attempts[q.id] || 0);
        const currentNote = notes[q.id] || "";

        await Promise.all([
            saveNoteOffline(q.id, currentNote),
            saveAnswersOffline(q.id, {
                understood: isUnderstood,
                not_understood: isNotUnderstood,
                attempts: currentAttempts,
            })
        ]);

        if (saveTimeout) clearTimeout(saveTimeout);

        saveTimeout = setTimeout(async () => {
            try {
                await supabase.from("question_notes").upsert([{
                    user_id: userId,
                    question_id: q.id,
                    note_text: currentNote,
                    understood: isUnderstood,
                    is_not_understood: isNotUnderstood,
                    attempts: currentAttempts,
                    help_others: helpOthersDisabled[q.id] ? "saved" : null
                }], { onConflict: "question_id, user_id" });
            } catch (err) {
                console.error("Sync Error:", err);
            }
        }, 1000);
    }, [userId, q.id, attempts, notes, helpOthersDisabled, saveNoteOffline, saveAnswersOffline, supabase]);

    const handleFindHelp = React.useCallback(async () => {
        if (!userId) return;

        setIsLoadingHelpers(true);
        try {
            const helpers = await fetchHelpOthersWithCache(supabase, q.id);
            if (isMounted.current) {
                setHelpMeHelpers(helpers);
                setCurrentQuestionText(q.question_text);
                setHelpMeOverlayOpen(true);
            }
        } catch (error) {
            console.error("Error fetching helpers:", error);
        } finally {
            setIsLoadingHelpers(false);
        }
    }, [userId, q.id, supabase, setHelpMeHelpers, setCurrentQuestionText, setHelpMeOverlayOpen]);

    const handleEnableHelp = React.useCallback(async () => {
        if (!phoneInput.trim() || !userId || !activeQuestionId) return;

        try {
            await supabase.from("question_notes").upsert([{
                user_id: userId,
                question_id: activeQuestionId,
                help_others: phoneInput.trim(),
            }], { onConflict: "question_id, user_id" });

            setHelpOthersDisabled(prev => ({ ...prev, [activeQuestionId]: true }));
            setHelpModalOpen(false);
            setPhoneInput("");
            setActiveQuestionId(null);

            const cacheKey = `help_others_${activeQuestionId}`;
            helpOthersCache.delete(cacheKey);
        } catch (error) {
            console.error("Error enabling help:", error);
        }
    }, [phoneInput, userId, activeQuestionId, supabase, setHelpOthersDisabled]);

    return (
        <>
            {helpModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-sm bg-white dark:bg-muted/30 rounded-[2rem] overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
                        <div className="bg-teal-600 p-6 text-center">
                            <div className="mx-auto w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-3">
                                <Users className="text-white w-6 h-6" />
                            </div>
                            <h2 className="text-lg font-bold text-white">Peer Support Network</h2>
                            <p className="text-teal-100 text-xs mt-1">Lend a hand to fellow students</p>
                        </div>

                        <div className="p-6">
                            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 ml-1">
                                WhatsApp Contact
                            </label>
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-600">
                                    <Phone size={16} />
                                </div>
                                <input
                                    value={phoneInput}
                                    onChange={(e) => setPhoneInput(e.target.value)}
                                    placeholder="+254 7XX XXX XXX"
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl text-sm focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all font-medium"
                                />
                            </div>

                            <p className="mt-3 text-[11px] text-slate-400 leading-relaxed px-1">
                                By providing your number, you agree to let other nursing students reach out to you for study assistance.
                            </p>

                            <div className="grid grid-cols-2 gap-3 mt-6">
                                <button
                                    onClick={() => {
                                        setHelpModalOpen(false);
                                        setPhoneInput("");
                                        setActiveQuestionId(null);
                                    }}
                                    className="px-4 py-3 text-sm font-bold rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
                                >
                                    Cancel
                                </button>

                                <button
                                    onClick={handleEnableHelp}
                                    className="px-4 py-3 text-sm font-bold rounded-xl bg-teal-600 text-white hover:bg-teal-700 shadow-lg shadow-teal-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    <CheckCircle2 size={16} />
                                    Enable Support
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <div className="w-full mt-2 bg-white dark:bg-muted/30 border-0 rounded-xl overflow-hidden shadow-sm transition-all">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-0 bg-gray-50/50 dark:bg-gray-800/50">
                    <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4 text-blue-500">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                        </svg>
                        <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-tight">Study Notes</h2>
                    </div>
                    {attempts[q.id] > 0 && (
                        <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded-full font-bold">
                            {attempts[q.id]} ATTEMPTS
                        </span>
                    )}
                </div>

                {/* Textarea Area */}
                <div className="p-1">
                    <textarea
                        value={notes[q.id] || ""}
                        onChange={(e) => {
                            const val = e.target.value;
                            setNotes(prev => ({ ...prev, [q.id]: val }));
                            saveNoteOffline(q.id, val).catch(console.error);
                            syncStatus(!!understood[q.id], !!notUnderstood[q.id]);
                        }}
                        className="w-full min-h-[160px] p-4 text-sm bg-transparent border-0 focus:ring-0 resize-none text-gray-800 dark:text-gray-200 placeholder-gray-400 hide-scrollbar"
                        placeholder="Reflect on this question... Why was it tricky? What's the key takeaway?"
                    />
                </div>

                {/* Action Toolbar - UPDATED with labels */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-gray-50/30 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-800">
                    {/* Left: Status Toggles with Labels */}
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Understood */}
                        <button
                            onClick={() => {
                                const next = !understood[q.id];
                                setUnderstood(prev => ({ ...prev, [q.id]: next }));
                                setNotUnderstood(prev => ({ ...prev, [q.id]: false }));
                                syncStatus(next, false);
                            }}
                            className={`group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all ${understood[q.id]
                                ? 'bg-green-100 text-green-600 dark:bg-green-900/30'
                                : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                                }`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.74-5.24Z" clipRule="evenodd" />
                            </svg>
                            <span className={`text-xs font-medium ${understood[q.id] ? 'text-green-700 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                Understood
                            </span>
                        </button>

                        {/* Not Understood */}
                        <button
                            onClick={() => {
                                const next = !notUnderstood[q.id];
                                setNotUnderstood(prev => ({ ...prev, [q.id]: next }));
                                setUnderstood(prev => ({ ...prev, [q.id]: false }));
                                syncStatus(false, next);
                            }}
                            className={`group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all ${notUnderstood[q.id]
                                ? 'bg-red-100 text-red-600 dark:bg-red-900/30'
                                : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                                }`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
                            </svg>
                            <span className={`text-xs font-medium ${notUnderstood[q.id] ? 'text-red-700 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                Need Help
                            </span>
                        </button>

                        <div className="w-px h-8 bg-gray-200 dark:bg-gray-700" />

                        {/* Increment Attempt */}
                        <button
                            onClick={() => {
                                const nextVal = (attempts[q.id] || 0) + 1;
                                setAttempts(prev => ({ ...prev, [q.id]: nextVal }));
                                syncStatus(!!understood[q.id], !!notUnderstood[q.id], nextVal);
                            }}
                            className="group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-500 dark:hover:bg-blue-900/20 transition-all"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                            </svg>
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                Attempt {attempts[q.id] > 0 ? `(${attempts[q.id]})` : ''}
                            </span>
                        </button>
                    </div>

                    {/* Right: Social & Save with Labels */}
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Help Others */}
                        <button
                            onClick={() => {
                                if (!userId || helpOthersDisabled[q.id]) return;
                                setActiveQuestionId(q.id);
                                setPhoneInput("");
                                setHelpModalOpen(true);
                            }}
                            disabled={helpOthersDisabled[q.id]}
                            className={`group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all ${helpOthersDisabled[q.id]
                                ? 'text-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                : 'text-gray-400 hover:bg-blue-50 hover:text-blue-500 dark:hover:bg-blue-900/20'
                                }`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
                            </svg>
                            <span className={`text-xs font-medium ${helpOthersDisabled[q.id] ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                {helpOthersDisabled[q.id] ? 'Helping' : 'Help Others'}
                            </span>
                        </button>

                        {/* WhatsApp Help Me */}
                        <button
                            onClick={handleFindHelp}
                            disabled={isLoadingHelpers}
                            className="group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-gray-400 hover:bg-green-50 hover:text-green-500 dark:hover:bg-green-900/20 transition-all disabled:opacity-50"
                        >
                            {isLoadingHelpers ? (
                                <div className="w-5 h-5 flex items-center justify-center">
                                    <div className="w-3 h-3 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                    <path d="M12.031 2c-5.508 0-9.969 4.461-9.969 9.969 0 1.758.461 3.469 1.336 4.969L2 22l5.25-1.383a9.897 9.897 0 0 0 4.781 1.234h.008c5.508 0 9.961-4.461 9.961-9.969 0-2.656-1.031-5.156-2.906-7.031A9.873 9.873 0 0 0 12.031 2Zm0 1.688c2.203 0 4.273.859 5.82 2.406s2.406 3.617 2.406 5.875c0 4.578-3.719 8.281-8.281 8.281h-.008a8.216 8.216 0 0 1-4.188-1.148l-.305-.18-3.102.813.828-3.016-.203-.32a8.204 8.204 0 0 1-1.258-4.383c.008-4.547 3.734-8.281 8.297-8.281Zm-2.336 3.141c-.227 0-.469.055-.656.258-.234.258-.891.875-.891 2.133 0 1.258.914 2.477 1.039 2.648s1.805 2.758 4.375 3.867c.609.266 1.086.422 1.461.539.617.195 1.172.164 1.617.102.492-.07 1.516-.617 1.727-1.219.211-.594.211-1.102.148-1.211-.063-.109-.234-.172-.492-.297-.258-.125-1.516-.75-1.75-.836-.234-.086-.406-.125-.578.133-.172.258-.664.836-.813 1.008-.148.172-.297.195-.555.07a3.896 3.896 0 0 1-2.063-1.805c-.148-.258-.016-.406.117-.539.125-.117.258-.297.391-.445.125-.156.172-.258.258-.43.086-.172.047-.32-.023-.445-.07-.125-.578-1.398-.797-1.922-.211-.5-.422-.43-.578-.438Z" />
                                </svg>
                            )}
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                Find Buddy
                            </span>
                        </button>

                        {/* Save Button with label */}
                        <button
                            onClick={async () => {
                                if (!userId) return;
                                setSaving(true);
                                setSaved(false);
                                await saveNoteOffline(q.id, notes[q.id] || "");
                                try {
                                    await supabase.from("question_notes").upsert([{
                                        question_id: q.id, user_id: userId, note_text: notes[q.id] || "",
                                        understood: !!understood[q.id], is_not_understood: !!notUnderstood[q.id],
                                        attempts: attempts[q.id] || 0, help_others: helpOthersDisabled[q.id] ? "saved" : null
                                    }], { onConflict: ["question_id", "user_id"] });
                                } catch (e) { console.error(e); }
                                setSaving(false);
                                setSaved(true);
                                setTimeout(() => setSaved(false), 2000);
                            }}
                            className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${saved
                                ? 'bg-green-500 text-white'
                                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-200 dark:shadow-none'
                                }`}
                        >
                            {saving ? (
                                <div className="flex gap-1">
                                    <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" />
                                    <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:0.2s]" />
                                    <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:0.4s]" />
                                </div>
                            ) : saved ? (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="3" stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
                                </svg>
                            )}
                            <span className="text-xs font-medium">
                                {saving ? 'Saving...' : saved ? 'Saved!' : 'Save'}
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}