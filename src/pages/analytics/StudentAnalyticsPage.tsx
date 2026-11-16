// pages/analytics/StudentAnalyticsPage.tsx
"use client";

import { useEffect, useState } from "react";
import { useUser } from "@supabase/auth-helpers-react";
import { supabase } from "@/lib/supabaseClient";
import { BarChart3, TrendingUp, Award, Target } from "lucide-react";
import { toast } from "sonner";

// Placeholder — real analytics to be built separately.
// DO NOT reuse ExamReady here — that's tutor exam management, not student analytics.

export default function StudentAnalyticsPage() {
    const user = useUser();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        // TODO: fetch student analytics — quiz attempts, weak topics, streak, etc.
        setLoading(false);
    }, [user]);

    return (
        <div className="max-w-3xl mx-auto px-4 py-3 space-y-3">
            <section className="rounded-2xl bg-white dark:bg-[#161b22] p-6 text-center">
                <BarChart3
                    className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600 mb-2"
                    strokeWidth={1.5}
                />
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Student Analytics
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Your progress, weak topics, and study stats will appear here
                </p>
            </section>
        </div>
    );
}