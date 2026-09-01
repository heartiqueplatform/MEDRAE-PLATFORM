"use client";
import { useEffect, useState, useRef, useCallback, memo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@supabase/auth-helpers-react";

// ============================================
// ✅ PRE-LOADED: Shows instantly from cache
// ============================================

const MESSAGES = {
    dailyMessage: {
        Sunday: {
            morning: "A new week begins a fresh chance to grow professionally. Take a moment to reflect on your progress and prepare for focused learning ahead.",
            afternoon: "Keep the momentum steady today. Use this time to organize your thoughts and plan the week with clarity.",
            evening: "End your Sunday with calm reflection. Acknowledge what you've achieved and set simple, realistic goals for the week.",
            night: "As Sunday winds down, allow yourself to rest. A clear mind tonight supports a strong start tomorrow.",
        },
        Monday: {
            morning: "A new week is underway. Review your notes, focus on core skills, and approach today with intention.",
            afternoon: "Stay consistent and apply what you've learned so far. Progress comes from steady effort.",
            evening: "Take a moment to reflect on today's work and outline your next steps. Small actions create strong routines.",
            night: "As Monday comes to a close, rest well. Tomorrow is another opportunity to build forward.",
        },
        Tuesday: {
            morning: "A new day to build confidence and competence. Stay curious and continue strengthening your clinical knowledge.",
            afternoon: "Keep moving forward at a steady pace. Each focused session adds meaningful progress.",
            evening: "Review today's work and note areas to improve. Growth happens through awareness and practice.",
            night: "As Tuesday ends, give yourself space to recharge. Consistency matters more than intensity.",
        },
        Wednesday: {
            morning: "Midweek is here. Recognize how far you've come and stay focused on what remains.",
            afternoon: "Use this time to refine your understanding and apply skills with intention.",
            evening: "Pause to reflect on today's progress and prepare calmly for the rest of the week.",
            night: "Let Wednesday end on a relaxed note. Rest supports clarity and retention.",
        },
        Thursday: {
            morning: "Another day to strengthen your professional foundation. Approach learning with patience and focus.",
            afternoon: "Continue applying what you know. Consistent effort leads to long-term confidence.",
            evening: "Reflect on what stood out today and carry those insights forward.",
            night: "As Thursday settles, slow down and rest. Finishing strong starts with recovery.",
        },
        Friday: {
            morning: "The final stretch of the week begins. Focus on reinforcing what you've learned.",
            afternoon: "Keep moving steadily and apply the week's lessons with confidence.",
            evening: "Take time to reflect on the week's progress and consider what you want to improve next.",
            night: "As Friday ends, allow yourself to rest fully. Recovery is part of growth.",
        },
        Saturday: {
            morning: "A quieter day to reflect and refine. Review your progress and deepen understanding.",
            afternoon: "Explore concepts at your own pace and apply knowledge thoughtfully.",
            evening: "Close the day by recognizing what you've accomplished, no matter how small.",
            night: "Let Saturday end peacefully. Rest prepares you for the week ahead.",
        },
    },
    nursingMessages: {
        Sunday: "Sunday reset. Take today to slow down, reflect on your progress, and prepare for the week ahead. Rest is part of becoming a steady, dependable nurse.",
        Monday: "Motivated Monday! Use today to sharpen your nursing skills, focus on key concepts, and set clear, achievable goals.",
        Tuesday: "Triage Tuesday. Stay organized, practice consistently, and keep building your clinical understanding. Small, steady efforts lead to strong outcomes.",
        Wednesday: "Wellness Wednesday. You're halfway through the week — steady progress matters. Acknowledge what you've done well so far and continue forward with focus.",
        Thursday: "Thriving Thursday. Your commitment to learning is shaping your professional confidence. Review what you've covered and keep challenging yourself thoughtfully.",
        Friday: "Fantastic Friday! Reflect on what you've learned this week and recognize your progress. Growth comes from both effort and reflection.",
        Saturday: "Study Saturday. Take time to review, practice, and deepen understanding. Each focused session strengthens the nurse you're becoming.",
    }
};

// ✅ CACHE HELPERS
const CACHE_KEY = "greeting_cache_v3";
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

const getCachedGreeting = () => {
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_DURATION) {
                return data;
            }
        }
    } catch (e) { /* silent */ }
    return null;
};

const setCachedGreeting = (data: { welcome: string; nursing: string; name: string; day: string }) => {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
    } catch (e) { /* silent */ }
};

