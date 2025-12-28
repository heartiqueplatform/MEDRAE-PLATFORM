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
                morning: `Welcome to a new week of professional growth. Reflect on your achievements and prepare for a week full of learning and skill development.`,
                afternoon: `Keep building momentum today. Take time to consolidate your learning and plan for the week ahead.`,
                evening: `Wrap up your Sunday with reflection and preparation. Celebrate small wins and set goals for a productive week.`,
                night: `Hope your Sunday winds down peacefully. Take a moment to rest and recharge for the week ahead.`,
            },
            Monday: {
                morning: `Welcome to the start of a productive week. Review your notes and practice essential skills with focus and confidence.`,
                afternoon: `Keep pushing forward and apply what you've learned so far. Every effort counts towards mastery.`,
                evening: `Reflect on what you accomplished today and plan your next steps. Your dedication sets the tone for a successful week.`,
                night: `Hope your Monday winds down smoothly. Rest well and prepare for continued growth tomorrow.`,
            },
            Tuesday: {
                morning: `Welcome to another day of advancement. Stay curious and continue building your clinical expertise.`,
                afternoon: `Keep progressing and challenging yourself. Every step brings you closer to mastery.`,
                evening: `Review today's achievements and consider areas for improvement. Growth is built daily.`,
                night: `Hope your Tuesday concludes positively. Rest and recharge to continue your learning journey.`,
            },
            Wednesday: {
                morning: `Welcome to midweek. Celebrate your progress so far and stay motivated for the remainder of the week.`,
                afternoon: `Continue applying your skills and reflect on your learning. Midweek is perfect for focus and refinement.`,
                evening: `Wrap up your Wednesday with reflection and planning. Your consistent effort is impressive.`,
                night: `Hope your Wednesday evening is relaxing. Recharge and prepare for the rest of the week.`,
            },
            Thursday: {
                morning: `Welcome to a new day of professional growth. Embrace every learning opportunity and refine your skills.`,
                afternoon: `Keep applying knowledge in practice. Small consistent steps lead to mastery.`,
                evening: `Reflect on what you learned today and celebrate progress made.`,
                night: `Hope your Thursday winds down well. Rest and get ready to finish the week strong.`,
            },
            Friday: {
                morning: `Welcome to the final stretch of the week. Focus on consolidating knowledge and practicing skills.`,
                afternoon: `Keep moving forward and apply lessons learned this week.`,
                evening: `Reflect on the week’s accomplishments and plan for next week’s growth.`,
                night: `Hope your Friday evening is peaceful. Take time to rest and recharge for the weekend.`,
            },
            Saturday: {
                morning: `Welcome to a day for reflection and skill refinement. Review your progress and deepen your understanding.`,
                afternoon: `Continue exploring new concepts and applying knowledge practically.`,
                evening: `Wrap up Saturday with reflection and acknowledge your achievements.`,
                night: `Hope your Saturday concludes positively. Rest well and prepare for the week ahead.`,
            },
        };

        const nursingMessages: Record<string, string> = {
            Sunday: ` Sunday reset: Rest up, future nurse! Take today to recharge, reflect on your progress, and plan for the week ahead. Your patients will appreciate your energy and dedication tomorrow!`,
            Monday: ` Motivated Monday! A fresh week to sharpen your nursing skills, tackle challenging concepts, and set new goals. Remember, every step today brings you closer to becoming the nurse you aspire to be.`,
            Tuesday: `Triage Tuesday! Keep organizing your notes, practicing procedures, and building your knowledge. Focus on consistency and small victories—they add up to big success in your nursing journey.`,
            Wednesday: ` Wellness Wednesday! Halfway through the week—keep your energy high and your mind sharp. Take a moment to celebrate your wins so far, and remember that persistence is key to mastery.`,
            Thursday: ` Thriving Thursday! Your dedication to learning and improving as a nurse is inspiring. Push through, review what you’ve learned, and keep challenging yourself—you’re making amazing progress!`,
            Friday: `Fantastic Friday! End the week strong by consolidating your knowledge, practicing skills, and reflecting on your achievements. Celebrate your growth and get ready to recharge for an even better week ahead.`,
            Saturday: ` Study Saturday! Use today to review, practice, and deepen your understanding. Whether it’s theory or hands-on skills, every effort counts. Your future patients and colleagues will thank you for your commitment.`,
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
        <div className="bg-gradient-to-r from-blue-800 via-blue-900 to-black rounded-none p-2 text-white">
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
