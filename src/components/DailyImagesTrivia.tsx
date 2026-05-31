"use client";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react"; // ✅ add
import { ChevronLeft, ChevronRight, Maximize, Eye, X, Sparkles, ChevronDown, Maximize2, Users, ArrowRight } from "lucide-react";
import { GlobalLoader } from "@/components/GlobalLoader";
import { motion, AnimatePresence } from "framer-motion";
import { UserProfileModal } from "@/components/UserProfileModal";
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
    comment?: string;
    comments?: string[];
};
export default function DailyImagesTrivia() {
    const session = useSession();                // ✅ get session
    const supabaseClient = useSupabaseClient();  // optional
    const user = session?.user || null;          // current user
    const [images, setImages] = useState<ImageItem[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const [activeImage, setActiveImage] = useState<string | null>(null);
    const [dataLoading, setDataLoading] = useState(true);
    const [uiLoading, setUiLoading] = useState(true);
    const [isCollapsed, setIsCollapsed] = useState(false); // Start fully open
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [showComments, setShowComments] = useState(false);
    const [seenData, setSeenData] = useState<{ [key: string]: string }>({});
    const [isLargeScreen, setIsLargeScreen] = useState(false);
    const [topUsers, setTopUsers] = useState<SeenUser[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);
    const autoplayRef = useRef<NodeJS.Timeout | null>(null);
    const AUTOPLAY_DELAY = 100000;
    const todayKey = new Date().toLocaleDateString("en-CA");
    const localImagesKey = `dailyImages_${todayKey}`;
    const inactivityTimer = useRef<NodeJS.Timeout | null>(null);
    const INACTIVITY_DELAY = 10000; // 10 seconds
    const localLoaderKey = `dailyLoader_${todayKey}`;
    // Add this inside your component
    const openFullscreen = (url: string) => {
        setActiveImage(url); // ✅ This triggers the fullscreen overlay
    };
    const vibrateSafe = (duration: number = 100) => {
        // Check if vibration API is supported
        if (typeof navigator !== "undefined" && navigator.vibrate) {
            // Only vibrate on user gesture (click/tap)
            navigator.vibrate(duration);
        }
    };
    const resetInactivityTimer = () => {
        // Clear existing timer
        if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };

    useEffect(() => {
        const container = containerRef.current;
        if (!container || !isLargeScreen) return;

        const activityEvents = ["mousemove", "mousedown", "keydown", "touchstart"];
        activityEvents.forEach(evt => container.addEventListener(evt, resetInactivityTimer));

        // Start timer initially if expanded
        resetInactivityTimer();

        return () => {
            activityEvents.forEach(evt => container.removeEventListener(evt, resetInactivityTimer));
            if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
        };
    }, [isCollapsed, isLargeScreen]);

    useEffect(() => {
        if (showComments) {
            // Lock background scroll
            document.body.style.overflow = "hidden";
        } else {
            // Restore scroll
            document.body.style.overflow = "";
        }

        // Cleanup (safety)
        return () => {
            document.body.style.overflow = "";
        };
    }, [showComments]);

    // Load images (with daily persistence)
    useEffect(() => {
        const loadDailyImages = async () => {
            setDataLoading(true);

            const todayKey = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
            const localImagesKey = `dailyImages_${todayKey}`;

            // 1️⃣ Check localStorage cache first
            const storedImages = localStorage.getItem(localImagesKey);

            if (storedImages) {
                const cachedImages: ImageItem[] = JSON.parse(storedImages);

                if (cachedImages.length > 0 && cachedImages.every(img => img.image_url)) {

                    let filteredImages = cachedImages;

                    if (user) {
                        const { data: seenRows } = await supabase
                            .from("qfeed_seen_comments")
                            .select("image_id")
                            .eq("user_id", user.id)
                            .gte("created_at", `${todayKey}T00:00:00`)
                            .lt("created_at", `${todayKey}T23:59:59`);

                        const seenIds = seenRows?.map(r => r.image_id) || [];
                        filteredImages = cachedImages.filter(img => !seenIds.includes(img.id));

                        if (filteredImages.length === 0) filteredImages = cachedImages;
                    }

                    setImages(filteredImages);
                    setDataLoading(false);
                    return;
                }
            }

            // 3️⃣ Fetch all images from Supabase
            const { data, error } = await supabase
                .from("qfeed_images")
                .select("id, image_url, description");

            if (error) {
                console.error("Failed to load images:", error.message);
                setImages([]);
                setDataLoading(false);
                return;
            }

            if (!data || data.length === 0) {
                setImages([]);
                setDataLoading(false);
                return;
            }

            // 4️⃣ Deterministic shuffle based on today's date
            let seed = 0;
            for (let i = 0; i < todayKey.length; i++) {
                seed = todayKey.charCodeAt(i) + ((seed << 5) - seed);
            }

            let value = Math.abs(seed);
            const random = () => {
                value = (value * 9301 + 49297) % 233280;
                return value / 233280;
            };

            const shuffled = [...data].sort(() => random() - 0.5);

            // 5️⃣ Pick first 3 images
            const dailyImages = shuffled.slice(0, 3);

            // 6️⃣ Save in state and cache
            setImages(dailyImages);
            localStorage.setItem(localImagesKey, JSON.stringify(dailyImages));

            setDataLoading(false);
        };

        loadDailyImages();
    }, []);


    useEffect(() => {
        const alreadyLoaded = localStorage.getItem(localLoaderKey);
        if (!alreadyLoaded) {
            setUiLoading(true);
            localStorage.setItem(localLoaderKey, "true");
            setTimeout(() => setUiLoading(false), 1000);
        } else {
            setUiLoading(false);
        }
    }, []);

    // Autoplay
    useEffect(() => {
        if (images.length === 0) return;
        autoplayRef.current = setInterval(() => {
            setActiveIndex((i) => (i === images.length - 1 ? 0 : i + 1));
        }, AUTOPLAY_DELAY);
        return () => {
            if (autoplayRef.current) clearInterval(autoplayRef.current);
        };
    }, [images]);

    // Swipe & mouse drag was here
    const prev = () => setActiveIndex((i) => (i === 0 ? images.length - 1 : i - 1));
    const next = () => setActiveIndex((i) => (i === images.length - 1 ? 0 : i + 1));

    useEffect(() => {
        setIsLargeScreen(window.innerWidth >= 1024);
    }, []);

    // ✅ Load Top 10 students directly from DB view
    useEffect(() => {
        const loadTopUsers = async () => {
            try {
                const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

                // Fetch today's seen comments with correct relationship
                const { data, error } = await supabase
                    .from('qfeed_seen_comments')
                    .select(`
    user_id,
    comment,
     image_id,
    created_at,
    fk_qfeed_seen_comments_user!inner(name, avatar_url, institution)
  `)

                    .gte('created_at', `${today}T00:00:00`)
                    .lt('created_at', `${today}T23:59:59`);

                if (error) throw error;

                if (!data || data.length === 0) {
                    setTopUsers([]);
                    return;
                }

                // Group by user_id
                const userMap: { [key: string]: { rows: any[], firstCompleted: string } } = {};
                data.forEach((row: any) => {
                    if (!userMap[row.user_id]) {
                        userMap[row.user_id] = { rows: [], firstCompleted: row.created_at };
                    }
                    userMap[row.user_id].rows.push(row);
                });

                // Only include users who have seen all 3 UNIQUE images
                const completedUsers = Object.values(userMap)
                    .filter(u => new Set(u.rows.map(r => r.image_id)).size >= 3)
                    .sort(
                        (a, b) => new Date(a.firstCompleted).getTime() - new Date(b.firstCompleted).getTime()
                    );

                const topUsersList: SeenUser[] = completedUsers.slice(0, 10).map(u => ({
                    id: u.rows[0].user_id,
                    name: u.rows[0].fk_qfeed_seen_comments_user.name,
                    avatar_url: u.rows[0].fk_qfeed_seen_comments_user.avatar_url,
                    institution: u.rows[0].fk_qfeed_seen_comments_user.institution,
                    comments: u.rows.map(row => row.comment) || [],
                    comment: "Completed all 3 images today 🎉",
                }));


                setTopUsers(topUsersList);

            } catch (err) {
                console.error("Error loading top students:", err);
                setTopUsers([]);
            }
        };

        loadTopUsers();

        // Real-time subscription
        const subscription = supabase
            .channel("top-students-channel")
            .on("postgres_changes", {
                event: "INSERT",
                schema: "public",
                table: "qfeed_seen_comments",
            }, async (payload) => {
                const createdAt = new Date(payload.new.created_at).toISOString().slice(0, 10);
                const today = new Date().toISOString().slice(0, 10);
                if (createdAt === today) await loadTopUsers();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, []);


    // Load seen data for the current user from Supabase
    useEffect(() => {
        if (!user) return;
        const loadSeenData = async () => {
            if (!user || images.length === 0) return;

            try {
                // Get all seen comments by this user for today's images
                const imageIds = images.map(img => img.id);
                const today = new Date().toISOString().slice(0, 10);

                const { data, error } = await supabase
                    .from("qfeed_seen_comments")
                    .select("image_id, comment")
                    .eq("user_id", user.id)
                    .in("image_id", imageIds)
                    .gte("created_at", `${today}T00:00:00`)
                    .lt("created_at", `${today}T23:59:59`);

                if (error) throw error;

                // Transform into { image_id: comment } object
                const seenMap: { [key: string]: string } = {};
                data?.forEach((row: any) => {
                    seenMap[row.image_id] = row.comment;
                });

                setSeenData(seenMap);
            } catch (err) {
                console.error("Error loading seen data:", err);
            }
        };

        loadSeenData();
    }, [images, user]);


    // Mark Seen + Save Comment
    const markSeen = async (comment: string) => {
        if (!images[activeIndex]) return;
        const image_id = images[activeIndex].id;
        if (!user) {
            alert("You must be logged in.");
            return;
        }

        try {
            // 1️⃣ Insert seen comment
            await supabase.from("qfeed_seen_comments").insert({
                image_id,
                user_id: user.id,
                comment,
            });

            // 2️⃣ Update local state immediately
            setSeenData(prev => ({ ...prev, [image_id]: comment }));

            // 3️⃣ Check if user has now seen all 3 images today
            const today = new Date().toISOString().slice(0, 10);
            const imageIds = images.map(img => img.id);

            const { data: seenRows, error } = await supabase
                .from("qfeed_seen_comments")
                .select("image_id")
                .eq("user_id", user.id)
                .in("image_id", imageIds)
                .gte("created_at", `${today}T00:00:00`)
                .lt("created_at", `${today}T23:59:59`);

            if (error) throw error;

            // 4️⃣ If user has seen all 3 images, refresh top user list
            // 4️⃣ If user has seen all 3 images, refresh top user list
            if (seenRows && seenRows.length >= 3) {
                // Trigger reloading of topUsers useEffect
                const loadTopUsers = async () => {
                    const today = new Date().toISOString().slice(0, 10);

                    const { data, error } = await supabase
                        .from('qfeed_seen_comments')
                        .select(`
                user_id,

                comment,
                created_at,
                profiles!inner(name, avatar_url, institution)
            `)
                        .gte('created_at', `${today}T00:00:00`)
                        .lt('created_at', `${today}T23:59:59`);

                    if (error) {
                        console.error("Failed to load top students:", error.message);
                        setTopUsers([]);
                        return;
                    }

                    if (!data || data.length === 0) {
                        setTopUsers([]);
                        return;
                    }

                    // Group rows by user_id
                    const userMap: { [key: string]: { rows: any[], firstCompleted: string } } = {};
                    data.forEach((row: any) => {
                        if (!userMap[row.user_id]) {
                            userMap[row.user_id] = { rows: [], firstCompleted: row.created_at };
                        }
                        userMap[row.user_id].rows.push(row);
                    });

                    // Only include users who completed all 3 images
                    const completedUsers = Object.values(userMap)
                        .filter(u => u.rows.length >= 3)
                        .sort(
                            (a, b) => new Date(a.firstCompleted).getTime() - new Date(b.firstCompleted).getTime()
                        );

                    // Map to SeenUser format, max 10 users
                    const topUsersList: SeenUser[] = completedUsers.slice(0, 10).map(u => ({
                        id: u.rows[0].user_id,
                        name: u.rows[0].profiles.name,
                        avatar_url: u.rows[0].profiles.avatar_url,
                        institution: u.rows[0].profiles.institution,
                        comments: u.rows.map(row => row.comment) || [],
                        comment: "Completed all 3 images today 🎉",
                    }));

                    setTopUsers(topUsersList);
                };

                await loadTopUsers();
            }

        } catch (err) {
            console.error(err);
        }
    };



    return (
        <>
            {/* --- VISUAL TRIVIA SECTION --- */}
            <div className="w-full max-w-5xl rounded-xl mx-auto mt-3 px-2">
                {/* Card Header - Interactive Toggle */}
                <div
                    className="group relative overflow-hidden bg-white dark:bg-muted/30 rounded-xl p-6 shadow-xl border-0 cursor-pointer transition-all hover:shadow-2xl"
                    onClick={() => { if (isLargeScreen) setIsCollapsed(!isCollapsed); }}
                >
                    {/* Animated Background Accent */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-16 -mt-16 blur-3xl transition-colors group-hover:bg-indigo-500/10" />

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-indigo-500/10 rounded-2xl">
                                <Sparkles className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase tracking-[3px] font-bold text-indigo-600 dark:text-indigo-500">Daily Insight</p>
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Visual Trivia</h2>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 hidden md:block italic">
                                Tap images to reveal high-resolution concepts.
                            </p>
                            {isLargeScreen && (
                                <div className="p-2 rounded-full bg-slate-100 dark:bg-white/5 text-slate-400">
                                    <ChevronDown className={`w-5 h-5 transition-transform duration-500 ${isCollapsed ? "" : "rotate-180"}`} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Collapsible Card Body */}
                <AnimatePresence>
                    {(!isLargeScreen || !isCollapsed) && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="mt-1 bg-slate-50/50 dark:bg-muted/30 backdrop-blur-xl border-0 rounded-xl p-4 sm:p-8">

                                {/* 1. STORY NAVIGATION (The Top Circles) */}
                                <div className="flex gap-2 overflow-x-auto pb-6 px-2 no-scrollbar snap-x">
                                    {images.map((img, idx) => {
                                        const isSeen = seenData[img.id];
                                        return (
                                            <div
                                                key={img.id}
                                                className="flex-shrink-0 flex flex-col items-center gap-2 snap-center"
                                                onClick={async () => {
                                                    setActiveIndex(idx);
                                                    // Logic preserved: mark as seen
                                                    if (!isSeen && user) {
                                                        vibrateSafe(50);
                                                        try {
                                                            await supabase.from("qfeed_seen_comments").insert({
                                                                image_id: img.id, user_id: user.id, comment: "Seen",
                                                            });
                                                            setSeenData(prev => ({ ...prev, [img.id]: true }));
                                                        } catch (err) { console.error(err); }
                                                    }
                                                }}
                                            >
                                                <div className={`relative p-1 rounded-full transition-all duration-500 ${activeIndex === idx ? "scale-110" : "scale-100 hover:scale-105"}`}>
                                                    {/* Outer Ring: Glowing if Unseen, Muted if Seen */}
                                                    <div className={`absolute inset-0 rounded-full animate-pulse-slow ${!isSeen ? "bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-[2px]" : "bg-slate-300 dark:bg-slate-700 p-[1px]"}`} />

                                                    <div className="relative p-1 bg-white dark:bg-muted/30 rounded-full">
                                                        <img
                                                            src={img.image_url}
                                                            alt=""
                                                            className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover shadow-lg ${activeIndex === idx ? "grayscale-0" : "grayscale-[50%]"}`}
                                                        />
                                                    </div>
                                                </div>
                                                <span className={`text-[9px] font-bold uppercase tracking-widest ${activeIndex === idx ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"}`}>
                                                    Visual {idx + 1}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* 2. THE MAIN STAGE (Insta-style Full View) */}
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-1 mt-4">
                                    <div className="lg:col-span-8 group relative">
                                        <div
                                            className="relative aspect-video sm:aspect-square md:aspect-video rounded-xl overflow-hidden border-0 bg-slate-200 dark:bg-slate-800 shadow-2xl cursor-zoom-in"
                                            onClick={() => openFullscreen(images[activeIndex].image_url)}
                                        >
                                            <img
                                                src={images[activeIndex]?.image_url}
                                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                                alt="Visual Trivia Content"
                                            />

                                            {/* Overlay Controls */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-8">
                                                <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">
                                                    <Maximize2 className="w-4 h-4 text-white" />
                                                    <span className="text-white text-xs font-bold uppercase tracking-widest">Expand Visual</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 3. THE INTERACTION FEED (Top Students) */}
                                    <div className="lg:col-span-4 flex flex-col h-full">
                                        <div className="flex-1 bg-white dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-white/10 p-6 shadow-xl">
                                            <div className="flex items-center gap-2 mb-6">
                                                <Users className="w-4 h-4 text-indigo-500" />
                                                <h3 className="font-bold text-xs uppercase tracking-[2px] text-slate-900 dark:text-white">Active Learners</h3>
                                            </div>

                                            <div className="space-y-4 max-h-[300px] lg:max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                                {topUsers.length === 0 ? (
                                                    <p className="text-xs font-medium text-slate-400 italic py-4">No activity recorded for this visual yet.</p>
                                                ) : (
                                                    topUsers.map((u, index) => (
                                                        <div
                                                            key={u.id}
                                                            className="flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-all cursor-pointer border border-transparent hover:border-slate-100 dark:hover:border-white/5 group"
                                                            onClick={() => setSelectedUserId(u.id)}
                                                        >
                                                            <div className="relative">
                                                                <img
                                                                    src={u.avatar_url || "/UsersAvatar.jpg"}
                                                                    alt={u.name}
                                                                    className="w-10 h-10 rounded-full object-cover ring-2 ring-transparent group-hover:ring-indigo-500 transition-all"
                                                                />
                                                                <div className="absolute -top-1 -left-1 w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-lg">
                                                                    {index + 1}
                                                                </div>
                                                            </div>
                                                            <div className="flex-1 overflow-hidden">
                                                                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{u.name}</p>
                                                                <p className="text-[10px] text-slate-500 font-medium truncate uppercase tracking-tighter">
                                                                    {u.institution || "Student"}
                                                                </p>
                                                            </div>
                                                            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:translate-x-1 transition-transform" />
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Fullscreen View - Preserved with Upgraded Styling */}
                <AnimatePresence>
                    {activeImage && (
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[9999] bg-slate-950/95 flex items-center justify-center p-4 backdrop-blur-2xl"
                            onClick={() => setActiveImage(null)}
                        >
                            <button className="absolute top-10 right-10 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-xl transition-all active:scale-95">
                                <X className="w-8 h-8" />
                            </button>
                            <motion.img
                                initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                                src={activeImage}
                                className="max-w-full max-h-[85vh] rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10"
                                onClick={(e) => e.stopPropagation()}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                {selectedUserId && (
                    <UserProfileModal userId={selectedUserId} onClose={() => setSelectedUserId(null)} />
                )}
            </div>
        </>
    );

}