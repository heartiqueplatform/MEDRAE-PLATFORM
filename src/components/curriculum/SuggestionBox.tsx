// components/SuggestionBox.tsx
import { useState, useEffect, useRef } from 'react';
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
    Award,
    Zap,
    CheckCircle,
    AlertCircle,
    Plus,
    Maximize2,
    BookOpen,
    FlaskConical,
    Stethoscope,
    MapPin,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import {
    getSuggestions,
    createSuggestion,
    toggleEndorsement,
    deleteSuggestion,
    subscribeToSuggestions,
    Suggestion
} from '@/lib/nursingQueries';

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const SUGGESTION_LABEL = 'Suggestion';
const SUGGESTION_LABEL_PLURAL = 'Suggestions';
const SUGGESTION_ACTION = 'Suggest';

const priorityConfig = {
    low: { label: 'Low', icon: Clock, color: 'text-slate-400', bg: 'bg-slate-100 dark:bg-slate-800' },
    medium: { label: 'Medium', icon: Star, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
    high: { label: 'High', icon: Flame, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-500/10' },
    urgent: { label: 'Urgent', icon: Zap, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-500/10' },
};

const categoryConfig = {
    general: { label: 'General', icon: Sparkles, color: 'text-slate-500' },
    theory: { label: 'Theory', icon: BookOpen, color: 'text-sky-500' },
    practicum: { label: 'Practicum', icon: FlaskConical, color: 'text-emerald-500' },
    clinical: { label: 'Clinical', icon: Stethoscope, color: 'text-rose-500' },
    visit: { label: 'Visit', icon: MapPin, color: 'text-amber-500' },
};

const statusConfig = {
    pending: { label: 'Pending', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
    approved: { label: 'Approved ✅', icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
    rejected: { label: 'Rejected', icon: X, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-500/10' },
    in_review: { label: 'In Review', icon: AlertCircle, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' },
};

// Full screen suggestion card component - responsive
// Full screen suggestion card component - matches TriagePopup style
function FullScreenSuggestionCard({
    suggestion,
    onClose,
    onEndorse,
    onDelete,
    user
}: {
    suggestion: Suggestion;
    onClose: () => void;
    onEndorse: (id: string) => void;
    onDelete: (id: string) => void;
    user: any;
}) {
    const PriorityIcon = priorityConfig[suggestion.priority as keyof typeof priorityConfig]?.icon || Clock;
    const priorityInfo = priorityConfig[suggestion.priority as keyof typeof priorityConfig] || priorityConfig.medium;
    const categoryInfo = categoryConfig[suggestion.category as keyof typeof categoryConfig] || categoryConfig.general;
    const statusInfo = statusConfig[suggestion.status as keyof typeof statusConfig] || statusConfig.pending;
    const CategoryIcon = categoryInfo.icon;

    const getInitials = (name?: string) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const getAvatarColor = (userId: string) => {
        const colors = [
            'bg-rose-500', 'bg-sky-500', 'bg-emerald-500', 'bg-amber-500',
            'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'
        ];
        const index = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return colors[index % colors.length];
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full md:max-w-2xl max-h-[85vh] md:max-h-[90vh] overflow-y-auto">
                <div className="bg-white dark:bg-gray-900 p-4 md:p-6 shadow-2xl dark:bg-muted/90 rounded-t-2xl md:rounded-2xl border-0">

                    {/* Drag handle for mobile bottom sheet */}
                    <div className="md:hidden flex justify-center pb-2">
                        <div className="w-8 h-1 bg-slate-300 dark:bg-slate-600 rounded-full"></div>
                    </div>

                    <button
                        onClick={onClose}
                        className="absolute right-3 top-3 md:right-4 md:top-4 rounded-full p-1.5 md:p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition z-10"
                    >
                        <X className="h-4 w-4 md:h-5 md:w-5" />
                    </button>

                    {/* Avatar + Name Section - Centered like TriagePopup */}
                    <div className="flex flex-col items-center text-center mb-4 md:mb-6">
                        {/* Avatar */}
                        <div className="relative shrink-0 mb-3 md:mb-4">
                            {suggestion.user?.avatar_url ? (
                                <img
                                    src={suggestion.user.avatar_url}
                                    alt={suggestion.user.full_name || 'User'}
                                    className="h-16 w-16 md:h-24 md:w-24 rounded-full object-cover border-2 border-white dark:border-gray-700 shadow-lg"
                                />
                            ) : (
                                <div className={`flex h-16 w-16 md:h-24 md:w-24 items-center justify-center rounded-full text-2xl md:text-4xl font-bold text-white shadow-lg ${getAvatarColor(suggestion.user_id)}`}>
                                    {getInitials(suggestion.user?.full_name)}
                                </div>
                            )}
                            {suggestion.user_endorsed && (
                                <div className="absolute -bottom-1 -right-1 rounded-full bg-emerald-500 p-1 md:p-1.5 shadow-lg">
                                    <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-white" />
                                </div>
                            )}
                        </div>

                        {/* Name & Code */}
                        <h3 className="text-lg md:text-2xl font-bold text-slate-900 dark:text-white">
                            {suggestion.unit_name}
                        </h3>
                        {suggestion.unit_code && (
                            <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 md:px-3 py-0.5 text-[10px] md:text-xs font-mono font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                {suggestion.unit_code}
                            </span>
                        )}

                        {/* User Info */}
                        <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5 md:gap-2 text-xs md:text-sm">
                            <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                                <User className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                {suggestion.user?.full_name || 'Anonymous'}
                            </span>
                            <span className="text-slate-300 dark:text-slate-600">•</span>
                            <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                                <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                {new Date(suggestion.created_at).toLocaleDateString()}
                            </span>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="w-full h-px bg-gray-200 dark:bg-gray-700 my-3 md:my-4" />

                    {/* Badges Row */}
                    <div className="flex flex-wrap justify-center gap-1.5 md:gap-2 mb-3 md:mb-4">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs font-bold ${priorityInfo.bg} ${priorityInfo.color}`}>
                            <PriorityIcon className="h-3.5 w-3.5 md:h-4 md:w-4" />
                            {priorityInfo.label} Priority
                        </span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs font-bold ${categoryInfo.bg} ${categoryInfo.color}`}>
                            <CategoryIcon className="h-3.5 w-3.5 md:h-4 md:w-4" />
                            {categoryInfo.label}
                        </span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs font-bold ${statusInfo.bg} ${statusInfo.color}`}>
                            {statusInfo.icon && <statusInfo.icon className="h-3.5 w-3.5 md:h-4 md:w-4" />}
                            {statusInfo.label}
                        </span>
                    </div>

                    {/* Description */}
                    {suggestion.description && (
                        <div className="mb-3 md:mb-4 rounded-xl bg-slate-50 p-3 md:p-4 dark:bg-slate-800/50">
                            <p className="text-xs md:text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                                {suggestion.description}
                            </p>
                        </div>
                    )}

                    {/* Endorsements Count */}
                    <div className="mb-3 md:mb-4 flex items-center justify-center gap-3 md:gap-4 rounded-xl bg-rose-50 p-3 md:p-4 dark:bg-rose-500/10">
                        <Heart className="h-5 w-5 md:h-6 md:w-6 text-rose-500" />
                        <div className="text-center">
                            <p className="font-bold text-rose-700 dark:text-rose-400 text-lg md:text-xl">
                                {suggestion.endorsements_count || 0}
                            </p>
                            <p className="text-[10px] md:text-xs text-rose-500/70 dark:text-rose-400/70">
                                endorsements
                            </p>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="w-full h-px bg-gray-200 dark:bg-gray-700 my-3 md:my-4" />

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2 md:gap-3">
                        <button
                            onClick={() => { onEndorse(suggestion.id); onClose(); }}
                            className={`w-full flex items-center justify-center gap-2 rounded-xl py-2.5 md:py-3 text-sm md:text-base font-bold transition active:scale-[0.98] md:hover:scale-105 ${suggestion.user_endorsed
                                ? 'bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-lg shadow-rose-500/30'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                                }`}
                        >
                            <Heart className={`h-4 w-4 md:h-5 md:w-5 ${suggestion.user_endorsed ? 'fill-white' : ''}`} />
                            {suggestion.user_endorsed ? 'Endorsed ✅' : 'Endorse This Suggestion'}
                        </button>

                        {user && suggestion.user_id === user.id && (
                            <button
                                onClick={() => { onDelete(suggestion.id); onClose(); }}
                                className="w-full flex items-center justify-center gap-2 rounded-xl bg-rose-50 py-2.5 md:py-3 text-sm md:text-base font-bold text-rose-600 transition hover:bg-rose-100 active:scale-[0.98] dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20"
                            >
                                <Trash2 className="h-4 w-4 md:h-5 md:w-5" />
                                Delete Suggestion
                            </button>
                        )}

                        <button
                            onClick={onClose}
                            className="w-full flex items-center justify-center gap-2 rounded-xl py-2 md:py-2.5 text-xs md:text-sm font-bold text-slate-500 transition hover:bg-slate-100 active:scale-[0.98] dark:text-slate-400 dark:hover:bg-slate-800"
                        >
                            Continue browsing
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function SuggestionBox() {
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [expandedSuggestion, setExpandedSuggestion] = useState<Suggestion | null>(null);
    const [filter, setFilter] = useState({
        priority: 'all',
        category: 'all',
        status: 'all',
        sortBy: 'newest' as 'newest' | 'popular' | 'trending'
    });

    const formRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const [newSuggestion, setNewSuggestion] = useState({
        unit_name: '',
        unit_code: '',
        description: '',
        priority: 'medium',
        category: 'general',
    });

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            if (data.session?.user) setUser(data.session.user);
        });
        loadSuggestions();
        const unsubscribe = subscribeToSuggestions(() => loadSuggestions());
        return () => { unsubscribe(); };
    }, []);

    const loadSuggestions = async () => {
        try {
            const data = await getSuggestions();
            setSuggestions(data);
        } catch (error) {
            console.error('Error loading suggestions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) { setError(`Please login`); return; }
        if (!newSuggestion.unit_name.trim()) { setError(`Please enter a name`); return; }
        try {
            const suggestion = await createSuggestion(newSuggestion);
            setSuggestions([suggestion, ...suggestions]);
            setNewSuggestion({ unit_name: '', unit_code: '', description: '', priority: 'medium', category: 'general' });
            setShowForm(false);
            setSuccess(`🎉 ${SUGGESTION_LABEL} suggested successfully!`);
            setTimeout(() => setSuccess(''), 3000);
        } catch (error) {
            setError(`Failed`);
            setTimeout(() => setError(''), 3000);
        }
    };

    const handleEndorse = async (suggestionId: string) => {
        if (!user) { setError('Please login to endorse'); setTimeout(() => setError(''), 3000); return; }
        try {
            const result = await toggleEndorsement(suggestionId);
            setSuggestions(suggestions.map(s => s.id === suggestionId ? { ...s, user_endorsed: result.endorsed, endorsements_count: result.endorsed ? s.endorsements_count + 1 : s.endorsements_count - 1 } : s));
        } catch (error) { console.error('Error toggling endorsement:', error); }
    };

    const handleDelete = async (suggestionId: string) => {
        if (!user) return;
        if (!confirm(`Delete?`)) return;
        try {
            await deleteSuggestion(suggestionId);
            setSuggestions(suggestions.filter(s => s.id !== suggestionId));
            setSuccess(`🗑️ Deleted`);
            setTimeout(() => setSuccess(''), 2000);
        } catch (error) { setError(`Failed`); setTimeout(() => setError(''), 3000); }
    };

    const getInitials = (name?: string) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?';
    const getAvatarColor = (userId: string) => ['bg-rose-500', 'bg-sky-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'][userId.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 8];

    const filteredSuggestions = suggestions.filter(s => {
        if (filter.priority !== 'all' && s.priority !== filter.priority) return false;
        if (filter.category !== 'all' && s.category !== filter.category) return false;
        if (filter.status !== 'all' && s.status !== filter.status) return false;
        return true;
    });

    const sortedSuggestions = [...filteredSuggestions].sort((a, b) => {
        if (filter.sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        if (filter.sortBy === 'popular') return b.endorsements_count - a.endorsements_count;
        const scoreA = (a.endorsements_count || 0) + (Date.now() - new Date(a.created_at).getTime()) / 86400000;
        const scoreB = (b.endorsements_count || 0) + (Date.now() - new Date(b.created_at).getTime()) / 86400000;
        return scoreB - scoreA;
    });

    const totalEndorsements = suggestions.reduce((sum, s) => sum + (s.endorsements_count || 0), 0);

    const handleExpand = (suggestion: Suggestion) => { setExpandedSuggestion(suggestion); document.body.style.overflow = 'hidden'; };
    const handleCloseExpand = () => { setExpandedSuggestion(null); document.body.style.overflow = 'unset'; };

    if (loading) {
        return (
            <div className="md:rounded-2xl bg-white/70 p-4 md:p-6 md:shadow-sm backdrop-blur dark:bg-slate-800/70">
                <div className="animate-pulse space-y-3 md:space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="h-7 md:h-8 w-40 md:w-48 bg-slate-200 dark:bg-slate-700 rounded" />
                        <div className="h-8 md:h-10 w-28 md:w-32 bg-slate-200 dark:bg-slate-700 rounded" />
                    </div>
                    <div className="grid gap-3 md:gap-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex items-start gap-3 md:gap-4">
                                <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-slate-200 dark:bg-slate-700" />
                                <div className="flex-1 space-y-1.5 md:space-y-2">
                                    <div className="h-3.5 md:h-4 w-3/4 bg-slate-200 dark:bg-slate-700 rounded" />
                                    <div className="h-2.5 md:h-3 w-1/2 bg-slate-200 dark:bg-slate-700 rounded" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="md:rounded-2xl bg-white/70 p-4 md:p-6 md:shadow-xl backdrop-blur-xl dark:bg-muted/30 border-b border-slate-100 dark:border-slate-800 md:border-b-0">
                {/* Header */}
                <div className="mb-4 md:mb-6 flex flex-wrap items-center justify-between gap-3 md:gap-4">
                    <div>
                        <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-1.5 md:gap-2">
                            💡 {SUGGESTION_LABEL_PLURAL}
                            <span className="text-sm font-normal text-slate-400">({suggestions.length})</span>
                        </h3>
                        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
                            {SUGGESTION_ACTION} new {SUGGESTION_LABEL_PLURAL.toLowerCase()} or endorse what you need
                        </p>
                    </div>
                    <div className="flex items-center gap-2 md:gap-3">
                        <div className="flex items-center gap-1.5 md:gap-2 rounded-full bg-emerald-50 px-2 md:px-3 py-1 md:py-1.5 dark:bg-emerald-400/10">
                            <TrendingUp className="h-3.5 w-3.5 md:h-4 md:w-4 text-emerald-600 dark:text-emerald-400" />
                            <span className="text-xs md:text-sm font-bold text-emerald-700 dark:text-emerald-300">{totalEndorsements}</span>
                        </div>
                        <button
                            onClick={() => setShowForm(!showForm)}
                            className="inline-flex items-center gap-1.5 md:gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 md:px-5 py-2 md:py-2.5 text-xs md:text-sm font-bold text-white shadow-lg shadow-emerald-500/30 transition hover:scale-105 active:scale-95"
                        >
                            {showForm ? <X className="h-3.5 w-3.5 md:h-4 md:w-4" /> : <Plus className="h-3.5 w-3.5 md:h-4 md:w-4" />}
                            {showForm ? 'Cancel' : `${SUGGESTION_ACTION}`}
                        </button>
                    </div>
                </div>

                {/* Success/Error */}
                {success && (
                    <div className="mb-3 md:mb-4 rounded-lg md:rounded-xl bg-emerald-50 p-2.5 md:p-3 text-xs md:text-sm font-semibold text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400 flex items-center gap-1.5 md:gap-2">
                        <CheckCircle className="h-4 w-4 md:h-5 md:w-5" />{success}
                    </div>
                )}
                {error && (
                    <div className="mb-3 md:mb-4 rounded-lg md:rounded-xl bg-rose-50 p-2.5 md:p-3 text-xs md:text-sm font-semibold text-rose-700 dark:bg-rose-400/10 dark:text-rose-400 flex items-center gap-1.5 md:gap-2">
                        <AlertCircle className="h-4 w-4 md:h-5 md:w-5" />{error}
                    </div>
                )}

                {/* Form */}
                {showForm && (
                    <div ref={formRef} className="mb-4 md:mb-6 rounded-lg md:rounded-xl bg-gradient-to-br from-emerald-50/50 to-white p-4 md:p-5 shadow-lg dark:from-emerald-500/10 dark:to-slate-800/50 border border-emerald-200 dark:border-emerald-500/20">
                        <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
                            <div className="grid gap-3 md:gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-xs md:text-sm font-semibold text-slate-700 dark:text-slate-300">Name *</label>
                                    <input type="text" value={newSuggestion.unit_name} onChange={(e) => setNewSuggestion(prev => ({ ...prev, unit_name: e.target.value }))} className="w-full rounded-lg md:rounded-xl border border-slate-200 bg-white/80 px-3 md:px-4 py-2 md:py-2.5 text-xs md:text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900/80 dark:text-white" placeholder={`e.g., Advanced ${SUGGESTION_LABEL}`} autoFocus autoComplete="off" />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs md:text-sm font-semibold text-slate-700 dark:text-slate-300">Code (optional)</label>
                                    <input type="text" value={newSuggestion.unit_code} onChange={(e) => setNewSuggestion(prev => ({ ...prev, unit_code: e.target.value }))} className="w-full rounded-lg md:rounded-xl border border-slate-200 bg-white/80 px-3 md:px-4 py-2 md:py-2.5 text-xs md:text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900/80 dark:text-white" placeholder="e.g., NUR-401" autoComplete="off" />
                                </div>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs md:text-sm font-semibold text-slate-700 dark:text-slate-300">Description</label>
                                <textarea value={newSuggestion.description} onChange={(e) => setNewSuggestion(prev => ({ ...prev, description: e.target.value }))} className="w-full rounded-lg md:rounded-xl border border-slate-200 bg-white/80 px-3 md:px-4 py-2 md:py-2.5 text-xs md:text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900/80 dark:text-white resize-none" rows={3} placeholder={`Describe what this covers...`} style={{ WebkitAppearance: 'none' }} />
                            </div>
                            <div className="grid gap-3 md:gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-xs md:text-sm font-semibold text-slate-700 dark:text-slate-300">Priority</label>
                                    <Select value={newSuggestion.priority} onValueChange={(value) => setNewSuggestion(prev => ({ ...prev, priority: value }))}>
                                        <SelectTrigger className="w-full rounded-lg md:rounded-xl border border-slate-200 bg-white/80 px-3 md:px-4 py-2 md:py-2.5 text-xs md:text-sm text-slate-900 focus:border-emerald-400 dark:border-slate-700 dark:bg-slate-900/80 dark:text-white">
                                            <SelectValue placeholder="Select priority" />
                                        </SelectTrigger>
                                        <SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="urgent">Urgent 🔥</SelectItem></SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs md:text-sm font-semibold text-slate-700 dark:text-slate-300">Category</label>
                                    <Select value={newSuggestion.category} onValueChange={(value) => setNewSuggestion(prev => ({ ...prev, category: value }))}>
                                        <SelectTrigger className="w-full rounded-lg md:rounded-xl border border-slate-200 bg-white/80 px-3 md:px-4 py-2 md:py-2.5 text-xs md:text-sm text-slate-900 focus:border-emerald-400 dark:border-slate-700 dark:bg-slate-900/80 dark:text-white">
                                            <SelectValue placeholder="Select category" />
                                        </SelectTrigger>
                                        <SelectContent><SelectItem value="general">General</SelectItem><SelectItem value="theory">Theory</SelectItem><SelectItem value="practicum">Practicum</SelectItem><SelectItem value="clinical">Clinical</SelectItem><SelectItem value="visit">Visit</SelectItem></SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <button type="submit" className="w-full rounded-lg md:rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 md:px-6 py-2.5 md:py-3 text-xs md:text-sm font-bold text-white shadow-lg shadow-emerald-500/30 transition hover:scale-105 active:scale-95 flex items-center justify-center gap-1.5 md:gap-2">
                                <Send className="h-3.5 w-3.5 md:h-4 md:w-4" />{SUGGESTION_ACTION}
                            </button>
                        </form>
                    </div>
                )}

                {/* Filters */}
                <div className="mb-3 md:mb-4 flex flex-wrap gap-1.5 md:gap-2">
                    <Select value={filter.priority} onValueChange={(value) => setFilter(prev => ({ ...prev, priority: value }))}>
                        <SelectTrigger className="rounded-full border border-slate-200 bg-white/80 px-2.5 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs font-medium text-slate-600 focus:border-emerald-400 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300 w-auto min-w-[100px] md:min-w-[120px]">
                            <SelectValue placeholder="All Priorities" />
                        </SelectTrigger>
                        <SelectContent><SelectItem value="all">All Priorities</SelectItem><SelectItem value="urgent">🔴 Urgent</SelectItem><SelectItem value="high">🟠 High</SelectItem><SelectItem value="medium">🟡 Medium</SelectItem><SelectItem value="low">⚪ Low</SelectItem></SelectContent>
                    </Select>
                    <Select value={filter.category} onValueChange={(value) => setFilter(prev => ({ ...prev, category: value }))}>
                        <SelectTrigger className="rounded-full border border-slate-200 bg-white/80 px-2.5 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs font-medium text-slate-600 focus:border-emerald-400 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300 w-auto min-w-[100px] md:min-w-[120px]">
                            <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent><SelectItem value="all">All Categories</SelectItem><SelectItem value="theory">📚 Theory</SelectItem><SelectItem value="practicum">🔬 Practicum</SelectItem><SelectItem value="clinical">🏥 Clinical</SelectItem><SelectItem value="visit">📍 Visit</SelectItem></SelectContent>
                    </Select>
                    <Select value={filter.sortBy} onValueChange={(value) => setFilter(prev => ({ ...prev, sortBy: value as any }))}>
                        <SelectTrigger className="rounded-full border border-slate-200 bg-white/80 px-2.5 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs font-medium text-slate-600 focus:border-emerald-400 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300 w-auto min-w-[90px] md:min-w-[120px]">
                            <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent><SelectItem value="newest">Newest</SelectItem><SelectItem value="popular">Most Endorsed</SelectItem><SelectItem value="trending">🔥 Trending</SelectItem></SelectContent>
                    </Select>
                    <button onClick={() => setFilter({ priority: 'all', category: 'all', status: 'all', sortBy: 'newest' })} className="rounded-full border border-slate-200 bg-white/80 px-2.5 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300">
                        Clear
                    </button>
                </div>

                {/* Suggestion List */}
                <div ref={listRef} className="max-h-[400px] md:max-h-[500px] overflow-y-auto pr-1 md:pr-2 space-y-2 md:space-y-3 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent" style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}>
                    {sortedSuggestions.length === 0 ? (
                        <div className="rounded-lg md:rounded-xl bg-slate-50 p-6 md:p-8 text-center dark:bg-slate-900/50">
                            <Sparkles className="mx-auto mb-2 md:mb-3 h-10 w-10 md:h-12 md:w-12 text-slate-300 dark:text-slate-600" />
                            <p className="text-base md:text-lg font-semibold text-slate-600 dark:text-slate-300">No {SUGGESTION_LABEL_PLURAL.toLowerCase()} yet</p>
                            <p className="text-xs md:text-sm text-slate-400 dark:text-slate-500">Be the first to {SUGGESTION_ACTION.toLowerCase()}!</p>
                        </div>
                    ) : (
                        sortedSuggestions.map((suggestion) => {
                            const PriorityIcon = priorityConfig[suggestion.priority as keyof typeof priorityConfig]?.icon || Clock;
                            const priorityInfo = priorityConfig[suggestion.priority as keyof typeof priorityConfig] || priorityConfig.medium;
                            const categoryInfo = categoryConfig[suggestion.category as keyof typeof categoryConfig] || categoryConfig.general;
                            const statusInfo = statusConfig[suggestion.status as keyof typeof statusConfig] || statusConfig.pending;
                            const CategoryIcon = categoryInfo.icon;
                            return (
                                <div key={suggestion.id} className="group cursor-pointer rounded-lg md:rounded-xl bg-white p-3 md:p-4 shadow-sm transition-all hover:shadow-md md:hover:scale-[1.01] dark:bg-muted/70 dark:hover:bg-slate-900 border-0 border-b border-slate-100 dark:border-slate-800 md:border-b-0" onClick={() => handleExpand(suggestion)}>
                                    <div className="flex flex-col gap-2 md:gap-3 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start gap-2 md:gap-3">
                                                <div className="relative shrink-0">
                                                    {suggestion.user?.avatar_url ? (
                                                        <img src={suggestion.user.avatar_url} alt="" className="h-8 w-8 md:h-10 md:w-10 rounded-full object-cover" />
                                                    ) : (
                                                        <div className={`flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full text-xs md:text-sm font-bold text-white ${getAvatarColor(suggestion.user_id)}`}>{getInitials(suggestion.user?.full_name)}</div>
                                                    )}
                                                    {suggestion.user_endorsed && (
                                                        <div className="absolute -bottom-1 -right-1 rounded-full bg-emerald-500 p-0.5"><CheckCircle className="h-2.5 w-2.5 md:h-3 md:w-3 text-white" /></div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
                                                        <h4 className="text-sm md:text-base font-bold text-slate-900 dark:text-white">{suggestion.unit_name}</h4>
                                                        {suggestion.unit_code && (
                                                            <span className="rounded-full bg-slate-100 px-1.5 md:px-2 py-0.5 text-[10px] md:text-xs font-mono font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">{suggestion.unit_code}</span>
                                                        )}
                                                    </div>
                                                    <div className="mt-0.5 md:mt-1 flex flex-wrap items-center gap-1.5 md:gap-2 text-[10px] md:text-xs">
                                                        <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400"><User className="h-2.5 w-2.5 md:h-3 md:w-3" />{suggestion.user?.full_name || 'Anonymous'}</span>
                                                        <span className="text-slate-300">•</span>
                                                        <span className="flex items-center gap-1 text-slate-400"><Calendar className="h-2.5 w-2.5 md:h-3 md:w-3" />{new Date(suggestion.created_at).toLocaleDateString()}</span>
                                                        <span className="text-slate-300">•</span>
                                                        <span className={`flex items-center gap-1 ${statusInfo.color}`}>{statusInfo.icon && <statusInfo.icon className="h-2.5 w-2.5 md:h-3 md:w-3" />}{statusInfo.label}</span>
                                                    </div>
                                                    {suggestion.description && (
                                                        <p className="mt-0.5 md:mt-1 line-clamp-2 text-xs md:text-sm text-slate-600 dark:text-slate-400">{suggestion.description}</p>
                                                    )}
                                                    <div className="mt-1.5 md:mt-2 flex flex-wrap gap-1.5 md:gap-2">
                                                        <span className={`inline-flex items-center gap-1 rounded-full px-1.5 md:px-2 py-0.5 text-[10px] md:text-xs font-medium ${priorityInfo.bg} ${priorityInfo.color}`}><PriorityIcon className="h-2.5 w-2.5 md:h-3 md:w-3" />{priorityInfo.label}</span>
                                                        <span className={`inline-flex items-center gap-1 rounded-full bg-slate-100 px-1.5 md:px-2 py-0.5 text-[10px] md:text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400`}><CategoryIcon className="h-2.5 w-2.5 md:h-3 md:w-3" />{categoryInfo.label}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 md:gap-2 self-start sm:self-center ml-10 md:ml-0">
                                            <button onClick={(e) => { e.stopPropagation(); handleEndorse(suggestion.id); }} className={`flex items-center gap-1 rounded-full px-2.5 md:px-3 py-1 md:py-1.5 text-xs md:text-sm font-bold transition-all ${suggestion.user_endorsed ? 'bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-lg shadow-rose-500/30 scale-105' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}`}>
                                                <Heart className={`h-3.5 w-3.5 md:h-4 md:w-4 ${suggestion.user_endorsed ? 'fill-white' : ''}`} />{suggestion.endorsements_count || 0}
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); handleExpand(suggestion); }} className="rounded-full p-1 md:p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"><Maximize2 className="h-3.5 w-3.5 md:h-4 md:w-4" /></button>
                                            {user && suggestion.user_id === user.id && (
                                                <button onClick={(e) => { e.stopPropagation(); handleDelete(suggestion.id); }} className="rounded-full p-1 md:p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-400/10 opacity-0 group-hover:opacity-100"><Trash2 className="h-3.5 w-3.5 md:h-4 md:w-4" /></button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {sortedSuggestions.length > 0 && (
                    <div className="mt-3 md:mt-4 text-center text-[10px] md:text-xs text-slate-400 dark:text-slate-500">
                        Showing {sortedSuggestions.length} of {suggestions.length} {filter.priority !== 'all' || filter.category !== 'all' ? ' (filtered)' : ''}
                    </div>
                )}
            </div>

            {expandedSuggestion && (
                <FullScreenSuggestionCard suggestion={expandedSuggestion} onClose={handleCloseExpand} onEndorse={handleEndorse} onDelete={handleDelete} user={user} />
            )}
        </>
    );
}