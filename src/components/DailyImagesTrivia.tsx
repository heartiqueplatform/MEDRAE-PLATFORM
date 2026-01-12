"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { ChevronLeft, ChevronRight, Maximize, Eye, X } from "lucide-react";
import { GlobalLoader } from "@/components/GlobalLoader";
import { motion, AnimatePresence } from "framer-motion";
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
    comment?: string;          // optional single comment
    comments?: string[];       // optional array of comments
};

export default function DailyImagesTrivia() {
    const [images, setImages] = useState<ImageItem[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const [activeImage, setActiveImage] = useState<string | null>(null);
    const [dataLoading, setDataLoading] = useState(true);
    const [uiLoading, setUiLoading] = useState(true);
    const [isCollapsed, setIsCollapsed] = useState(true); // Desktop collapsed by default

    const [showComments, setShowComments] = useState(false);
    const [seenData, setSeenData] = useState<{ [key: string]: string }>({});
    const [isLargeScreen, setIsLargeScreen] = useState(false);

    const [topUsers, setTopUsers] = useState<SeenUser[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);
    const autoplayRef = useRef<NodeJS.Timeout | null>(null);
    const AUTOPLAY_DELAY = 100000;

    const todayKey = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
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

        // Only start timer for large screens
        if (isLargeScreen && !isCollapsed) {
            inactivityTimer.current = setTimeout(() => {
                setIsCollapsed(true); // Collapse card after 10s
            }, INACTIVITY_DELAY);
        }
    };

    const quickComments = [
        "Amazing! 😍",
        "I knew this one! 💡",
        "Wow, so cool! 🎉",
        "Didn't expect that! 🤯",
        "Fun visual! 😎",
        "Mind blown! 🤯",
        "Love this! ❤️",
        "Wow, so interesting! 👀",
        "I learned something new! 📚",
        "Absolutely awesome! 🌟",
        "Super fun! 🎈",
        "Can't wait to see the next one! 🚀",
    ];

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

                // 2️⃣ Filter out already seen images if user exists
                const { data: { user } } = await supabase.auth.getUser();
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

                    // If all images are seen, reset to full daily set
                    if (filteredImages.length === 0) filteredImages = cachedImages;
                }

                setImages(filteredImages);
                setDataLoading(false);
                return;
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


    // Loader: show only once per day

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
            const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

            // Fetch today's seen comments with user info
            const { data, error } = await supabase
                .from('qfeed_seen_comments') // ✅ table name only
                .select(`
    user_id,
    comment,
    created_at,
    profiles!inner(name, avatar_url, institution)
  `)
                .gte('created_at', `${today}T00:00:00`)
                .lt('created_at', `${today}T23:59:59`);

            if (error) {
                console.error("Failed to load top student:", error.message);
                setTopUsers([]);
                return;
            }

            if (!data || data.length === 0) {
                setTopUsers([]);
                return;
            }

            // Group by user
            const userMap: { [key: string]: { rows: any[], firstCompleted: string } } = {};
            data.forEach((row: any) => {
                if (!userMap[row.user_id]) {
                    userMap[row.user_id] = { rows: [], firstCompleted: row.created_at };
                }
                userMap[row.user_id].rows.push(row);
            });

            // Users who have seen all 3 images
            const completedUsers = Object.values(userMap)
                .filter(u => u.rows.length >= 3)
                .sort((a, b) => new Date(a.firstCompleted).getTime() - new Date(b.firstCompleted).getTime());
            if (completedUsers.length > 0) {
                const topUsersList: SeenUser[] = completedUsers.slice(0, 10).map(u => ({
                    id: u.rows[0].user_id,
                    name: u.rows[0].profiles.name,
                    avatar_url: u.rows[0].profiles.avatar_url,
                    institution: u.rows[0].profiles.institution,
                    comments: u.rows.map(row => row.comment) || [],
                    comment: "Completed all 3 images today 🎉",
                }));
                setTopUsers(topUsersList);
            } else {
                setTopUsers([]);
            }
        };
        loadTopUsers();

        // Real-time updates
        const subscription = supabase
            .channel("top-students-channel")
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "qfeed_seen_comments",
                },
                async (payload) => {
                    const createdAt = new Date(payload.new.created_at).toISOString().slice(0, 10);
                    const today = new Date().toISOString().slice(0, 10);
                    if (createdAt === today) {
                        await loadTopUsers();
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, []);


    // Load seen data for the current user from Supabase
    useEffect(() => {
        const loadSeenData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
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
    }, [images]);


    // Mark Seen + Save Comment
    const markSeen = async (comment: string) => {
        if (!images[activeIndex]) return;
        const image_id = images[activeIndex].id;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return alert("You must be logged in.");

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
            {/* Card Header */}
            <div
                className="w-full max-w-5xl mx-auto text-center mb-4 px-4 cursor-pointer"
                onClick={() => {
                    if (isLargeScreen) setIsCollapsed(!isCollapsed);
                }}
            >
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Daily 3Ree Visual Trivia
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Swipe through today’s images to enhance your memory and learn new concepts!
                </p>
                {isLargeScreen && (
                    <span className="mt-2 inline-block text-gray-600 dark:text-gray-300">
                        {isCollapsed ? "▼ Click to expand" : "▲ Click to collapse"}
                    </span>
                )}
            </div>

            {/* Collapsible Card Body */}
            <AnimatePresence initial={false}>
                {(!isLargeScreen || !isCollapsed) && (
                    <motion.div
                        key="card-body"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.4, ease: "easeInOut" }}
                        ref={containerRef}
                        className="relative w-full py-6 flex flex-col items-center justify-center overflow-visible max-w-5xl mx-auto"
                    >

                        {/* Loader */}
                        {(dataLoading || uiLoading) && (
                            <div className="absolute inset-0 flex items-center justify-center z-10">
                                <GlobalLoader />
                            </div>
                        )}

                        {/* Status Bars */}
                        <div className="absolute top-4 left-4 right-4 flex gap-2 z-20 px-2">
                            {images.map((_, idx) => (
                                <div
                                    key={idx}
                                    className={`h-1 rounded-full transition-all duration-500 ${idx === activeIndex
                                        ? "bg-blue-500 flex-1"
                                        : "bg-gray-300 dark:bg-gray-600 flex-1"
                                        }`}
                                />
                            ))}
                        </div>

                        {/* Images */}
                        <div className="relative w-full h-[460px] flex items-center justify-center overflow-hidden">
                            {isLargeScreen ? (
                                <div
                                    className="flex transition-transform duration-500 ease-out"
                                    style={{
                                        transform: `translateX(-${activeIndex * 100}%)`,
                                        width: `${images.length * 100}%`,
                                    }}
                                    onClick={(e) => {
                                        const { left, width } = e.currentTarget.getBoundingClientRect();
                                        const clickX = e.clientX - left;
                                        if (clickX < width / 2) prev();
                                        else next();
                                    }}
                                >
                                    {images.map((img) => (
                                        <div
                                            key={img.id}
                                            className="w-full flex-shrink-0 flex items-center justify-center cursor-pointer px-2 relative"
                                        >
                                            <img
                                                src={img.image_url}
                                                alt="Story"
                                                className="w-[320px] h-[420px] object-cover rounded-xl shadow-lg"
                                                loading="lazy"
                                            />
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openFullscreen(img.image_url);
                                                }}
                                                className="absolute bottom-3 right-3 flex flex-col items-center justify-center gap-1 p-4 bg-white/90 hover:bg-white rounded-lg shadow-lg"
                                            >
                                                <Maximize className="w-8 h-8 text-black" />
                                                <span className="text-xs font-medium text-black">View</span>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                images[activeIndex] && (
                                    <div
                                        className="w-screen h-[80vh] cursor-pointer relative overflow-hidden"
                                        onClick={(e) => {
                                            const { left, width } = e.currentTarget.getBoundingClientRect();
                                            const clickX = e.clientX - left;
                                            if (clickX < width / 2) prev();
                                            else next();
                                        }}
                                    >
                                        <img
                                            src={images[activeIndex].image_url}
                                            alt="Story"
                                            className="w-full h-full object-cover transition-transform duration-300"
                                            loading="lazy"
                                        />
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                openFullscreen(images[activeIndex].image_url);
                                            }}
                                            className="absolute bottom-32 right-3 flex flex-col items-center justify-center gap-1 p-4 bg-white/90 hover:bg-white rounded-lg shadow-lg"
                                        >
                                            <Maximize className="w-4 h-4 text-black" />
                                            <span className="text-xs font-medium text-black">View</span>
                                        </button>
                                    </div>
                                )
                            )}
                        </div>

                        {/* Mark Seen Button */}
                        <div className="w-full flex flex-col items-center gap-2 mb-4">
                            {images[activeIndex] && seenData[images[activeIndex].id] ? (
                                <button
                                    className="px-4 py-2 bg-gray-400 text-white rounded-lg cursor-not-allowed flex items-center gap-2"
                                    disabled
                                >
                                    <Eye className="w-5 h-5" />
                                    <span>Seen: {seenData[images[activeIndex].id]}</span>
                                </button>
                            ) : (
                                <button
                                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
                                    onClick={() => {
                                        vibrateSafe(100);
                                        setShowComments(true);
                                    }}
                                >
                                    <Eye className="w-5 h-5" />
                                    Mark Seen
                                </button>
                            )}

                            {showComments && (
                                <div
                                    className="fixed inset-0 z-[10000] bg-black/80 flex items-center justify-center animate-overlay"
                                    onClick={() => setShowComments(false)}
                                >
                                    <div
                                        className="bg-white dark:bg-gray-800 rounded-lg p-4 flex flex-col gap-2 animate-slide-up"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
                                            Select a comment
                                        </h3>
                                        {quickComments.map((c) => (
                                            <button
                                                key={c}
                                                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                                                onClick={() => {
                                                    vibrateSafe(50);
                                                    markSeen(c);
                                                    setShowComments(false);
                                                }}
                                            >
                                                {c}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Top 10 Students Panel */}
                        <div className="w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 mt-6">
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                                Top 10 Students Who Marked Seen
                            </h3>

                            {topUsers.length === 0 ? (
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    No students marked seen yet. Mark all seen to appear here.
                                </p>
                            ) : (
                                <ul className="flex flex-col gap-2">
                                    {topUsers.map((u, index) => (
                                        <li key={u.id} className="flex items-start gap-2">
                                            <span className="font-semibold w-5 text-gray-700 dark:text-gray-300">
                                                {index + 1}
                                            </span>
                                            <img
                                                src={u.avatar_url || "/UsersAvatar.jpg"}
                                                alt={u.name}
                                                className="w-8 h-8 rounded-full object-cover"
                                            />
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                    {u.name} {u.institution && `(${u.institution})`}
                                                </p>
                                                {u.comments?.length > 0 && (
                                                    <div className="text-xs text-gray-600 dark:text-gray-400">
                                                        {u.comments.map((c, i) => (
                                                            <span key={i}>
                                                                User commented: {c}
                                                                {i < u.comments.length - 1 && <br />}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                    </motion.div>
                )}
            </AnimatePresence>

            {/* Fullscreen View */}
            {activeImage && (
                <div
                    className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center transition-opacity duration-300"
                    onClick={() => setActiveImage(null)}
                >
                    <button
                        onClick={() => setActiveImage(null)}
                        className="absolute top-4 right-4 z-[10000] p-2 rounded-full bg-white/80 hover:bg-white text-black transition-transform duration-200 hover:scale-110"
                    >
                        <X className="w-6 h-6" />
                    </button>
                    <img
                        src={activeImage}
                        alt="Fullscreen"
                        className="max-w-full max-h-full object-contain transition-transform duration-300 transform scale-90 animate-scale-up"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </>
    );

}