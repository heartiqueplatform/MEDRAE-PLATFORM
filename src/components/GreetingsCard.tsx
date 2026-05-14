"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@supabase/auth-helpers-react";

export default function GreetingsCard() {
    const user = useUser();
    const cachedName = localStorage.getItem("userName");
    const [name, setName] = useState<string | null>(cachedName || null);
    const [loading, setLoading] = useState(!cachedName); // true only if no cached name
    const [typedWelcome, setTypedWelcome] = useState("");
    const [typedNursing, setTypedNursing] = useState("");

    const [welcomeMessage, setWelcomeMessage] = useState(localStorage.getItem("welcomeMessage") || "");
    const [nursingMessage, setNursingMessage] = useState(localStorage.getItem("nursingMessage") || "");

    useEffect(() => {
        if (!user?.id) return;
        if (name) return; // name already present, skip fetch

        // Fetch from Supabase only if name not cached
        const fetchProfile = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from("profiles")
                .select("name")
                .eq("user_id", user.id)
                .single();

            if (!error && data?.name) {
                const firstName = data.name.split(" ")[0];
                setName(firstName);
                localStorage.setItem("userName", firstName);
            }

            setLoading(false);
        };

        fetchProfile();
    }, [user, name]);
    // Welcome typing effect
    useEffect(() => {
        const cached = localStorage.getItem("typedWelcome");
        if (cached === welcomeMessage) {
            setTypedWelcome(welcomeMessage); // Already typed, show instantly
            return;
        }

        let index = 0;
        setTypedWelcome("");

        const typeNext = () => {
            setTypedWelcome((prev) => {
                const nextChar = welcomeMessage.charAt(index);
                index++;
                if (!nextChar) return prev;
                return prev + nextChar;
            });

            if (index < welcomeMessage.length) {
                setTimeout(typeNext, 10);
            } else {
                localStorage.setItem("typedWelcome", welcomeMessage);
            }
        };

        typeNext();
    }, [welcomeMessage]);

    // Nursing typing effect
    useEffect(() => {
        const cached = localStorage.getItem("typedNursing");
        if (cached === nursingMessage) {
            setTypedNursing(nursingMessage); // Already typed, show instantly
            return;
        }

        let index = 0;
        setTypedNursing("");

        const typeNext = () => {
            setTypedNursing((prev) => {
                const nextChar = nursingMessage.charAt(index);
                index++;
                if (!nextChar) return prev;
                return prev + nextChar;
            });

            if (index < nursingMessage.length) {
                setTimeout(typeNext, 10);
            } else {
                localStorage.setItem("typedNursing", nursingMessage);
            }
        };

        typeNext();
    }, [nursingMessage]);


    useEffect(() => {
        if (!name) return;

        const now = new Date();
        const hour = now.getHours();
        const weekday = now.toLocaleDateString("en-US", { weekday: "long" });

        // 1️⃣ Check if all messages are cached
        const cachedMessages = localStorage.getItem("cachedMessages");
        let dailyMessage: Record<string, Record<string, string>>;
        let nursingMessages: Record<string, string>;

        if (cachedMessages) {
            const parsed = JSON.parse(cachedMessages);
            dailyMessage = parsed.dailyMessage;
            nursingMessages = parsed.nursingMessages;
        } else {
            // 2️⃣ Define messages once
            dailyMessage = {
                Sunday: {
                    morning: `A new week begins a fresh chance to grow professionally. Take a moment to reflect on your progress and prepare for focused learning ahead.`,
                    afternoon: `Keep the momentum steady today. Use this time to organize your thoughts and plan the week with clarity.`,
                    evening: `End your Sunday with calm reflection. Acknowledge what you’ve achieved and set simple, realistic goals for the week.`,
                    night: `As Sunday winds down, allow yourself to rest. A clear mind tonight supports a strong start tomorrow.`,
                },
                Monday: {
                    morning: `A new week is underway. Review your notes, focus on core skills, and approach today with intention.`,
                    afternoon: `Stay consistent and apply what you’ve learned so far. Progress comes from steady effort.`,
                    evening: `Take a moment to reflect on today’s work and outline your next steps. Small actions create strong routines.`,
                    night: `As Monday comes to a close, rest well. Tomorrow is another opportunity to build forward.`,
                },
                Tuesday: {
                    morning: `A new day to build confidence and competence. Stay curious and continue strengthening your clinical knowledge.`,
                    afternoon: `Keep moving forward at a steady pace. Each focused session adds meaningful progress.`,
                    evening: `Review today’s work and note areas to improve. Growth happens through awareness and practice.`,
                    night: `As Tuesday ends, give yourself space to recharge. Consistency matters more than intensity.`,
                },
                Wednesday: {
                    morning: `Midweek is here. Recognize how far you’ve come and stay focused on what remains.`,
                    afternoon: `Use this time to refine your understanding and apply skills with intention.`,
                    evening: `Pause to reflect on today’s progress and prepare calmly for the rest of the week.`,
                    night: `Let Wednesday end on a relaxed note. Rest supports clarity and retention.`,
                },
                Thursday: {
                    morning: `Another day to strengthen your professional foundation. Approach learning with patience and focus.`,
                    afternoon: `Continue applying what you know. Consistent effort leads to long-term confidence.`,
                    evening: `Reflect on what stood out today and carry those insights forward.`,
                    night: `As Thursday settles, slow down and rest. Finishing strong starts with recovery.`,
                },
                Friday: {
                    morning: `The final stretch of the week begins. Focus on reinforcing what you’ve learned.`,
                    afternoon: `Keep moving steadily and apply the week’s lessons with confidence.`,
                    evening: `Take time to reflect on the week’s progress and consider what you want to improve next.`,
                    night: `As Friday ends, allow yourself to rest fully. Recovery is part of growth.`,
                },
                Saturday: {
                    morning: `A quieter day to reflect and refine. Review your progress and deepen understanding.`,
                    afternoon: `Explore concepts at your own pace and apply knowledge thoughtfully.`,
                    evening: `Close the day by recognizing what you’ve accomplished, no matter how small.`,
                    night: `Let Saturday end peacefully. Rest prepares you for the week ahead.`,
                },
            };

            nursingMessages = {
                Sunday: `Sunday reset. Take today to slow down, reflect on your progress, and prepare for the week ahead. Rest is part of becoming a steady, dependable nurse.`,
                Monday: `Motivated Monday! Use today to sharpen your nursing skills, focus on key concepts, and set clear, achievable goals.`,
                Tuesday: `Triage Tuesday. Stay organized, practice consistently, and keep building your clinical understanding. Small, steady efforts lead to strong outcomes.`,
                Wednesday: `Wellness Wednesday. You’re halfway through the week  steady progress matters. Acknowledge what you’ve done well so far and continue forward with focus.`,
                Thursday: `Thriving Thursday. Your commitment to learning is shaping your professional confidence. Review what you’ve covered and keep challenging yourself thoughtfully.`,
                Friday: `Fantastic Friday! Reflect on what you’ve learned this week and recognize your progress. Growth comes from both effort and reflection.`,
                Saturday: `Study Saturday. Take time to review, practice, and deepen understanding. Each focused session strengthens the nurse you’re becoming.`,
            };

            localStorage.setItem("cachedMessages", JSON.stringify({ dailyMessage, nursingMessages }));
        }

        // 3️⃣ Determine time of day
        let timeOfDay: "morning" | "afternoon" | "evening" | "night";
        if (hour >= 5 && hour < 12) timeOfDay = "morning";
        else if (hour >= 12 && hour < 17) timeOfDay = "afternoon";
        else if (hour >= 17 && hour < 21) timeOfDay = "evening";
        else timeOfDay = "night";

        const timeGreeting =
            hour >= 5 && hour < 12 ? "Good morning" :
                hour >= 12 && hour < 17 ? "Good afternoon" :
                    hour >= 17 && hour < 21 ? "Good evening" :
                        "Good night";

        // 4️⃣ Set current messages
        const welcome = `${timeGreeting}, ${name} 👋! ${dailyMessage[weekday][timeOfDay]}`;
        const nursing = nursingMessages[weekday] || "";

        setWelcomeMessage(welcome);
        setNursingMessage(nursing);

        // Cache the daily messages separately (optional for typing effect)
        localStorage.setItem("welcomeMessage", welcome);
        localStorage.setItem("nursingMessage", nursing);

    }, [name]);
    return (
        <div className="relative group overflow-hidden rounded-xl  transition-all duration-500
    bg-white/70 border-0 shadow-sm hover:shadow-xl hover:shadow-blue-500/10
    dark:bg-[#0a0f1d]  dark:hover:shadow-[0_0_40px_-10px_rgba(30,58,138,0.5)]
    backdrop-blur-md p-6">

            {/* Animated Background Mesh - Color adjusted for light/dark */}
            <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full blur-[80px] transition-all duration-700
        bg-blue-400/10 dark:bg-blue-600/10 group-hover:bg-blue-300/20 dark:group-hover:bg-blue-500/20" />
            <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full blur-[80px]
        bg-indigo-100/30 dark:bg-indigo-900/20" />

            <div className="relative z-10 flex flex-col gap-1">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-br
                /* High-contrast gradient for Light mode, Glowing for Dark */
                from-slate-900 via-blue-800 to-slate-900
                dark:from-white dark:via-blue-100 dark:to-blue-300/80">
                        {typedWelcome || "Initializing..."}
                    </h1>

                    {loading && (
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border transition-colors
                    bg-blue-50 border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/20">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                            </span>
                            <span className="text-[10px] uppercase tracking-widest font-bold
                        text-blue-600 dark:text-blue-400">
                                Live Sync
                            </span>
                        </div>
                    )}
                </div>

                <p className="text-sm md:text-base font-medium leading-relaxed max-w-[90%]
            text-slate-600 dark:text-slate-400">
                    <span className="text-blue-500 dark:text-blue-400/80 mr-1">✦</span>
                    {typedNursing || "Awaiting system data..."}
                </p>
            </div>

            {/* Subtle Inner Glow Border */}
            <div className="absolute inset-0 rounded-2xl border border-white/40 dark:border-white/5 pointer-events-none" />
        </div>
    );
}
