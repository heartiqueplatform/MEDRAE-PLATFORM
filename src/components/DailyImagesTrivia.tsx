"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { ChevronLeft, ChevronRight, Maximize, Eye } from "lucide-react";
import { GlobalLoader } from "@/components/GlobalLoader";

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
    comment: string;
};

export default function DailyImagesTrivia() {
    const [images, setImages] = useState<ImageItem[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const [activeImage, setActiveImage] = useState<string | null>(null);
    const [dataLoading, setDataLoading] = useState(true);
    const [uiLoading, setUiLoading] = useState(true);

    const [showComments, setShowComments] = useState(false);
    const [seenData, setSeenData] = useState<{ [key: string]: string }>({});
    const [isLargeScreen, setIsLargeScreen] = useState(false);

    const [topUsers, setTopUsers] = useState<SeenUser[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);
    const autoplayRef = useRef<NodeJS.Timeout | null>(null);
    const AUTOPLAY_DELAY = 10000;

    const todayKey = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const localImagesKey = `dailyImages_${todayKey}`;

    const localLoaderKey = `dailyLoader_${todayKey}`;

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


    // Load images (with daily persistence)
    useEffect(() => {
        const loadImages = async () => {
            setDataLoading(true);

            const storedImages = localStorage.getItem(localImagesKey);
            if (storedImages) {
                setImages(JSON.parse(storedImages));
                setDataLoading(false);
                return;
            }

            const { data } = await supabase
                .from("qfeed_images")
                .select("id, image_url, description")
                .order("created_at", { ascending: false })
                .limit(20);

            if (data && data.length > 0) {
                const shuffled = [...data].sort(() => 0.5 - Math.random());
                const dailyImages = shuffled.slice(0, 3);
                setImages(dailyImages);
                localStorage.setItem(localImagesKey, JSON.stringify(dailyImages));
            }

            setDataLoading(false);
        };

        loadImages();
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

    // Swipe & mouse drag
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        let startX: number | null = null;
        const onTouchStart = (e: TouchEvent) => (startX = e.touches[0].clientX);
        const onTouchEnd = (e: TouchEvent) => {
            if (startX === null) return;
            const diff = e.changedTouches[0].clientX - startX;
            if (diff > 50) prev();
            else if (diff < -50) next();
            startX = null;
        };

        let isMouseDown = false;
        let mouseStartX: number | null = null;
        const onMouseDown = (e: MouseEvent) => {
            isMouseDown = true;
            mouseStartX = e.clientX;
        };
        const onMouseUp = (e: MouseEvent) => {
            if (!isMouseDown || mouseStartX === null) return;
            const diff = e.clientX - mouseStartX;
            if (diff > 50) prev();
            else if (diff < -50) next();
            isMouseDown = false;
            mouseStartX = null;
        };

        container.addEventListener("touchstart", onTouchStart);
        container.addEventListener("touchend", onTouchEnd);
        container.addEventListener("mousedown", onMouseDown);
        container.addEventListener("mouseup", onMouseUp);

        return () => {
            container.removeEventListener("touchstart", onTouchStart);
            container.removeEventListener("touchend", onTouchEnd);
            container.removeEventListener("mousedown", onMouseDown);
            container.removeEventListener("mouseup", onMouseUp);
        };
    }, [images]);

    const prev = () => setActiveIndex((i) => (i === 0 ? images.length - 1 : i - 1));
    const next = () => setActiveIndex((i) => (i === images.length - 1 ? 0 : i + 1));

    useEffect(() => {
        setIsLargeScreen(window.innerWidth >= 1024);
    }, []);

    // ✅ Load Top 10 students directly from DB view
    useEffect(() => {
        // ✅ SAME LOGIC YOU HAD — PRESERVED EXACTLY
        const loadTopUsers = async () => {
            const { data, error } = await supabase
                .from("daily_top_students")
                .select("*");

            if (error) {
                console.error("Failed to load top students:", error.message);
                setTopUsers([]);
                return;
            }

            setTopUsers(
                (data || []).map((u: any) => ({
                    id: u.user_id,
                    name: u.name,
                    avatar_url: u.avatar_url,
                    institution: u.institution,
                    comment: "Completed all images today 🎉",
                }))
            );
        };

        // ✅ Initial load (replaces deleted useEffect)
        loadTopUsers();

        // ✅ Realtime: listen to REAL table (not the view)
        const subscription = supabase
            .channel("top-students-channel")
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "qfeed_seen_comments",
                },
                async () => {
                    // 🔄 Re-fetch the VIEW when base table changes
                    await loadTopUsers();
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
                const { data, error } = await supabase
                    .from("qfeed_seen_comments")
                    .select("image_id, comment")
                    .eq("user_id", user.id)
                    .in("image_id", imageIds);

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

            // 2️⃣ Update local state
            setSeenData(prev => ({ ...prev, [image_id]: comment }));

            // 3️⃣ Call the SQL function to update daily top students
            await supabase.rpc("update_daily_top_students");

        } catch (err) {
            console.error(err);
        }
    };


    return (
        <>
            {/* Card Heading & Description */}
            <div className="w-full max-w-5xl mx-auto text-center mb-4 px-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Daily Visual Trivia
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Swipe through today’s images to enhance your memory and learn new concepts!
                </p>
            </div>
            <div
                ref={containerRef}
                className="relative w-full py-6 flex flex-col items-center justify-center overflow-visible max-w-5xl mx-auto"
            >

                {/* Loader */}
                {(dataLoading || uiLoading) && (
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                        <GlobalLoader />
                    </div>
                )}

                {/* Status bars */}
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

                {/* Left arrow */}
                <button
                    onClick={prev}
                    className="absolute left-2 top-1/2 z-20 p-2 rounded-full bg-black/50 text-white hover:bg-black/70"
                >
                    <ChevronLeft size={24} />
                </button>

                {/* Images */}
                <div className="relative w-full h-[460px] flex items-center justify-center">
                    {images.map((img, index) => {
                        const offset = index - activeIndex;
                        if (Math.abs(offset) > 1) return null; // only render active + one neighbor

                        // Adjust spacing for big screens
                        const spacing = isLargeScreen ? 250 : 180;

                        return (
                            <div
                                key={img.id}
                                onClick={() => setActiveImage(img.image_url)}
                                className="absolute transition-all duration-500 ease-out cursor-pointer"
                                style={{
                                    width: "320px",
                                    height: "420px",
                                    transform: `translateX(${offset * spacing}px) scale(${offset === 0 ? 1 : 0.82})`,
                                    zIndex: offset === 0 ? 10 : 5 - Math.abs(offset),
                                    opacity: offset === 0 ? 1 : 0.2, // Active image fully visible, neighbor slightly transparent
                                }}
                            >
                                <img
                                    src={img.image_url}
                                    alt="Story"
                                    className="w-full h-full object-cover rounded-xl shadow-lg"
                                    loading="lazy"
                                />

                                {/* Fullscreen button */}
                                {offset === 0 && (
                                    <button
                                        onClick={() => openFullscreen(img.image_url)}
                                        className="absolute bottom-3 right-3 p-2 bg-white/80 hover:bg-white rounded-full shadow-lg"
                                    >
                                        <Maximize className="w-5 h-5 text-black" />
                                    </button>
                                )}
                            </div>
                        );
                    })}

                </div>


                {/* Right arrow */}
                <button
                    onClick={next}
                    className="absolute right-2 top-1/2 z-20 p-2 rounded-full bg-black/50 text-white hover:bg-black/70"
                >
                    <ChevronRight size={24} />
                </button>


                {/* Mark Seen button inside the card */}
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
                                if (navigator.vibrate) navigator.vibrate(100); // vibrate on click
                                setShowComments(true);
                            }}
                        >
                            <Eye className="w-5 h-5" />
                            Mark Seen
                        </button>

                    )}

                    {/* Quick comment modal */}
                    {showComments && (
                        <div
                            className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center"
                            onClick={() => setShowComments(false)}
                        >
                            <div
                                className="bg-white dark:bg-gray-800 rounded-lg p-4 flex flex-col gap-2"
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

                {/* Top 10 students panel inside the card */}
                {/* Top 10 students panel inside the card */}
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
                                <li key={u.id} className="flex items-center gap-2">
                                    <span className="font-semibold w-5 text-gray-700 dark:text-gray-300">
                                        #{index + 1}
                                    </span>
                                    <img
                                        src={u.avatar_url || "/default-avatar.png"}
                                        alt={u.name}
                                        className="w-8 h-8 rounded-full object-cover"
                                    />
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                                            {u.name} {u.institution && `(${u.institution})`}
                                        </p>
                                        <p className="text-xs text-gray-600 dark:text-gray-400">
                                            {u.comment}
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

            </div>


            {/* Fullscreen view */}
            {activeImage && (
                <div
                    className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
                    onClick={() => setActiveImage(null)}
                >
                    <img
                        src={activeImage}
                        alt="Fullscreen"
                        className="max-w-full max-h-full object-contain"
                    />
                </div>
            )}
        </>
    );
}
