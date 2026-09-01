"use client";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useSession } from "@supabase/auth-helpers-react";
import { Sparkles, Users, CheckCircle2, Trophy, Eye, Calendar, Star, X, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { UserProfileModal } from "@/components/UserProfileModal";

// --- Types ---
type ImageItem = {
    id: string;
    image_url: string;
    description?: string | null;
};

type SeenUser = {
    id: string;
    avatar_url?: string | null;
    name: string;
    institution?: string | null;
};

// --- Sound Effects Utility ---
const SoundEffects = {
    playCompleteSound: () => {
        try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
            oscillator.type = 'sine';
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.15);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.15);

            setTimeout(() => {
                const osc2 = audioContext.createOscillator();
                const gain2 = audioContext.createGain();
                osc2.connect(gain2);
                gain2.connect(audioContext.destination);
                osc2.frequency.setValueAtTime(1108.73, audioContext.currentTime);
                osc2.type = 'sine';
                gain2.gain.setValueAtTime(0.15, audioContext.currentTime);
                gain2.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
                osc2.start(audioContext.currentTime + 0.05);
                osc2.stop(audioContext.currentTime + 0.15);
            }, 50);
        } catch (e) {
            console.log('Audio not supported');
        }
    },

    playVictorySound: () => {
        try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const notes = [523.25, 659.25, 783.99, 1046.50];
            const durations = [0.15, 0.15, 0.15, 0.25];

            notes.forEach((freq, index) => {
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                const startTime = audioContext.currentTime + (index * 0.12);
                oscillator.frequency.setValueAtTime(freq, startTime);
                oscillator.type = 'sine';
                gainNode.gain.setValueAtTime(0.2, startTime);
                gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + durations[index]);
                oscillator.start(startTime);
                oscillator.stop(startTime + durations[index]);
            });

            setTimeout(() => {
                const chordNotes = [523.25, 659.25, 783.99, 1046.50];
                chordNotes.forEach((freq) => {
                    const osc = audioContext.createOscillator();
                    const gain = audioContext.createGain();
                    osc.connect(gain);
                    gain.connect(audioContext.destination);
                    const startTime = audioContext.currentTime + 0.5;
                    osc.frequency.setValueAtTime(freq, startTime);
                    osc.type = 'sine';
                    gain.gain.setValueAtTime(0.1, startTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);
                    osc.start(startTime);
                    osc.stop(startTime + 0.3);
                });
            }, 400);
        } catch (e) {
            console.log('Audio not supported');
        }
    }
};

// --- Skeleton Loader Component ---
const SkeletonLoader = () => {
    return (
        <div className="w-full max-w-full mx-auto mt-3 px-2 sm:px-4 md:px-4 lg:px-6 dark:bg-muted/50 rounded-2xl py-4 pb-24">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-slate-100 dark:bg-slate-800/50 rounded-2xl aspect-[4/3] animate-pulse" />
                ))}
            </div>
        </div>
    );
};

