// src/components/GreetingsCard.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@supabase/auth-helpers-react";

// ============================================
// SHORT DAILY MOOD — one phrase per day
// ============================================
const DAILY_MOOD: Record<string, string> = {
    Sunday: "Reset and reflect",
    Monday: "New week, new focus",
    Tuesday: "Stay sharp",
    Wednesday: "Halfway there",
    Thursday: "Keep pushing",
    Friday: "Finish strong",
    Saturday: "Study at your pace",
};

export default function GreetingsCard() {
    const user = useUser();

    // Instant from cache
    const [name, setName] = useState<string>(() => {
        if (typeof window === "undefined") return "Nurse";
        return localStorage.getItem("userName") || "Nurse";
    });

    const [greeting, setGreeting] = useState<string>("");
    const [mood, setMood] = useState<string>("");

    // Time-based greeting + day mood
    useEffect(() => {
        const now = new Date();
        const h = now.getHours();

        const g =
            h >= 5 && h < 12 ? "Good morning" :
                h >= 12 && h < 17 ? "Good afternoon" :
                    h >= 17 && h < 21 ? "Good evening" :
                        "Good night";

        const weekday = now.toLocaleDateString("en-US", { weekday: "long" });

        setGreeting(g);
        setMood(DAILY_MOOD[weekday] || "");
    }, []);

    // Fetch name once — only if not cached
    useEffect(() => {
        if (!user?.id) return;
        if (typeof window === "undefined") return;
        if (localStorage.getItem("userName")) return;

        let cancelled = false;

        const fetchName = async () => {
            try {
                const { data, error } = await supabase
                    .from("profiles")
                    .select("name")
                    .eq("user_id", user.id)
                    .single();

                if (!cancelled && !error && data?.name) {
                    const first = data.name.split(" ")[0];
                    setName(first);
                    localStorage.setItem("userName", first);
                }
            } catch {
                // Silent fail — fallback is "Nurse"
            }
        };

        fetchName();
        return () => { cancelled = true; };
    }, [user?.id]);

    return (
        <div className="px-4 md:px-6 py-3 md:py-4 space-y-1">
            <h1 className="text-xl md:text-2xl lg:text-3xl font-extrabold tracking-tight
                text-transparent bg-clip-text bg-gradient-to-br
                from-slate-900 via-blue-800 to-slate-900
                dark:from-white dark:via-blue-100 dark:to-blue-300/80">
                {greeting}, {name}
            </h1>

            {mood && (
                <p className="text-xs md:text-sm font-medium text-slate-500 dark:text-slate-400">
                    {mood}
                </p>
            )}
        </div>
    );
}