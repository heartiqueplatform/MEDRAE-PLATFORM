"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUnitQuestionCount } from "@/hooks/useUnitQuestionCount";
import { useNavigate, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

interface UnitBreakdownProps {
    nclexUnitCodes?: string[];
}

export function UnitBreakdown({ nclexUnitCodes = [] }: UnitBreakdownProps) {
    const navigate = useNavigate();
    const { data: unitCounts = [], loading, incrementCount } = useUnitQuestionCount();

    // Local cache state
    const [cachedCounts, setCachedCounts] = useState<Record<string, number>>({});
    const [isHydrated, setIsHydrated] = useState(false); // Track if localStorage has been loaded

    // Load local cache immediately on mount
    useEffect(() => {
        const saved = JSON.parse(localStorage.getItem("cachedCounts") || "{}");
        setCachedCounts(saved);
        setIsHydrated(true);
    }, []);

    // Realtime subscription to update counts in background
    useEffect(() => {
        const channel = supabase
            .channel("question_changes_channel")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "questions" },
                async () => {
                    const newCounts = await incrementCount("");
                    if (!newCounts) return;
                    const saveObj: Record<string, number> = {};
                    newCounts.forEach(u => (saveObj[u.unit_code] = u.count));
                    localStorage.setItem("cachedCounts", JSON.stringify(saveObj));
                    setCachedCounts(saveObj);
                }
            )
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [incrementCount]);

    // Get question count from live data first, else cached
    const getQuestionCount = (code: string) => {
        // Prefer live data if available
        if (unitCounts.length > 0) {
            const unit = unitCounts.find(
                u => u.unit_code?.trim().toLowerCase() === code.trim().toLowerCase()
            );
            return unit?.count || 0; // ✅ just return the value, no state update here
        }
        // Fallback to cached counts
        return cachedCounts[code] || 0; // ✅ safe, only reading state
    };

    // Show skeleton only if there’s no cached data yet
    const showSkeleton = !isHydrated || (loading && Object.keys(cachedCounts).length === 0);

    return (
        <Card className="rounded-none sm:rounded-md shadow-none border-0 bg-white dark:bg-gray-900">
            <CardHeader className="p-2 flex flex-row items-center justify-between">
                <div>
                    <CardTitle>QUIZZES NCK UNIT BREAKDOWN & NCLEX CLIENT NEEDS CATEGORY</CardTitle>
                    <CardDescription>
                        All units and their available question counts. Click the tab to start practicing instantly.
                    </CardDescription>
                </div>
                <Button
                    asChild
                    className="bg-blue-500 hover:bg-green-500 text-white transition-all transform hover:scale-105 shadow-none-md hover:shadow-none"
                >
                    <Link to="/Medrae-quizzes">Quizzes</Link>
                </Button>
            </CardHeader>

            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {!showSkeleton ? (
                    <>
                        {/* NCLEX Units */}
                        {Object.keys(cachedCounts)
                            .filter(code => nclexUnitCodes.includes(code))
                            .map(code => (
                                <div
                                    key={code}
                                    className="p-2 rounded-none sm:rounded-md flex items-center justify-between bg-white dark:bg-gray-900 shadow-none border-0 cursor-pointer hover:scale-105 transform transition-all"
                                    onClick={() => navigate("/Medrae-quizzes")}
                                >
                                    <div className="flex items-center gap-1">
                                        <span className="text-yellow-400 font-bold">★</span>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{code}</p>
                                            <p className="text-xs text-muted-foreground">{code}</p>
                                        </div>
                                    </div>
                                    <Badge className="bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                                        {getQuestionCount(code)} Qs
                                    </Badge>
                                </div>
                            ))}

                        {/* NCK Units grouped by Paper */}
                        {["P1", "P2"].map((paper) => {
                            const codes = Object.keys(cachedCounts).filter(code => !nclexUnitCodes.includes(code));
                            const half = Math.ceil(codes.length / 2);
                            const filteredCodes = paper === "P1" ? codes.slice(0, half) : codes.slice(half);

                            return filteredCodes.map(code => (
                                <div
                                    key={code}
                                    className="p-2 rounded-none sm:rounded-md flex items-center justify-between bg-white dark:bg-gray-900 shadow-none border-0 cursor-pointer hover:scale-105 transform transition-all"
                                    onClick={() => navigate("/Medrae-quizzes")}
                                >
                                    <div className="flex flex-col">
                                        <div className="text-sm font-medium flex items-center gap-2">
                                            <Badge
                                                className={`text-white text-xs ${paper === "P1" ? "bg-blue-500" : "bg-purple-500"}`}
                                            >
                                                {paper} NCK
                                            </Badge>
                                            {code}
                                        </div>
                                        <p className="text-xs text-muted-foreground">{code}</p>
                                    </div>
                                    <Badge
                                        className={`text-white text-xs ${paper === "P1" ? "bg-blue-500" : "bg-purple-500"}`}
                                    >
                                        {getQuestionCount(code)} Qs
                                    </Badge>
                                </div>
                            ));
                        })}
                    </>
                ) : (
                    Array.from({ length: 6 }).map((_, idx) => (
                        <div
                            key={idx}
                            className="p-4 rounded-none sm:rounded-md flex flex-col justify-between animate-pulse bg-white dark:bg-gray-900 min-h-[80px] shadow-none border-0"
                        >
                            <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded-full w-3/4 mb-2"></div>
                            <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded-full w-1/2"></div>
                        </div>
                    ))
                )}
            </CardContent>
        </Card>
    );
}
