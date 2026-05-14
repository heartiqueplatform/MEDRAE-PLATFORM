"use client";
import { ShieldCheck, AlertCircle, ChevronRight, Zap, Target } from "lucide-react";
import { motion } from "framer-motion";


import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
type Mistake = {
    id: string;
    mistake_reason: string | null;
    times_wrong: number;
    resolved: boolean;
};

export default function MistakeCard() {
    const navigate = useNavigate();
    const session = useSession();                // ✅ gets session
    const supabaseClient = useSupabaseClient();  // optional but recommended
    const user = session?.user || null;
    const [mistakes, setMistakes] = useState<Mistake[]>([]);
    const mistakeCount = mistakes.length;
    const isClean = mistakeCount === 0;      // current user

    const [loading, setLoading] = useState(mistakes.length === 0);
    const [animate, setAnimate] = useState(false);
    const prevCountRef = useRef<number>(mistakeCount);

    const getInsightSentence = (m: Mistake) => {
        if (!m.mistake_reason) {
            return "Kindly select a reason for each mistake  this helps you learn faster and gives clear guidance.";
        }

        const { mistake_reason, times_wrong } = m;
        switch (mistake_reason) {
            case "Rushed":
                return times_wrong >= 2
                    ? "You've rushed similar questions a few times  slow down a bit and focus on each detail, you got this!"
                    : "Looks like you went a bit fast on this one  take a breath and read carefully next time.";
            case "Concept gap":
                return times_wrong >= 2
                    ? "You’ve struggled with this concept multiple times  spend a bit more time on this topic, it will really pay off!"
                    : "This one seems tricky  reviewing related notes can help clarify the concept.";
            case "Misread question":
                return times_wrong >= 2
                    ? "You keep misreading similar questions  slow down and underline key points; attention to detail matters."
                    : "Easy to miss small details read each question carefully, you’ll get it!";
            case "Guess":
                return times_wrong >= 2
                    ? "You guessed again  don’t worry! Try breaking the question down logically; it helps a lot."
                    : "It seems like you guessed here  try reasoning through your answer next time.";
            default:
                return "Reflect on this mistake to improve next time you’re learning!";
        }
    };

    const getProgressSignal = (m: Mistake) => {
        if (m.resolved) return "Resolved quickly";
        if (m.times_wrong >= 2) return "Repeated mistake";
        return "Needs review";
    };


    const fetchMistakes = async () => {
        if (!user) return; // ✅ stop if not logged in

        const { data, error } = await supabaseClient
            .from("user_mistakes")
            .select("id, mistake_reason, times_wrong, resolved")
            .eq("user_id", user.id)
            .eq("resolved", false)
            .order("last_wrong_at", { ascending: false });
        if (error) console.error("Error fetching mistakes:", error);
        else {
            const count = data?.length || 0;
            if (count !== prevCountRef.current) setAnimate(true);
            prevCountRef.current = count;
            setMistakes(data || []);
            localStorage.setItem("mistakes", JSON.stringify(data || []));
            localStorage.setItem("mistakesDate", new Date().toDateString());
        }

        setLoading(false);
    };
    useEffect(() => {
        const stored = localStorage.getItem("mistakes");
        const storedDate = localStorage.getItem("mistakesDate");
        const today = new Date().toDateString();

        if (stored && storedDate === today) {
            setMistakes(JSON.parse(stored));
        }
    }, []);
    useEffect(() => {
        if (!user) return;

        fetchMistakes();

        const channel = supabase
            .channel("public:user_mistakes")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "user_mistakes"
                },
                () => {
                    fetchMistakes();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.id]);

    const baseCardClass =
        "cursor-pointer rounded-xl p-2 flex flex-col sm:flex-row items-start sm:items-center justify-between transition-all select-none";
    const themedCardClass = `${baseCardClass} bg-gray-100 dark:bg-gray-900 mt-4 shadow-md`;
    const handleAnimationEnd = () => setAnimate(false);


    return (
        <motion.div
            whileHover={{ scale: 1.01, translateY: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate("/my-mistakes")}
            className={`
            relative overflow-hidden cursor-pointer p-5 rounded-xl border-0 transition-all duration-300
            ${isClean
                    ? "bg-emerald-50/50 dark:bg-emerald-500/5 border-0  shadow-emerald-500/5"
                    : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none"
                }
        `}
        >
            {/* Background Decorative Element */}
            <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl opacity-20 ${isClean ? 'bg-emerald-400' : 'bg-rose-400'}`} />

            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-5">

                {/* --- ICON SECTION --- */}
                <div className="shrink-0">
                    {isClean ? (
                        <div className="h-16 w-16 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
                            <ShieldCheck size={32} />
                        </div>
                    ) : (
                        <div className="relative">
                            <span className="absolute inset-0 rounded-2xl bg-rose-500 animate-ping opacity-20" />
                            <div className="relative h-16 w-16 rounded-2xl bg-rose-600 flex items-center justify-center text-white shadow-lg shadow-rose-500/30">
                                <AlertCircle size={32} />
                            </div>
                        </div>
                    )}
                </div>

                {/* --- CONTENT SECTION --- */}
                <div className="flex-1 space-y-1">
                    {isClean ? (
                        <div className="space-y-1">
                            <h2 className="text-xl font-black tracking-tight text-emerald-800 dark:text-emerald-400 uppercase">
                                Clinical Excellence
                            </h2>
                            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-500/80">
                                Zero unresolved mistakes. Your performance is optimal! 🎉
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-500/20 text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest">
                                        Action Required
                                    </span>
                                </div>
                                <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white uppercase">
                                    {mistakeCount} <span className="text-slate-400">Weak Points Found</span>
                                </h2>
                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                    Practice makes permanent. Let's fix these clinical errors.
                                </p>
                            </div>

                            {/* Mistakes Preview Snippets */}
                            <div className="hidden md:grid grid-cols-1 gap-2 border-l-2 border-slate-100 dark:border-slate-800 pl-4 py-1">
                                {mistakes.slice(0, 2).map((m) => (
                                    <div key={m.id} className="flex items-center gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-400 group">
                                        <Target size={12} className="text-rose-500" />
                                        <span className="truncate opacity-80 group-hover:opacity-100">{getInsightSentence(m)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* --- ACTION BUTTON --- */}
                <div className="w-full sm:w-auto pt-2 sm:pt-0">
                    <div className={`
                    flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all
                    ${isClean
                            ? "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                            : "bg-slate-900 dark:bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                        }
                `}>
                        {isClean ? "History" : "Fix Now"}
                        <ChevronRight size={14} className={isClean ? "" : "group-hover:translate-x-1 transition-transform"} />
                    </div>
                </div>
            </div>
        </motion.div>

    );
}
