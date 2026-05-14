"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUnitQuestionCount } from "@/hooks/useUnitQuestionCount";
import { useNavigate, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Star, BookOpen, ChevronRight, Zap } from 'lucide-react';
interface UnitBreakdownProps {
    nclexUnitCodes?: string[];
}

export function UnitBreakdown({ nclexUnitCodes = [] }: UnitBreakdownProps) {
    const navigate = useNavigate();
    const { data: unitCounts = [], loading, incrementCount } = useUnitQuestionCount();

    const [hasLocalCache, setHasLocalCache] = useState(false);

    // Load cached counts if available
    useEffect(() => {
        const cachedCounts = localStorage.getItem("cachedCounts");
        if (cachedCounts) setHasLocalCache(true);
    }, []);

    // Realtime subscription for question count updates
    useEffect(() => {
        const channel = supabase
            .channel("question_changes_channel")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "questions" },
                async () => {
                    const newCounts = await incrementCount("");
                    const saveObj: Record<string, number> = {};
                    newCounts?.forEach((u) => (saveObj[u.unit_code] = u.count));
                    localStorage.setItem("cachedCounts", JSON.stringify(saveObj));
                }
            )
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [incrementCount]);

    // Get question count with offline caching
    const getQuestionCount = (code: string) => {
        if (unitCounts && unitCounts.length > 0) {
            const count = unitCounts.find(u => u.unit_code?.trim().toLowerCase() === code.trim().toLowerCase())?.count || 0;
            const cached = JSON.parse(localStorage.getItem("cachedCounts") || "{}");
            cached[code] = count;
            localStorage.setItem("cachedCounts", JSON.stringify(cached));
            return count;
        }
        const cached = JSON.parse(localStorage.getItem("cachedCounts") || "{}");
        return cached[code] || 0;
    };

    return (

        < Card className="w-full rounded-3xl overflow-hidden border-0 bg-slate-50/50 dark:bg-slate-900 backdrop-blur-md shadow-sm mt-1" >
            <CardHeader className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/5">
                <div className="space-y-1">
                    <CardTitle className="text-xl font-black tracking-tight flex items-center gap-2">
                        <Zap className="w-5 h-5 text-blue-500" />
                        Curriculum Breakdown
                    </CardTitle>
                    <CardDescription className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        Click any unit below to access its specific question bank and start practicing.
                    </CardDescription>
                </div>
                <Button
                    asChild
                    className="rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                >
                    <Link to="/Medrae-quizzes" className="flex items-center gap-2">
                        Enter Quiz Hub <ChevronRight className="w-4 h-4" />
                    </Link>
                </Button>
            </CardHeader>

            <CardContent className="p-6 space-y-8">
                {unitCounts.length > 0 ? (
                    <>
                        {/* --- NCLEX CATEGORY (Premium Look) --- */}
                        <section>
                            <div className="flex items-center gap-2 mb-4">
                                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                                <h3 className="text-xs font-black uppercase tracking-[0.15em] text-amber-600 dark:text-amber-400">
                                    NCLEX Client Needs Categories
                                </h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {unitCounts
                                    .filter(u => nclexUnitCodes.includes(u.unit_code?.trim() || ""))
                                    .map(unit => (
                                        <div
                                            key={unit.unit_code}
                                            onClick={() => navigate("/Medrae-quizzes")}
                                            className="group relative p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 shadow-sm hover:shadow-md hover:border-amber-500/30 transition-all cursor-pointer overflow-hidden"
                                        >
                                            <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity">
                                                <Star className="w-12 h-12 text-amber-500" />
                                            </div>
                                            <div className="flex justify-between items-start gap-3">
                                                <div className="space-y-1">
                                                    <p className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                                                        {unit.unit}
                                                    </p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{unit.unit_code}</p>
                                                </div>
                                                <Badge className="bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-0 font-bold">
                                                    {getQuestionCount(unit.unit_code)} Qs
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </section>

                        {/* --- NCK CATEGORIES (Paper Grouped) --- */}
                        {["P1", "P2"].map((paper) => (
                            <section key={paper}>
                                <div className="flex items-center gap-2 mb-4">
                                    <BookOpen className={`w-4 h-4 ${paper === "P1" ? "text-blue-500" : "text-indigo-500"}`} />
                                    <h3 className={`text-xs font-black uppercase tracking-[0.15em] ${paper === "P1" ? "text-blue-600 dark:text-blue-400" : "text-indigo-600 dark:text-indigo-400"}`}>
                                        NCK Licensing Exam - {paper === "P1" ? "Paper I" : "Paper II"}
                                    </h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {unitCounts
                                        .filter(u => !nclexUnitCodes.includes(u.unit_code?.trim() || ""))
                                        .filter((_, idx, arr) => {
                                            const half = Math.ceil(arr.length / 2);
                                            return paper === "P1" ? idx < half : idx >= half;
                                        })
                                        .map(unit => (
                                            <div
                                                key={unit.unit_code}
                                                onClick={() => navigate("/Medrae-quizzes")}
                                                className={`group p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 shadow-sm hover:shadow-md transition-all cursor-pointer border-l-4 ${paper === "P1" ? "hover:border-l-blue-500" : "hover:border-l-indigo-500"}`}
                                            >
                                                <div className="flex justify-between items-center gap-3">
                                                    <div className="space-y-1">
                                                        <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                                                            {unit.unit}
                                                        </p>
                                                        <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">{unit.unit_code}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className={`text-xs font-black ${paper === "P1" ? "text-blue-600" : "text-indigo-600"}`}>
                                                            {getQuestionCount(unit.unit_code)}
                                                        </span>
                                                        <p className="text-[8px] font-bold text-slate-400 uppercase">Questions</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </section>
                        ))}
                    </>
                ) : loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-3xl">
                        <p className="text-sm text-slate-500 font-medium">No unit data available at this time.</p>
                    </div>
                )}
            </CardContent>

            {/* Footer Call-to-action */}
            <div className="px-6 py-4 bg-slate-100 dark:bg-white/5 border-t border-slate-200 dark:border-white/5">
                <p className="text-[10px] text-center font-bold text-slate-500 uppercase tracking-widest">
                    Data synced with current NCK & NCLEX Exam Syllabi
                </p>
            </div>
        </Card >
    );
}