// Confetti Party Popper Component
const ConfettiPartyPopper = ({ onComplete }: { onComplete: () => void }) => {
    useEffect(() => {
        const createConfetti = () => {
            const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ff8800', '#ff0088'];
            const confettiCount = 150;

            for (let i = 0; i < confettiCount; i++) {
                const confetti = document.createElement('div');
                confetti.className = 'confetti-piece';
                confetti.style.left = Math.random() * 100 + '%';
                confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
                confetti.style.width = Math.random() * 8 + 4 + 'px';
                confetti.style.height = Math.random() * 8 + 4 + 'px';
                confetti.style.position = 'fixed';
                confetti.style.top = '-10px';
                confetti.style.zIndex = '10000';
                confetti.style.pointerEvents = 'none';
                confetti.style.animation = `confettiFall ${Math.random() * 2 + 2}s linear forwards`;
                confetti.style.transform = `rotate(${Math.random() * 360}deg)`;

                document.body.appendChild(confetti);

                setTimeout(() => {
                    confetti.remove();
                }, 3000);
            }
        };

        createConfetti();

        if (!document.querySelector('#confetti-style')) {
            const style = document.createElement('style');
            style.id = 'confetti-style';
            style.textContent = `
                @keyframes confettiFall {
                    0% { transform: translateY(0) rotate(0deg); opacity: 1; }
                    100% { transform: translateY(100vh) rotate(360deg); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }

        const timer = setTimeout(onComplete, 3000);
        return () => clearTimeout(timer);
    }, [onComplete]);

    return null;
};

// Top User Item Component
const TopUserItem = ({ u, index, onSelect }: { u: SeenUser; index: number; onSelect: (userId: string) => void }) => (
    <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05 }}
        className="flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-all cursor-pointer active:scale-98"
        onClick={() => onSelect(u.id)}
        style={{ touchAction: 'manipulation' }}
    >
        <div className="relative flex-shrink-0">
            <img
                src={u.avatar_url || "/UsersAvatar.jpg"}
                alt={u.name}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-transparent group-hover:ring-indigo-500 transition-all"
                loading="lazy"
            />
            <div className="absolute -top-1 -left-1 w-5 h-5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-lg">
                {index + 1}
            </div>
        </div>
        <div className="flex-1 overflow-hidden min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{u.name}</p>
            <p className="text-[10px] text-slate-500 font-medium truncate uppercase tracking-tighter">
                {u.institution || "Student"}
            </p>
        </div>
        <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
    </motion.div>
);

// Lightbox Modal Component
const LightboxModal = ({ image, onClose, onNext, onPrev, hasNext, hasPrev }: any) => {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowLeft' && hasPrev) onPrev();
            if (e.key === 'ArrowRight' && hasNext) onNext();
        };
        window.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [onClose, onPrev, onNext, hasPrev, hasNext]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center"
            onClick={onClose}
        >
            <button
                className="absolute top-5 right-5 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all active:scale-95 z-10"
                onClick={onClose}
                style={{ touchAction: 'manipulation' }}
            >
                <X className="w-6 h-6" />
            </button>

            {hasPrev && (
                <button
                    className="absolute left-5 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all active:scale-95"
                    onClick={(e) => { e.stopPropagation(); onPrev(); }}
                    style={{ touchAction: 'manipulation' }}
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
            )}

            {hasNext && (
                <button
                    className="absolute right-5 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all active:scale-95"
                    onClick={(e) => { e.stopPropagation(); onNext(); }}
                    style={{ touchAction: 'manipulation' }}
                >
                    <ChevronRight className="w-6 h-6" />
                </button>
            )}

            <motion.img
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                src={image?.image_url}
                className="w-full h-full object-contain"
                onClick={(e) => e.stopPropagation()}
                loading="lazy"
            />

            {image?.description && (
                <div className="absolute bottom-10 left-0 right-0 text-center">
                    <p className="text-white text-sm bg-black/50 inline-block px-4 py-2 rounded-full backdrop-blur-md">
                        {image.description}
                    </p>
                </div>
            )}
        </motion.div>
    );
};

export default function DailyImagesTrivia() {
    const session = useSession();
    const user = session?.user || null;

    // States
    const [allDailyImages, setAllDailyImages] = useState<ImageItem[]>([]);
    const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [topUsers, setTopUsers] = useState<SeenUser[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [lightboxImage, setLightboxImage] = useState<ImageItem | null>(null);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const [showConfetti, setShowConfetti] = useState(false);
    const [completedImagesSet, setCompletedImagesSet] = useState<Set<string>>(new Set());
    const previousCompletedCount = useRef(0);
    const hasPlayedVictorySound = useRef(false);

    // Stable start of day ISO string for consistent filtering
    const startOfDay = useMemo(() => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        return now.toISOString();
    }, []);

    const todayKey = useMemo(() => new Date().toLocaleDateString("en-CA"), []);

    // 1. Load Everything
    useEffect(() => {
        const loadInitialData = async () => {
            setLoading(true);

            const { data: imgData } = await supabase.rpc('get_daily_trivia', {
                today_key: todayKey
            });

            if (imgData) {
                setAllDailyImages(imgData);
            }

            if (user) {
                const { data: seenData } = await supabase
                    .from("qfeed_seen_comments")
                    .select("image_id")
                    .eq("user_id", user.id)
                    .gte("created_at", startOfDay);

                if (seenData) {
                    const seenSet = new Set(seenData.map(s => s.image_id));
                    setViewedIds(seenSet);
                    setCompletedImagesSet(seenSet);
                    previousCompletedCount.current = seenSet.size;

                    if (seenSet.size === (imgData?.length || 0)) {
                        hasPlayedVictorySound.current = true;
                    }
                }
            }

            await refreshTopUsers();
            setLoading(false);
        };

        loadInitialData();
    }, [user, todayKey, startOfDay]);

    // Check for completion and trigger confetti & victory sound
    useEffect(() => {
        const totalImages = allDailyImages.length;
        const currentCompleted = viewedIds.size;

        if (totalImages > 0 && currentCompleted === totalImages &&
            previousCompletedCount.current !== totalImages &&
            !hasPlayedVictorySound.current) {

            SoundEffects.playVictorySound();
            hasPlayedVictorySound.current = true;
            setShowConfetti(true);
            previousCompletedCount.current = totalImages;
        }
    }, [viewedIds.size, allDailyImages.length]);

    // 2. Refresh Top Users List
    const refreshTopUsers = useCallback(async () => {
        const { data } = await supabase
            .from('qfeed_seen_comments')
            .select(`
                user_id,
                image_id,
                profiles!inner(name, avatar_url, institution)
            `)
            .gte('created_at', startOfDay);

        if (data && data.length > 0) {
            const userCounts = new Map();
            data.forEach((row: any) => {
                const uid = row.user_id;
                if (!userCounts.has(uid)) {
                    userCounts.set(uid, {
                        ...row.profiles,
                        id: uid,
                        images: new Set(),
                        name: row.profiles?.name || "Student",
                        avatar_url: row.profiles?.avatar_url,
                        institution: row.profiles?.institution
                    });
                }
                userCounts.get(uid).images.add(row.image_id);
            });

            const totalImagesCount = allDailyImages.length || 3;
            const finishers = Array.from(userCounts.values())
                .filter(u => u.images.size >= totalImagesCount)
                .map(u => ({
                    id: u.id,
                    name: u.name,
                    avatar_url: u.avatar_url,
                    institution: u.institution
                }))
                .slice(0, 10);

            setTopUsers(finishers);
        } else {
            setTopUsers([]);
        }
    }, [startOfDay, allDailyImages.length]);

    // 3. The "Tap to Complete" Action
    const handleCompleteImage = async (imageId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!user) return;
        if (viewedIds.has(imageId)) return;

        SoundEffects.playCompleteSound();

        setViewedIds(prev => new Set(prev).add(imageId));
        setCompletedImagesSet(prev => new Set(prev).add(imageId));

        const { error } = await supabase.from("qfeed_seen_comments").insert({
            image_id: imageId,
            user_id: user.id,
            comment: "Completed"
        });

        if (error) {
            console.error("Save failed", error);
            setViewedIds(prev => {
                const next = new Set(prev);
                next.delete(imageId);
                return next;
            });
            setCompletedImagesSet(prev => {
                const next = new Set(prev);
                next.delete(imageId);
                return next;
            });
        } else {
            await refreshTopUsers();
        }
    };

    // Handle manual view (tap to expand)
    const handleManualView = (image: ImageItem) => {
        const index = allDailyImages.findIndex(img => img.id === image.id);
        setLightboxIndex(index);
        setLightboxImage(image);
    };

    const handleNextImage = useCallback(() => {
        const nextIndex = (lightboxIndex + 1) % allDailyImages.length;
        setLightboxIndex(nextIndex);
        setLightboxImage(allDailyImages[nextIndex]);
    }, [lightboxIndex, allDailyImages]);

    const handlePrevImage = useCallback(() => {
        const prevIndex = (lightboxIndex - 1 + allDailyImages.length) % allDailyImages.length;
        setLightboxIndex(prevIndex);
        setLightboxImage(allDailyImages[prevIndex]);
    }, [lightboxIndex, allDailyImages]);

    // Calculate remaining images
    const remainingImages = allDailyImages.filter(img => !viewedIds.has(img.id));
    const isDone = allDailyImages.length > 0 && remainingImages.length === 0;
    const totalImages = allDailyImages.length;
    const completedCount = viewedIds.size;

    if (loading) return <SkeletonLoader />;

    return (
        <>
            {showConfetti && (
                <ConfettiPartyPopper onComplete={() => setShowConfetti(false)} />
            )}

            <div className="w-full max-w-full mx-auto mt-3 px-2 sm:px-4 md:px-4 lg:px-6 dark:bg-muted/50 rounded-2xl py-4 pb-24">
                {/* Header Section */}
                <div className="mb-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[3px] text-indigo-600 dark:text-indigo-400">
                                Daily Stories
                            </p>
                            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                                Visual Trivia
                            </h1>
                        </div>
                    </div>
                    <div className="flex items-center justify-between ml-12">
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            Tap to complete your daily set
                        </p>
                        <div className="bg-indigo-50 dark:bg-indigo-950/30 px-3 py-1.5 rounded-full">
                            <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{completedCount}</span>
                            <span className="text-sm text-slate-400">/{totalImages}</span>
                        </div>
                    </div>
                </div>

                {/* ✅ NEW: Desktop-friendly layout - Images in grid, Top Students fixed height on side */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Left Column: Images Grid (3 columns on desktop) */}
                    <div className="lg:col-span-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            <AnimatePresence mode="popLayout">
                                {remainingImages.map((img, idx) => (
                                    <motion.div
                                        key={img.id}
                                        layout
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, x: 100, scale: 0.9 }}
                                        transition={{ duration: 0.25 }}
                                        className="relative group w-full"
                                        style={{ touchAction: 'manipulation' }}
                                    >
                                        <div
                                            className="relative overflow-hidden bg-slate-50 dark:bg-muted/30 flex items-center justify-center rounded-2xl cursor-pointer aspect-[4/3]"
                                            onClick={() => handleManualView(img)}
                                        >
                                            <img
                                                src={img.image_url}
                                                alt="Visual story"
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                loading="lazy"
                                            />

                                            {/* Gradient Overlay */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />

                                            {/* Complete Button Overlay */}
                                            <button
                                                onClick={(e) => handleCompleteImage(img.id, e)}
                                                className="absolute bottom-4 right-4 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-full text-sm font-semibold shadow-lg flex items-center gap-2 active:scale-95 transition-all z-10 min-h-[44px] min-w-[44px]"
                                                style={{ touchAction: 'manipulation' }}
                                            >
                                                <CheckCircle2 className="w-4 h-4" />
                                                Mark Done
                                            </button>

                                            {/* Seen Indicator */}
                                            {completedImagesSet.has(img.id) && (
                                                <div className="absolute top-3 right-3 bg-emerald-500 rounded-full p-1.5 shadow-lg">
                                                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-3 px-1">
                                            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 line-clamp-2">
                                                {img.description || "Visual Story"}
                                            </p>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>

                        {/* Completion Celebration */}
                        {isDone && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 p-8 rounded-3xl text-center mt-6"
                            >
                                <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                                    <Trophy className="w-8 h-8 text-white" />
                                </div>
                                <h2 className="text-xl font-bold text-emerald-800 dark:text-emerald-300">
                                    All Visuals Completed! 🎉
                                </h2>
                                <p className="text-emerald-600 dark:text-emerald-400 text-sm mt-2">
                                    You've finished today's trivia. Your name is now on the leaderboard!
                                </p>
                                <div className="mt-4 flex items-center justify-center gap-2 text-xs text-emerald-500">
                                    <Calendar className="w-3 h-3" />
                                    <span>{todayKey}</span>
                                    <Star className="w-3 h-3 ml-2" />
                                    <span>+{totalImages * 10} XP</span>
                                </div>
                            </motion.div>
                        )}
                    </div>

                    {/* Right Column: Top Students (Fixed height, scrollable) */}
                    <div className="lg:col-span-1">
                        <div className="bg-white dark:bg-slate-900/50 rounded-2xl p-4 h-full max-h-[500px] lg:max-h-[600px] flex flex-col">
                            <div className="flex items-center gap-3 mb-4 flex-shrink-0">
                                <Users className="w-5 h-5 text-indigo-500" />
                                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                                    Top Learners
                                </h2>
                                {topUsers.length > 0 && (
                                    <span className="text-xs text-emerald-500 font-medium ml-auto">{topUsers.length}</span>
                                )}
                            </div>

                            {/* Scrollable list */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-1">
                                {topUsers.length === 0 ? (
                                    <div className="text-center py-8">
                                        <p className="text-xs text-slate-500">
                                            No one has completed all stories yet. Be the first!
                                        </p>
                                    </div>
                                ) : (
                                    topUsers.map((u, index) => (
                                        <TopUserItem
                                            key={u.id}
                                            u={u}
                                            index={index}
                                            onSelect={setSelectedUserId}
                                        />
                                    ))
                                )}
                            </div>

                            {/* Footer count */}
                            {topUsers.length > 0 && (
                                <div className="flex-shrink-0 pt-3 border-t border-slate-100 dark:border-slate-800 mt-2">
                                    <p className="text-[10px] text-slate-400 text-center">
                                        {topUsers.length} {topUsers.length === 1 ? 'person has' : 'people have'} completed today
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Lightbox Modal */}
            <AnimatePresence>
                {lightboxImage && (
                    <LightboxModal
                        image={lightboxImage}
                        onClose={() => setLightboxImage(null)}
                        onNext={handleNextImage}
                        onPrev={handlePrevImage}
                        hasNext={remainingImages.length > 1}
                        hasPrev={remainingImages.length > 1}
                    />
                )}
            </AnimatePresence>

            {/* User Profile Modal */}
            {selectedUserId && (
                <UserProfileModal userId={selectedUserId} onClose={() => setSelectedUserId(null)} />
            )}
        </>
    );
}