// Memoized Greeting component to prevent re-renders
const GreetingDisplay = memo(({
    welcome,
    loading,
    showLoading
}: {
    welcome: string;
    loading: boolean;
    showLoading: boolean;
}) => (
    <div className="flex items-center gap-2 md:gap-3">
        <h1 className="text-xl md:text-2xl lg:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-br
            from-slate-900 via-blue-800 to-slate-900
            dark:from-white dark:via-blue-100 dark:to-blue-300/80">
            {welcome}
        </h1>
        {showLoading && loading && (
            <div className="flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-0.5 md:py-1 rounded-full border
                bg-blue-50 border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/20 flex-shrink-0">
                <span className="relative flex h-1.5 w-1.5 md:h-2 md:w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 md:h-2 md:w-2 bg-blue-500"></span>
                </span>
                <span className="text-[8px] md:text-[10px] uppercase tracking-widest font-bold text-blue-600 dark:text-blue-400">
                    Live Sync
                </span>
            </div>
        )}
    </div>
));

GreetingDisplay.displayName = "GreetingDisplay";

const NursingMessage = memo(({ nursing }: { nursing: string }) => (
    <p className="text-xs md:text-sm lg:text-base font-medium leading-relaxed max-w-[95%] md:max-w-[90%]
        text-slate-600 dark:text-slate-400">
        <span className="text-blue-500 dark:text-blue-400/80 mr-1">✦</span>
        {nursing}
    </p>
));

NursingMessage.displayName = "NursingMessage";

// ✅ PRE-LOAD: Generate fallback/default messages instantly
const generateFallbackMessages = (userName: string = "Nurse"): { welcome: string; nursing: string } => {
    const now = new Date();
    const hour = now.getHours();
    const weekday = now.toLocaleDateString("en-US", { weekday: "long" });

    let timeOfDay: "morning" | "afternoon" | "evening" | "night";
    if (hour >= 5 && hour < 12) timeOfDay = "morning";
    else if (hour >= 12 && hour < 17) timeOfDay = "afternoon";
    else if (hour >= 17 && hour < 21) timeOfDay = "evening";
    else timeOfDay = "night";

    const timeGreeting = hour >= 5 && hour < 12 ? "Good morning" :
        hour >= 12 && hour < 17 ? "Good afternoon" :
            hour >= 17 && hour < 21 ? "Good evening" :
                "Good night";

    const dailyMsg = MESSAGES.dailyMessage[weekday as keyof typeof MESSAGES.dailyMessage]?.[timeOfDay] || "";
    const nursingMsg = MESSAGES.nursingMessages[weekday as keyof typeof MESSAGES.nursingMessages] || "";

    const welcomeMsg = `${timeGreeting}, ${userName} 👋! ${dailyMsg}`;

    return { welcome: welcomeMsg, nursing: nursingMsg };
};

// ✅ PRE-LOAD: Get cached or generate fresh
const preloadGreeting = (userName?: string | null) => {
    try {
        // Check cache first
        const cached = getCachedGreeting();
        if (cached && cached.welcome && cached.nursing) {
            return {
                welcome: cached.welcome,
                nursing: cached.nursing,
                name: cached.name || userName || "Nurse"
            };
        }

        // Generate fresh
        const name = userName || localStorage.getItem("userName") || "Nurse";
        const fresh = generateFallbackMessages(name);

        // Cache it
        const day = new Date().toLocaleDateString("en-US", { weekday: "long" });
        setCachedGreeting({
            welcome: fresh.welcome,
            nursing: fresh.nursing,
            name: name,
            day: day
        });

        return {
            welcome: fresh.welcome,
            nursing: fresh.nursing,
            name: name
        };
    } catch (e) {
        // Ultimate fallback
        return {
            welcome: "Good morning, Nurse 👋! Ready to learn?",
            nursing: "Every day is a chance to grow.",
            name: "Nurse"
        };
    }
};

