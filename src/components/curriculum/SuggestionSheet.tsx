// src/components/SuggestionSheet.tsx
import { useState, useEffect } from "react";
import {
    Heart,
    Star,
    Flame,
    Clock,
    Send,
    User,
    X,
    Sparkles,
    TrendingUp,
    Zap,
    CheckCircle,
    AlertCircle,
    Plus,
    BookOpen,
    FlaskConical,
    Stethoscope,
    MapPin,
    Loader2,
    ChevronLeft,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import {
    getSuggestions,
    createSuggestion,
    toggleEndorsement,
    subscribeToSuggestions,
    Suggestion,
} from "@/lib/nursingQueries";
import { playSound } from "@/lib/soundManager";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const vibrate = (pattern: number | number[] = 20) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(pattern);
    }
};

const tap = (type: "light" | "success" | "warning" = "light") => {
    playSound("ui-tap");
    if (type === "success") vibrate([20, 30, 20]);
    else if (type === "warning") vibrate(60);
    else vibrate(15);
};

const priorityConfig = {
    low: {
        label: "Low",
        icon: Clock,
        pill: "bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-300",
    },
    medium: {
        label: "Medium",
        icon: Star,
        pill: "bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300",
    },
    high: {
        label: "High",
        icon: Flame,
        pill: "bg-orange-100 text-orange-700 dark:bg-orange-400/10 dark:text-orange-300",
    },
    urgent: {
        label: "Urgent",
        icon: Zap,
        pill: "bg-rose-100 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300",
    },
};

const categoryConfig = {
    general: { label: "General", icon: Sparkles },
    theory: { label: "Theory", icon: BookOpen },
    practicum: { label: "Practicum", icon: FlaskConical },
    clinical: { label: "Clinical", icon: Stethoscope },
    visit: { label: "Visit", icon: MapPin },
};

const AVATAR_COLORS = [
    "bg-rose-500",
    "bg-sky-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-indigo-500",
    "bg-teal-500",
];

const getInitials = (name?: string) =>
    name
        ? name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2)
        : "?";

const getAvatarColor = (userId: string) =>
    AVATAR_COLORS[
    userId.split("").reduce((a, c) => a + c.charCodeAt(0), 0) %
    AVATAR_COLORS.length
    ];

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface SuggestionSheetProps {
    open: boolean;
    onClose: () => void;
    /** Optional pre-filled name (e.g. the search query the user typed). */
    prefillName?: string;
    /** Optional pre-filled description hint. */
    prefillDescription?: string;
}

/* ------------------------------------------------------------------ */
/*  Sheet                                                              */
/* ------------------------------------------------------------------ */

