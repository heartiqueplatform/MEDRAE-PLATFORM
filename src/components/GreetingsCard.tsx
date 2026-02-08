"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@supabase/auth-helpers-react";

export default function GreetingsCard() {
    const user = useUser();
    const [name, setName] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [typedWelcome, setTypedWelcome] = useState("");
    const [typedNursing, setTypedNursing] = useState("");

    const [welcomeMessage, setWelcomeMessage] = useState(localStorage.getItem("welcomeMessage") || "");
    const [nursingMessage, setNursingMessage] = useState(localStorage.getItem("nursingMessage") || "");

    useEffect(() => {
        if (!user?.id) return;

        const fetchProfile = async () => {
            const { data, error } = await supabase
                .from("profiles")
                .select("name")
                .eq("user_id", user.id)
                .single();

            if (!error && data?.name) {
                const firstName = data.name.split(" ")[0];
                setName(firstName);
            }

            setLoading(false);
        };

        fetchProfile();
    }, [user]);
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
        const today = now.toLocaleDateString("en-US", { weekday: "long" });

        // Time of day greeting
        let timeGreeting: string;
        if (hour >= 5 && hour < 12) timeGreeting = "Good morning";
        else if (hour >= 12 && hour < 17) timeGreeting = "Good afternoon";
        else if (hour >= 17 && hour < 21) timeGreeting = "Good evening";
        else timeGreeting = "Good night";

        // Daily messages per day/time
        const dailyMessage: Record<
            string,
            { morning: string; afternoon: string; evening: string; night: string }
        > = {
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


        const nursingMessages: Record<string, string> = {
            Sunday: `Sunday reset. Take today to slow down, reflect on your progress, and prepare for the week ahead. Rest is part of becoming a steady, dependable nurse.`,
            Monday: `Motivated Monday! Use today to sharpen your nursing skills, focus on key concepts, and set clear, achievable goals.`,
            Tuesday: `Triage Tuesday. Stay organized, practice consistently, and keep building your clinical understanding. Small, steady efforts lead to strong outcomes.`,
            Wednesday: `Wellness Wednesday. You’re halfway through the week  steady progress matters. Acknowledge what you’ve done well so far and continue forward with focus.`,
            Thursday: `Thriving Thursday. Your commitment to learning is shaping your professional confidence. Review what you’ve covered and keep challenging yourself thoughtfully.`,
            Friday: `Fantastic Friday! Reflect on what you’ve learned this week and recognize your progress. Growth comes from both effort and reflection.`,
            Saturday: `Study Saturday. Take time to review, practice, and deepen understanding. Each focused session strengthens the nurse you’re becoming.`,
        };



        // Determine time key
        let timeOfDay: "morning" | "afternoon" | "evening" | "night";
        if (hour >= 5 && hour < 12) timeOfDay = "morning";
        else if (hour >= 12 && hour < 17) timeOfDay = "afternoon";
        else if (hour >= 17 && hour < 21) timeOfDay = "evening";
        else timeOfDay = "night";

        const welcome = `${timeGreeting}, ${name} 👋! ${dailyMessage[today][timeOfDay]}`;
        const nursing = nursingMessages[today] || "";

        setWelcomeMessage(welcome);
        setNursingMessage(nursing);

        // Cache
        localStorage.setItem("welcomeMessage", welcome);
        localStorage.setItem("nursingMessage", nursing);
    }, [name]);

    return (
        <div className="bg-gradient-to-r from-blue-800 via-blue-900 to-black rounded-xl p-2 text-white">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">
                {typedWelcome || "Loading..."}

                {loading && (
                    <span className="ml-3 inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 bg-blue-100 dark:bg-blue-900 dark:text-blue-300 rounded-lg animate-pulse">
                        Updating…
                    </span>
                )}
            </h1>
            <p className="text-white/90">{typedNursing || "Loading..."}</p>

        </div>
    );
}