export default function GreetingsCard() {
    const user = useUser();

    // ✅ PRE-LOADED: State initialized with cached data immediately
    const [name, setName] = useState<string>(() => {
        const cached = getCachedGreeting();
        if (cached?.name) return cached.name;
        return localStorage.getItem("userName") || "Nurse";
    });

    const [welcome, setWelcome] = useState<string>(() => {
        const preloaded = preloadGreeting();
        return preloaded.welcome;
    });

    const [nursing, setNursing] = useState<string>(() => {
        const preloaded = preloadGreeting();
        return preloaded.nursing;
    });

    const [loading, setLoading] = useState(false);
    const [isHydrated, setIsHydrated] = useState(false);
    const userFetchedRef = useRef(false);

    // Handle hydration
    useEffect(() => {
        setIsHydrated(true);
    }, []);

    // Get time-based greeting and day
    const getGreetingData = useCallback(() => {
        const now = new Date();
        const hour = now.getHours();
        const weekday = now.toLocaleDateString("en-US", { weekday: "long" });

        let timeOfDay: "morning" | "afternoon" | "evening" | "night";
        if (hour >= 5 && hour < 12) timeOfDay = "morning";
        else if (hour >= 12 && hour < 17) timeOfDay = "afternoon";
        else if (hour >= 17 && hour < 21) timeOfDay = "evening";
        else timeOfDay = "night";

        const timeGreeting = hour >= 5 && hour < 12 ? "Good morning" :
            hour >= 12 && hour < 17 ? "Good afternoon" :
                hour >= 17 && hour < 21 ? "Good evening" :
                    "Good night";

        return { weekday, timeOfDay, timeGreeting };
    }, []);

    // Generate messages with custom name
    const generateMessages = useCallback((userName: string) => {
        const { weekday, timeOfDay, timeGreeting } = getGreetingData();
        const dailyMsg = MESSAGES.dailyMessage[weekday as keyof typeof MESSAGES.dailyMessage]?.[timeOfDay] || "";
        const nursingMsg = MESSAGES.nursingMessages[weekday as keyof typeof MESSAGES.nursingMessages] || "";

        const welcomeMsg = `${timeGreeting}, ${userName} 👋! ${dailyMsg}`;
        const nursingMsgText = nursingMsg;

        // Cache in localStorage
        setCachedGreeting({
            welcome: welcomeMsg,
            nursing: nursingMsgText,
            name: userName,
            day: weekday
        });

        return { welcomeMsg, nursingMsgText };
    }, [getGreetingData]);

    // Load user name from Supabase (background - non-blocking)
    useEffect(() => {
        if (!user?.id || userFetchedRef.current) return;

        // If we already have a name in state, use it
        if (name && name !== "Nurse") {
            const cached = getCachedGreeting();
            if (cached?.welcome) {
                setWelcome(cached.welcome);
                setNursing(cached.nursing);
            } else {
                const { welcomeMsg, nursingMsgText } = generateMessages(name);
                setWelcome(welcomeMsg);
                setNursing(nursingMsgText);
            }
            setLoading(false);
            return;
        }

        userFetchedRef.current = true;
        setLoading(true);

        const fetchProfile = async () => {
            try {
                const { data, error } = await supabase
                    .from("profiles")
                    .select("name")
                    .eq("user_id", user.id)
                    .single();

                if (!error && data?.name) {
                    const firstName = data.name.split(" ")[0];
                    setName(firstName);
                    localStorage.setItem("userName", firstName);

                    // Check if we already have cached greeting for today
                    const cached = getCachedGreeting();
                    const today = new Date().toLocaleDateString("en-US", { weekday: "long" });

                    if (cached?.day === today && cached.name === firstName) {
                        setWelcome(cached.welcome);
                        setNursing(cached.nursing);
                    } else {
                        const { welcomeMsg, nursingMsgText } = generateMessages(firstName);
                        setWelcome(welcomeMsg);
                        setNursing(nursingMsgText);
                    }
                }
            } catch (err) {
                console.error("Error fetching profile:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [user?.id, name, generateMessages]);

    // Re-generate messages when day changes (background)
    useEffect(() => {
        if (!name || name === "Nurse") return;

        const cached = getCachedGreeting();
        const currentDay = new Date().toLocaleDateString("en-US", { weekday: "long" });

        if (!cached || cached.day !== currentDay || cached.name !== name) {
            const { welcomeMsg, nursingMsgText } = generateMessages(name);
            setWelcome(welcomeMsg);
            setNursing(nursingMsgText);
        } else if (cached) {
            // Use cached if available
            setWelcome(cached.welcome);
            setNursing(cached.nursing);
        }
    }, [name, generateMessages]);

    // ✅ ALWAYS show content immediately (no loading state)
    return (
        <div className="relative group overflow-hidden md:rounded-xl transition-all duration-500
            bg-white/70 md:border-0 md:shadow-sm md:hover:shadow-xl md:hover:shadow-blue-500/10
            dark:bg-muted/70 dark:md:hover:shadow-[0_0_40px_-10px_rgba(30,58,138,0.5)]
            backdrop-blur-md p-4 md:p-6 border-b border-slate-100 dark:border-slate-800 md:border-b-0"
            style={{ contain: 'layout style paint' }}
        >
            {/* Animated Background Mesh - GPU accelerated */}
            <div className="absolute top-4 -right-24 h-48 md:h-64 w-48 md:w-64 rounded-full blur-[60px] md:blur-[80px] transition-all duration-700
                bg-blue-400/10 dark:bg-blue-600/10 group-hover:bg-blue-300/20 dark:group-hover:bg-blue-500/20 will-change-transform" />
            <div className="absolute -bottom-24 -left-24 h-48 md:h-64 w-48 md:w-64 rounded-full blur-[60px] md:blur-[80px]
                bg-indigo-100/30 dark:bg-indigo-900/20 will-change-transform" />

            <div className="relative z-10 flex flex-col gap-1">
                <GreetingDisplay
                    welcome={welcome}
                    loading={loading}
                    showLoading={loading}
                />
                <NursingMessage nursing={nursing} />
            </div>

            {/* Subtle Inner Glow Border */}
            <div className="absolute inset-0 md:rounded-2xl border border-white/40 dark:border-white/5 pointer-events-none" />
        </div>
    );
}