export default function SuggestionSheet({
    open,
    onClose,
    prefillName = "",
    prefillDescription = "",
}: SuggestionSheetProps) {
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const [newSuggestion, setNewSuggestion] = useState({
        unit_name: prefillName,
        unit_code: "",
        description: prefillDescription,
        priority: "medium",
        category: "general",
    });

    /* ── Sync prefill when the sheet reopens with a new search ── */
    useEffect(() => {
        if (open) {
            setNewSuggestion((prev) => ({
                ...prev,
                unit_name: prefillName || prev.unit_name,
                description: prefillDescription || prev.description,
            }));
            setError("");
            setSuccess("");
            // Scroll body lock
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [open, prefillName, prefillDescription]);

    /* ── Load suggestions when open ── */
    useEffect(() => {
        if (!open) return;
        let cancelled = false;

        supabase.auth.getSession().then(({ data }) => {
            if (!cancelled && data.session?.user) setUser(data.session.user);
        });

        const load = async () => {
            try {
                const data = await getSuggestions();
                if (!cancelled) setSuggestions(data);
            } catch (e) {
                console.error("Error loading suggestions:", e);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        load();
        const unsubscribe = subscribeToSuggestions(() => {
            if (!cancelled) load();
        });

        return () => {
            cancelled = true;
            unsubscribe();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    /* ── Submit ── */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (submitting) return;
        if (!user) {
            setError("Please log in first");
            return;
        }
        if (!newSuggestion.unit_name.trim()) {
            setError("Please enter a topic name");
            return;
        }
        setSubmitting(true);
        try {
            const suggestion = await createSuggestion(newSuggestion);
            setSuggestions((prev) => [suggestion, ...prev]);
            setNewSuggestion({
                unit_name: "",
                unit_code: "",
                description: "",
                priority: "medium",
                category: "general",
            });
            setSuccess("🎉 Suggestion submitted");
            tap("success");
            setTimeout(() => setSuccess(""), 3000);
        } catch (err) {
            setError("Could not submit. Try again.");
            setTimeout(() => setError(""), 3000);
        } finally {
            setSubmitting(false);
        }
    };

    /* ── Endorse ── */
    const handleEndorse = async (suggestionId: string) => {
        if (!user) {
            setError("Please log in to endorse");
            setTimeout(() => setError(""), 3000);
            return;
        }
        try {
            const result = await toggleEndorsement(suggestionId);
            setSuggestions((prev) =>
                prev.map((s) =>
                    s.id === suggestionId
                        ? {
                            ...s,
                            user_endorsed: result.endorsed,
                            endorsements_count: result.endorsed
                                ? s.endorsements_count + 1
                                : s.endorsements_count - 1,
                        }
                        : s
                )
            );
        } catch (err) {
            console.error("Error toggling endorsement:", err);
        }
    };

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center
                       bg-black/50 backdrop-blur-sm"
            onClick={onClose}
            style={{ WebkitTapHighlightColor: "transparent" }}
        >
            <div
                className="relative w-full md:max-w-lg
                           h-[85vh] md:h-auto md:max-h-[85vh]
                           flex flex-col
                           bg-white dark:bg-[#161b22]
                           rounded-t-2xl md:rounded-2xl
                           overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Drag handle */}
                <div className="md:hidden flex justify-center pt-2.5 pb-1 shrink-0">
                    <div className="w-9 h-1 rounded-full bg-slate-300 dark:bg-white/[0.15]" />
                </div>

                {/* Sticky header */}
                <div className="shrink-0 flex items-center justify-between px-3 py-2
                                border-b border-slate-100 dark:border-white/[0.06]">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <div className="h-8 w-8 rounded-lg bg-purple-600 text-white
                                        flex items-center justify-center shrink-0">
                            <Sparkles className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                Suggest a topic
                            </h2>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                {suggestions.length} suggestion
                                {suggestions.length === 1 ? "" : "s"} from peers
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Close"
                        className="h-9 w-9 rounded-full flex items-center justify-center
                                   active:bg-slate-100 dark:active:bg-white/5 transition-colors shrink-0"
                        style={{ touchAction: "manipulation" }}
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Scrollable body */}
                <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
                    <div className="px-3 py-3 space-y-3">
                        {/* Success / Error */}
                        {success && (
                            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-400/10
                                            px-3 py-2 flex items-center gap-2
                                            text-[11px] font-semibold
                                            text-emerald-700 dark:text-emerald-300">
                                <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                                {success}
                            </div>
                        )}
                        {error && (
                            <div className="rounded-xl bg-rose-50 dark:bg-rose-400/10
                                            px-3 py-2 flex items-center gap-2
                                            text-[11px] font-semibold
                                            text-rose-700 dark:text-rose-300">
                                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                {error}
                            </div>
                        )}

                        {/* Form */}
                        <div className="rounded-2xl bg-slate-50 dark:bg-[#0d1117] p-3">
                            <button
                                onClick={() => {
                                    tap();
                                    setShowForm(!showForm);
                                }}
                                className="w-full flex items-center justify-between mb-2"
                                style={{ touchAction: "manipulation" }}
                            >
                                <p className="text-[11px] font-bold uppercase tracking-wider
                                              text-slate-500 dark:text-slate-400">
                                    {showForm ? "Add your suggestion" : "Tap to suggest a topic"}
                                </p>
                                {!showForm && <Plus className="h-3.5 w-3.5 text-slate-400" />}
                            </button>

                            {showForm && (
                                <form onSubmit={handleSubmit} className="space-y-2.5">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-[10px] font-bold uppercase tracking-wider
                                                              text-slate-500 dark:text-slate-400 mb-1">
                                                Topic *
                                            </label>
                                            <input
                                                type="text"
                                                value={newSuggestion.unit_name}
                                                onChange={(e) =>
                                                    setNewSuggestion((prev) => ({
                                                        ...prev,
                                                        unit_name: e.target.value,
                                                    }))
                                                }
                                                className="w-full rounded-lg bg-white dark:bg-[#161b22]
                                                           px-2.5 py-2
                                                           text-sm text-slate-900 dark:text-white
                                                           placeholder:text-slate-400 dark:placeholder:text-slate-500
                                                           focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                                                placeholder="e.g., Urinary catheterization"
                                                autoComplete="off"
                                                style={{ touchAction: "manipulation" }}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold uppercase tracking-wider
                                                              text-slate-500 dark:text-slate-400 mb-1">
                                                Code
                                            </label>
                                            <input
                                                type="text"
                                                value={newSuggestion.unit_code}
                                                onChange={(e) =>
                                                    setNewSuggestion((prev) => ({
                                                        ...prev,
                                                        unit_code: e.target.value,
                                                    }))
                                                }
                                                className="w-full rounded-lg bg-white dark:bg-[#161b22]
                                                           px-2.5 py-2
                                                           text-sm text-slate-900 dark:text-white
                                                           placeholder:text-slate-400 dark:placeholder:text-slate-500
                                                           focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                                                placeholder="NUR-401"
                                                autoComplete="off"
                                                style={{ touchAction: "manipulation" }}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-wider
                                                          text-slate-500 dark:text-slate-400 mb-1">
                                            Why is it useful?
                                        </label>
                                        <textarea
                                            value={newSuggestion.description}
                                            onChange={(e) =>
                                                setNewSuggestion((prev) => ({
                                                    ...prev,
                                                    description: e.target.value,
                                                }))
                                            }
                                            className="w-full rounded-lg bg-white dark:bg-[#161b22]
                                                       px-2.5 py-2 resize-none
                                                       text-sm text-slate-900 dark:text-white
                                                       placeholder:text-slate-400 dark:placeholder:text-slate-500
                                                       focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                                            rows={2}
                                            placeholder="What would you want to learn in this topic?"
                                            style={{
                                                touchAction: "manipulation",
                                                WebkitAppearance: "none",
                                            }}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-[10px] font-bold uppercase tracking-wider
                                                              text-slate-500 dark:text-slate-400 mb-1">
                                                Priority
                                            </label>
                                            <select
                                                value={newSuggestion.priority}
                                                onChange={(e) =>
                                                    setNewSuggestion((prev) => ({
                                                        ...prev,
                                                        priority: e.target.value,
                                                    }))
                                                }
                                                className="w-full rounded-lg bg-white dark:bg-[#161b22]
                                                           px-2.5 py-2 text-sm
                                                           text-slate-900 dark:text-white
                                                           focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                                                style={{ touchAction: "manipulation" }}
                                            >
                                                <option value="low">Low</option>
                                                <option value="medium">Medium</option>
                                                <option value="high">High</option>
                                                <option value="urgent">Urgent</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold uppercase tracking-wider
                                                              text-slate-500 dark:text-slate-400 mb-1">
                                                Category
                                            </label>
                                            <select
                                                value={newSuggestion.category}
                                                onChange={(e) =>
                                                    setNewSuggestion((prev) => ({
                                                        ...prev,
                                                        category: e.target.value,
                                                    }))
                                                }
                                                className="w-full rounded-lg bg-white dark:bg-[#161b22]
                                                           px-2.5 py-2 text-sm
                                                           text-slate-900 dark:text-white
                                                           focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                                                style={{ touchAction: "manipulation" }}
                                            >
                                                <option value="general">General</option>
                                                <option value="theory">Theory</option>
                                                <option value="practicum">Practicum</option>
                                                <option value="clinical">Clinical</option>
                                                <option value="visit">Visit</option>
                                            </select>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="w-full flex items-center justify-center gap-1.5
                                                   h-10 rounded-lg bg-purple-600 text-white
                                                   text-sm font-bold
                                                   active:scale-[0.97] transition-transform
                                                   disabled:opacity-60 disabled:cursor-not-allowed"
                                        style={{ touchAction: "manipulation" }}
                                    >
                                        {submitting ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            <Send className="h-3.5 w-3.5" />
                                        )}
                                        {submitting ? "Submitting…" : "Submit suggestion"}
                                    </button>
                                </form>
                            )}
                        </div>

                        {/* Existing suggestions */}
                        <div>
                            <div className="flex items-center justify-between mb-2 px-1">
                                <p className="text-[11px] font-bold uppercase tracking-wider
                                              text-slate-500 dark:text-slate-400">
                                    What peers are asking for
                                </p>
                                {suggestions.length > 0 && (
                                    <div className="inline-flex items-center gap-1 rounded-full
                                                    bg-emerald-100 dark:bg-emerald-400/10 px-2 py-0.5">
                                        <TrendingUp className="h-2.5 w-2.5 text-emerald-700 dark:text-emerald-300" />
                                        <span className="text-[10px] font-bold tabular-nums
                                                         text-emerald-700 dark:text-emerald-300">
                                            {suggestions.reduce(
                                                (sum, s) => sum + (s.endorsements_count || 0),
                                                0
                                            )}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {loading ? (
                                <div className="space-y-2">
                                    {[1, 2, 3].map((i) => (
                                        <div
                                            key={i}
                                            className="rounded-xl bg-slate-50 dark:bg-[#0d1117] h-16 animate-pulse"
                                        />
                                    ))}
                                </div>
                            ) : suggestions.length === 0 ? (
                                <div className="py-6 text-center">
                                    <Sparkles className="mx-auto mb-2 h-7 w-7 text-slate-300 dark:text-slate-600" />
                                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                                        No suggestions yet
                                    </p>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                        Be the first to ask
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {suggestions.slice(0, 10).map((suggestion) => {
                                        const priority =
                                            priorityConfig[
                                            suggestion.priority as keyof typeof priorityConfig
                                            ] || priorityConfig.medium;
                                        const category =
                                            categoryConfig[
                                            suggestion.category as keyof typeof categoryConfig
                                            ] || categoryConfig.general;
                                        const PriorityIcon = priority.icon;
                                        const CategoryIcon = category.icon;

                                        return (
                                            <div
                                                key={suggestion.id}
                                                className="rounded-xl bg-slate-50 dark:bg-[#0d1117] p-3"
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                                        {suggestion.user?.avatar_url ? (
                                                            <img
                                                                src={suggestion.user.avatar_url}
                                                                alt=""
                                                                className="h-7 w-7 rounded-full object-cover shrink-0"
                                                            />
                                                        ) : (
                                                            <div
                                                                className={`h-7 w-7 rounded-full shrink-0 flex items-center justify-center
                                                                            text-[10px] font-bold text-white
                                                                            ${getAvatarColor(suggestion.user_id)}`}
                                                            >
                                                                {getInitials(suggestion.user?.full_name)}
                                                            </div>
                                                        )}
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                                                {suggestion.unit_name}
                                                            </p>
                                                            <div className="flex items-center gap-1 mt-0.5">
                                                                <span
                                                                    className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5
                                                                                text-[9px] font-bold ${priority.pill}`}
                                                                >
                                                                    <PriorityIcon className="h-2 w-2" />
                                                                    {priority.label}
                                                                </span>
                                                                <span className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5
                                                                                 bg-slate-200 dark:bg-white/[0.08]
                                                                                 text-[9px] font-bold
                                                                                 text-slate-600 dark:text-slate-300">
                                                                    <CategoryIcon className="h-2 w-2" />
                                                                    {category.label}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <button
                                                        onClick={() => {
                                                            tap();
                                                            handleEndorse(suggestion.id);
                                                        }}
                                                        className={`shrink-0 inline-flex items-center gap-1
                                                                    rounded-full px-2 py-1
                                                                    text-[11px] font-bold
                                                                    active:scale-[0.95] transition-transform
                                                                    ${suggestion.user_endorsed
                                                                ? "bg-rose-600 text-white"
                                                                : "bg-white dark:bg-white/[0.08] text-slate-700 dark:text-slate-300"
                                                            }`}
                                                        style={{ touchAction: "manipulation" }}
                                                    >
                                                        <Heart
                                                            className={`h-3 w-3 ${suggestion.user_endorsed ? "fill-white" : ""
                                                                }`}
                                                        />
                                                        {suggestion.endorsements_count || 0}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}