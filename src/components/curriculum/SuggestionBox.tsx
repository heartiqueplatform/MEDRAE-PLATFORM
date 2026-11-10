// components/SuggestionBox.tsx
import { useState, useEffect, useRef } from "react";
import {
    Heart,
    Star,
    Flame,
    Clock,
    Send,
    Trash2,
    User,
    Calendar,
    X,
    Sparkles,
    TrendingUp,
    Zap,
    CheckCircle,
    AlertCircle,
    Plus,
    Maximize2,
    BookOpen,
    FlaskConical,
    Stethoscope,
    MapPin,
    ChevronLeft,
} from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabaseClient";
import {
    getSuggestions,
    createSuggestion,
    toggleEndorsement,
    deleteSuggestion,
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

const SUGGESTION_LABEL = "Suggestion";
const SUGGESTION_LABEL_PLURAL = "Suggestions";
const SUGGESTION_ACTION = "Suggest";

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

const statusConfig = {
    pending: {
        label: "Pending",
        icon: Clock,
        pill: "bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300",
    },
    approved: {
        label: "Approved",
        icon: CheckCircle,
        pill: "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300",
    },
    rejected: {
        label: "Rejected",
        icon: X,
        pill: "bg-rose-100 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300",
    },
    in_review: {
        label: "In review",
        icon: AlertCircle,
        pill: "bg-blue-100 text-blue-700 dark:bg-blue-400/10 dark:text-blue-300",
    },
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
/*  Fullscreen sheet — native bottom sheet on mobile, centered on md+  */
/* ------------------------------------------------------------------ */

function FullScreenSuggestionCard({
    suggestion,
    onClose,
    onEndorse,
    onDelete,
    user,
}: {
    suggestion: Suggestion;
    onClose: () => void;
    onEndorse: (id: string) => void;
    onDelete: (id: string) => void;
    user: any;
}) {
    const priority =
        priorityConfig[suggestion.priority as keyof typeof priorityConfig] ||
        priorityConfig.medium;
    const category =
        categoryConfig[suggestion.category as keyof typeof categoryConfig] ||
        categoryConfig.general;
    const status =
        statusConfig[suggestion.status as keyof typeof statusConfig] ||
        statusConfig.pending;
    const PriorityIcon = priority.icon;
    const CategoryIcon = category.icon;
    const StatusIcon = status.icon;

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center
                       bg-black/50 backdrop-blur-sm"
            onClick={onClose}
            style={{ WebkitTapHighlightColor: "transparent" }}
        >
            <div
                className="relative w-full md:max-w-lg max-h-[88vh] md:max-h-[90vh] overflow-y-auto no-scrollbar
                           bg-white dark:bg-[#161b22]
                           rounded-t-2xl md:rounded-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Drag handle (mobile only) */}
                <div className="md:hidden flex justify-center pt-2.5 pb-1">
                    <div className="w-9 h-1 rounded-full bg-slate-300 dark:bg-white/[0.15]" />
                </div>

                {/* Sticky close bar */}
                <div className="sticky top-0 z-10 bg-white dark:bg-[#161b22] flex items-center justify-between px-3 py-2 border-b border-slate-100 dark:border-white/[0.06]">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {SUGGESTION_LABEL} details
                    </p>
                    <button
                        onClick={onClose}
                        aria-label="Close"
                        className="h-9 w-9 rounded-full flex items-center justify-center
                                   active:bg-slate-100 dark:active:bg-white/5 transition-colors"
                        style={{ touchAction: "manipulation" }}
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="px-4 pb-4 pt-4">
                    {/* Author row */}
                    <div className="flex items-center gap-3 mb-4">
                        <div className="relative shrink-0">
                            {suggestion.user?.avatar_url ? (
                                <img
                                    src={suggestion.user.avatar_url}
                                    alt={suggestion.user.full_name || "User"}
                                    className="h-12 w-12 rounded-full object-cover"
                                />
                            ) : (
                                <div
                                    className={`flex h-12 w-12 items-center justify-center rounded-full
                                                text-base font-bold text-white
                                                ${getAvatarColor(suggestion.user_id)}`}
                                >
                                    {getInitials(suggestion.user?.full_name)}
                                </div>
                            )}
                            {suggestion.user_endorsed && (
                                <div className="absolute -bottom-0.5 -right-0.5 rounded-full bg-emerald-600 p-0.5 ring-2 ring-white dark:ring-[#161b22]">
                                    <CheckCircle className="h-3 w-3 text-white" />
                                </div>
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                                {suggestion.user?.full_name || "Anonymous"}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                {new Date(suggestion.created_at).toLocaleDateString()}
                            </p>
                        </div>
                    </div>

                    {/* Title + code */}
                    <div className="mb-3">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                            {suggestion.unit_name}
                        </h2>
                        {suggestion.unit_code && (
                            <span className="inline-block mt-1 rounded-full
                                             bg-slate-100 dark:bg-white/[0.06]
                                             px-2 py-0.5
                                             text-[10px] font-mono font-bold
                                             text-slate-600 dark:text-slate-400">
                                {suggestion.unit_code}
                            </span>
                        )}
                    </div>

                    {/* Pills */}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                        <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5
                                        text-[10px] font-bold ${priority.pill}`}
                        >
                            <PriorityIcon className="h-3 w-3" />
                            {priority.label}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5
                                         text-[10px] font-bold
                                         bg-slate-100 text-slate-600
                                         dark:bg-white/[0.06] dark:text-slate-300">
                            <CategoryIcon className="h-3 w-3" />
                            {category.label}
                        </span>
                        <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5
                                        text-[10px] font-bold ${status.pill}`}
                        >
                            <StatusIcon className="h-3 w-3" />
                            {status.label}
                        </span>
                    </div>

                    {/* Description */}
                    {suggestion.description && (
                        <div className="rounded-xl bg-slate-50 dark:bg-[#0d1117] p-3 mb-3">
                            <p className="text-sm leading-6 text-slate-700 dark:text-slate-300">
                                {suggestion.description}
                            </p>
                        </div>
                    )}

                    {/* Endorsements */}
                    <div className="rounded-xl bg-rose-50 dark:bg-rose-400/10 p-3 mb-4
                                    flex items-center justify-center gap-3">
                        <Heart className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                        <div className="text-center">
                            <p className="text-lg font-black tabular-nums text-rose-700 dark:text-rose-300 leading-none">
                                {suggestion.endorsements_count || 0}
                            </p>
                            <p className="text-[10px] text-rose-600/70 dark:text-rose-400/70">
                                endorsement
                                {suggestion.endorsements_count === 1 ? "" : "s"}
                            </p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                        <button
                            onClick={() => {
                                tap("success");
                                onEndorse(suggestion.id);
                                onClose();
                            }}
                            className={`w-full flex items-center justify-center gap-2
                                        h-11 rounded-xl text-sm font-bold
                                        active:scale-[0.98] transition-transform
                                        ${suggestion.user_endorsed
                                    ? "bg-rose-600 text-white"
                                    : "bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-200"
                                }`}
                            style={{ touchAction: "manipulation" }}
                        >
                            <Heart
                                className={`h-4 w-4 ${suggestion.user_endorsed ? "fill-white" : ""
                                    }`}
                            />
                            {suggestion.user_endorsed ? "Endorsed" : "Endorse"}
                        </button>

                        {user && suggestion.user_id === user.id && (
                            <button
                                onClick={() => {
                                    tap("warning");
                                    onDelete(suggestion.id);
                                    onClose();
                                }}
                                className="w-full flex items-center justify-center gap-2
                                           h-11 rounded-xl bg-rose-50 dark:bg-rose-400/10
                                           text-sm font-bold text-rose-700 dark:text-rose-300
                                           active:scale-[0.98] transition-transform"
                                style={{ touchAction: "manipulation" }}
                            >
                                <Trash2 className="h-4 w-4" />
                                Delete
                            </button>
                        )}

                        <button
                            onClick={onClose}
                            className="w-full flex items-center justify-center gap-1.5
                                       h-10 rounded-xl
                                       text-xs font-bold
                                       text-slate-500 dark:text-slate-400
                                       active:bg-slate-100 dark:active:bg-white/5
                                       transition-colors"
                            style={{ touchAction: "manipulation" }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */

export default function SuggestionBox() {
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [expandedSuggestion, setExpandedSuggestion] =
        useState<Suggestion | null>(null);
    const [filter, setFilter] = useState({
        priority: "all",
        category: "all",
        status: "all",
        sortBy: "newest" as "newest" | "popular" | "trending",
    });

    const formRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const [newSuggestion, setNewSuggestion] = useState({
        unit_name: "",
        unit_code: "",
        description: "",
        priority: "medium",
        category: "general",
    });

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            if (data.session?.user) setUser(data.session.user);
        });
        loadSuggestions();
        const unsubscribe = subscribeToSuggestions(() => loadSuggestions());
        return () => {
            unsubscribe();
        };
    }, []);

    const loadSuggestions = async () => {
        try {
            const data = await getSuggestions();
            setSuggestions(data);
        } catch (error) {
            console.error("Error loading suggestions:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
            setError("Please log in first");
            return;
        }
        if (!newSuggestion.unit_name.trim()) {
            setError("Please enter a name");
            return;
        }
        try {
            const suggestion = await createSuggestion(newSuggestion);
            setSuggestions([suggestion, ...suggestions]);
            setNewSuggestion({
                unit_name: "",
                unit_code: "",
                description: "",
                priority: "medium",
                category: "general",
            });
            setShowForm(false);
            setSuccess(`🎉 ${SUGGESTION_LABEL} submitted`);
            setTimeout(() => setSuccess(""), 3000);
            tap("success");
        } catch (error) {
            setError("Failed to submit");
            setTimeout(() => setError(""), 3000);
        }
    };

    const handleEndorse = async (suggestionId: string) => {
        if (!user) {
            setError("Please log in to endorse");
            setTimeout(() => setError(""), 3000);
            return;
        }
        try {
            const result = await toggleEndorsement(suggestionId);
            setSuggestions(
                suggestions.map((s) =>
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
        } catch (error) {
            console.error("Error toggling endorsement:", error);
        }
    };

    const handleDelete = async (suggestionId: string) => {
        if (!user) return;
        if (!confirm("Delete this suggestion?")) return;
        try {
            await deleteSuggestion(suggestionId);
            setSuggestions(suggestions.filter((s) => s.id !== suggestionId));
            setSuccess("🗑️ Deleted");
            setTimeout(() => setSuccess(""), 2000);
        } catch (error) {
            setError("Failed to delete");
            setTimeout(() => setError(""), 3000);
        }
    };

    const filteredSuggestions = suggestions.filter((s) => {
        if (filter.priority !== "all" && s.priority !== filter.priority) return false;
        if (filter.category !== "all" && s.category !== filter.category) return false;
        if (filter.status !== "all" && s.status !== filter.status) return false;
        return true;
    });

    const sortedSuggestions = [...filteredSuggestions].sort((a, b) => {
        if (filter.sortBy === "newest")
            return (
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
        if (filter.sortBy === "popular")
            return b.endorsements_count - a.endorsements_count;
        const scoreA =
            (a.endorsements_count || 0) +
            (Date.now() - new Date(a.created_at).getTime()) / 86400000;
        const scoreB =
            (b.endorsements_count || 0) +
            (Date.now() - new Date(b.created_at).getTime()) / 86400000;
        return scoreB - scoreA;
    });

    const totalEndorsements = suggestions.reduce(
        (sum, s) => sum + (s.endorsements_count || 0),
        0
    );

    const handleExpand = (suggestion: Suggestion) => {
        tap();
        setExpandedSuggestion(suggestion);
        document.body.style.overflow = "hidden";
    };

    const handleCloseExpand = () => {
        setExpandedSuggestion(null);
        document.body.style.overflow = "unset";
    };

    /* ── Skeleton ── */
    if (loading) {
        return (
            <div className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="h-5 w-40 rounded bg-slate-200 dark:bg-white/[0.06] animate-pulse" />
                    <div className="h-8 w-24 rounded-full bg-slate-200 dark:bg-white/[0.06] animate-pulse" />
                </div>
                <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="rounded-xl bg-slate-50 dark:bg-[#0d1117] h-20 animate-pulse"
                        />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="rounded-2xl bg-white dark:bg-[#161b22] p-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="min-w-0">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span className="text-[13px]">💡</span>
                            <span className="truncate">
                                {SUGGESTION_LABEL_PLURAL}
                            </span>
                            <span className="text-xs font-normal text-slate-400">
                                ({suggestions.length})
                            </span>
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {SUGGESTION_ACTION} new or endorse what you need
                        </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                        <div className="flex items-center gap-1 rounded-full
                                        bg-emerald-100 dark:bg-emerald-400/10
                                        px-2 py-1">
                            <TrendingUp className="h-3 w-3 text-emerald-700 dark:text-emerald-300" />
                            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
                                {totalEndorsements}
                            </span>
                        </div>
                        <button
                            onClick={() => {
                                tap();
                                setShowForm(!showForm);
                            }}
                            className="inline-flex items-center gap-1 rounded-full
                                       bg-emerald-600 text-white
                                       px-3 py-1.5
                                       text-[11px] font-bold
                                       active:scale-[0.97] transition-transform"
                            style={{ touchAction: "manipulation" }}
                        >
                            {showForm ? (
                                <X className="h-3 w-3" />
                            ) : (
                                <Plus className="h-3 w-3" />
                            )}
                            {showForm ? "Cancel" : SUGGESTION_ACTION}
                        </button>
                    </div>
                </div>

                {/* Success / Error */}
                {success && (
                    <div className="rounded-xl bg-emerald-50 dark:bg-emerald-400/10
                                    px-3 py-2 mb-3 flex items-center gap-2
                                    text-[11px] font-semibold
                                    text-emerald-700 dark:text-emerald-300">
                        <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                        {success}
                    </div>
                )}
                {error && (
                    <div className="rounded-xl bg-rose-50 dark:bg-rose-400/10
                                    px-3 py-2 mb-3 flex items-center gap-2
                                    text-[11px] font-semibold
                                    text-rose-700 dark:text-rose-300">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        {error}
                    </div>
                )}

                {/* Form */}
                {showForm && (
                    <div ref={formRef} className="rounded-xl bg-slate-50 dark:bg-[#0d1117] p-3 mb-3">
                        <form onSubmit={handleSubmit} className="space-y-2.5">
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                                        Name *
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
                                                   focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                                        placeholder="e.g., Advanced topic"
                                        autoFocus
                                        autoComplete="off"
                                        style={{ touchAction: "manipulation" }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
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
                                                   focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                                        placeholder="NUR-401"
                                        autoComplete="off"
                                        style={{ touchAction: "manipulation" }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                                    Description
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
                                               focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                                    rows={3}
                                    placeholder="What does this cover?"
                                    style={{
                                        touchAction: "manipulation",
                                        WebkitAppearance: "none",
                                    }}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                                        Priority
                                    </label>
                                    <Select
                                        value={newSuggestion.priority}
                                        onValueChange={(value) =>
                                            setNewSuggestion((prev) => ({ ...prev, priority: value }))
                                        }
                                    >
                                        <SelectTrigger
                                            className="w-full h-9 rounded-lg border-0
                           bg-white dark:bg-[#161b22]
                           px-2.5 text-sm
                           text-slate-900 dark:text-white
                           focus:ring-2 focus:ring-emerald-500/40
                           focus:outline-none"
                                        >
                                            <SelectValue placeholder="Select priority" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl border-0 shadow-lg bg-white dark:bg-[#161b22]">
                                            <SelectItem value="low">Low</SelectItem>
                                            <SelectItem value="medium">Medium</SelectItem>
                                            <SelectItem value="high">High</SelectItem>
                                            <SelectItem value="urgent">Urgent</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                                        Category
                                    </label>
                                    <Select
                                        value={newSuggestion.category}
                                        onValueChange={(value) =>
                                            setNewSuggestion((prev) => ({ ...prev, category: value }))
                                        }
                                    >
                                        <SelectTrigger
                                            className="w-full h-9 rounded-lg border-0
                           bg-white dark:bg-[#161b22]
                           px-2.5 text-sm
                           text-slate-900 dark:text-white
                           focus:ring-2 focus:ring-emerald-500/40
                           focus:outline-none"
                                        >
                                            <SelectValue placeholder="Select category" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl border-0 shadow-lg bg-white dark:bg-[#161b22]">
                                            <SelectItem value="general">General</SelectItem>
                                            <SelectItem value="theory">Theory</SelectItem>
                                            <SelectItem value="practicum">Practicum</SelectItem>
                                            <SelectItem value="clinical">Clinical</SelectItem>
                                            <SelectItem value="visit">Visit</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full flex items-center justify-center gap-1.5
                                           h-10 rounded-lg bg-emerald-600 text-white
                                           text-sm font-bold
                                           active:scale-[0.97] transition-transform"
                                style={{ touchAction: "manipulation" }}
                            >
                                <Send className="h-3.5 w-3.5" />
                                {SUGGESTION_ACTION}
                            </button>
                        </form>
                    </div>
                )}

                {/* Filters — native pill row */}
                {/* Filters — custom pill dropdowns */}
                <div className="flex gap-1.5 mb-3 overflow-x-auto no-scrollbar pb-0.5">
                    <Select
                        value={filter.priority}
                        onValueChange={(value) => {
                            tap();
                            setFilter((prev) => ({ ...prev, priority: value }));
                        }}
                    >
                        <SelectTrigger
                            className="shrink-0 h-8 w-auto min-w-0 rounded-full border-0
                       bg-slate-100 dark:bg-white/[0.06]
                       px-2.5 text-[11px] font-semibold
                       text-slate-700 dark:text-slate-300
                       focus:ring-0 focus:outline-none
                       [&>span]:line-clamp-1
                       gap-1"
                        >
                            <SelectValue placeholder="Priority" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-0 shadow-lg bg-white dark:bg-[#161b22]">
                            <SelectItem value="all">All priorities</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select
                        value={filter.category}
                        onValueChange={(value) => {
                            tap();
                            setFilter((prev) => ({ ...prev, category: value }));
                        }}
                    >
                        <SelectTrigger
                            className="shrink-0 h-8 w-auto min-w-0 rounded-full border-0
                       bg-slate-100 dark:bg-white/[0.06]
                       px-2.5 text-[11px] font-semibold
                       text-slate-700 dark:text-slate-300
                       focus:ring-0 focus:outline-none
                       [&>span]:line-clamp-1
                       gap-1"
                        >
                            <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-0 shadow-lg bg-white dark:bg-[#161b22]">
                            <SelectItem value="all">All categories</SelectItem>
                            <SelectItem value="theory">Theory</SelectItem>
                            <SelectItem value="practicum">Practicum</SelectItem>
                            <SelectItem value="clinical">Clinical</SelectItem>
                            <SelectItem value="visit">Visit</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select
                        value={filter.sortBy}
                        onValueChange={(value) => {
                            tap();
                            setFilter((prev) => ({ ...prev, sortBy: value as any }));
                        }}
                    >
                        <SelectTrigger
                            className="shrink-0 h-8 w-auto min-w-0 rounded-full border-0
                       bg-slate-100 dark:bg-white/[0.06]
                       px-2.5 text-[11px] font-semibold
                       text-slate-700 dark:text-slate-300
                       focus:ring-0 focus:outline-none
                       [&>span]:line-clamp-1
                       gap-1"
                        >
                            <SelectValue placeholder="Sort" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-0 shadow-lg bg-white dark:bg-[#161b22]">
                            <SelectItem value="newest">Newest</SelectItem>
                            <SelectItem value="popular">Most endorsed</SelectItem>
                            <SelectItem value="trending">Trending</SelectItem>
                        </SelectContent>
                    </Select>

                    <button
                        onClick={() => {
                            tap();
                            setFilter({
                                priority: "all",
                                category: "all",
                                status: "all",
                                sortBy: "newest",
                            });
                        }}
                        className="shrink-0 rounded-full bg-slate-100 dark:bg-white/[0.06]
                   px-2.5 h-8 text-[11px] font-semibold
                   text-slate-700 dark:text-slate-300
                   active:scale-[0.97] transition-transform"
                        style={{ touchAction: "manipulation" }}
                    >
                        Clear
                    </button>
                </div>

                {/* Suggestion list */}
                <div
                    ref={listRef}
                    className="max-h-[420px] overflow-y-auto no-scrollbar space-y-2"
                >
                    {sortedSuggestions.length === 0 ? (
                        <div className="py-8 text-center">
                            <Sparkles className="mx-auto mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
                            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                                No {SUGGESTION_LABEL_PLURAL.toLowerCase()} yet
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                Be the first to {SUGGESTION_ACTION.toLowerCase()}
                            </p>
                        </div>
                    ) : (
                        sortedSuggestions.map((suggestion) => {
                            const priority =
                                priorityConfig[
                                suggestion.priority as keyof typeof priorityConfig
                                ] || priorityConfig.medium;
                            const category =
                                categoryConfig[
                                suggestion.category as keyof typeof categoryConfig
                                ] || categoryConfig.general;
                            const status =
                                statusConfig[
                                suggestion.status as keyof typeof statusConfig
                                ] || statusConfig.pending;
                            const PriorityIcon = priority.icon;
                            const CategoryIcon = category.icon;

                            return (
                                <button
                                    key={suggestion.id}
                                    onClick={() => handleExpand(suggestion)}
                                    className="w-full text-left rounded-xl
                                               bg-slate-50 dark:bg-[#0d1117] p-3
                                               active:scale-[0.99] transition-transform"
                                    style={{ touchAction: "manipulation" }}
                                >
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                            <div className="relative shrink-0">
                                                {suggestion.user?.avatar_url ? (
                                                    <img
                                                        src={suggestion.user.avatar_url}
                                                        alt=""
                                                        className="h-8 w-8 rounded-full object-cover"
                                                    />
                                                ) : (
                                                    <div
                                                        className={`flex h-8 w-8 items-center justify-center rounded-full
                                                                    text-[11px] font-bold text-white
                                                                    ${getAvatarColor(suggestion.user_id)}`}
                                                    >
                                                        {getInitials(suggestion.user?.full_name)}
                                                    </div>
                                                )}
                                                {suggestion.user_endorsed && (
                                                    <div className="absolute -bottom-0.5 -right-0.5 rounded-full
                                                                    bg-emerald-600 p-0.5
                                                                    ring-2 ring-slate-50 dark:ring-[#0d1117]">
                                                        <CheckCircle className="h-2 w-2 text-white" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                                                    {suggestion.user?.full_name || "Anonymous"}
                                                </p>
                                                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                                    {new Date(suggestion.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Endorse count pill */}
                                        <span
                                            className={`inline-flex items-center gap-1 shrink-0
                                                        rounded-full px-2 py-0.5
                                                        text-[11px] font-bold
                                                        ${suggestion.user_endorsed
                                                    ? "bg-rose-600 text-white"
                                                    : "bg-slate-200 dark:bg-white/[0.08] text-slate-700 dark:text-slate-300"
                                                }`}
                                        >
                                            <Heart
                                                className={`h-3 w-3 ${suggestion.user_endorsed ? "fill-white" : ""
                                                    }`}
                                            />
                                            {suggestion.endorsements_count || 0}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-1.5 mb-1">
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                            {suggestion.unit_name}
                                        </h4>
                                        {suggestion.unit_code && (
                                            <span className="shrink-0 rounded-full
                                                             bg-slate-200 dark:bg-white/[0.08]
                                                             px-1.5 py-0.5
                                                             text-[9px] font-mono font-bold
                                                             text-slate-600 dark:text-slate-400">
                                                {suggestion.unit_code}
                                            </span>
                                        )}
                                    </div>

                                    {suggestion.description && (
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mb-2">
                                            {suggestion.description}
                                        </p>
                                    )}

                                    <div className="flex flex-wrap items-center gap-1">
                                        <span
                                            className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5
                                                        text-[10px] font-bold ${priority.pill}`}
                                        >
                                            <PriorityIcon className="h-2.5 w-2.5" />
                                            {priority.label}
                                        </span>
                                        <span className="inline-flex items-center gap-1 rounded-full
                                                         bg-slate-200 dark:bg-white/[0.08]
                                                         px-1.5 py-0.5
                                                         text-[10px] font-bold
                                                         text-slate-600 dark:text-slate-300">
                                            <CategoryIcon className="h-2.5 w-2.5" />
                                            {category.label}
                                        </span>
                                        <span
                                            className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5
                                                        text-[10px] font-bold ${status.pill}`}
                                        >
                                            {status.label}
                                        </span>
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>

                {sortedSuggestions.length > 0 && (
                    <p className="mt-3 text-center text-[10px] text-slate-400 dark:text-slate-500">
                        {sortedSuggestions.length} of {suggestions.length}
                        {filter.priority !== "all" || filter.category !== "all"
                            ? " (filtered)"
                            : ""}
                    </p>
                )}
            </div>

            {expandedSuggestion && (
                <FullScreenSuggestionCard
                    suggestion={expandedSuggestion}
                    onClose={handleCloseExpand}
                    onEndorse={handleEndorse}
                    onDelete={handleDelete}
                    user={user}
                />
            )}
        </>
    );
}