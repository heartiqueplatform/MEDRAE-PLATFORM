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
        <Card className="rounded-none sm:rounded-md shadow-none border-0 bg-white dark:bg-gray-900">
            <CardHeader className="flex flex-row items-center justify-between">
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
                {unitCounts.length > 0 ? (
                    <>

                        {/* NCLEX Units */}
                        {unitCounts
                            .filter(u => nclexUnitCodes.includes(u.unit_code?.trim() || ""))
                            .map(unit => (
                                <div
                                    key={unit.unit_code}
                                    className="p-2 rounded-none sm:rounded-md flex items-center justify-between bg-white dark:bg-gray-900 shadow-none border-0 cursor-pointer hover:scale-105 transform transition-all"
                                    onClick={() => navigate("/Medrae-quizzes")}
                                >
                                    <div className="flex items-center gap-1">
                                        {/* ⭐ Star badge for NCLEX */}
                                        <span className="text-yellow-400 font-bold">★</span>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{unit.unit}</p>
                                            <p className="text-xs text-muted-foreground">{unit.unit_code}</p>
                                        </div>
                                    </div>
                                    <Badge className="bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                                        {getQuestionCount(unit.unit_code)} Qs
                                    </Badge>
                                </div>
                            ))}

                        {/* NCK Units grouped by Paper */}
                        {["P1", "P2"].map((paper) =>
                            unitCounts
                                .filter(u => !nclexUnitCodes.includes(u.unit_code?.trim() || ""))
                                .filter((_, idx, arr) => {
                                    const half = Math.ceil(arr.length / 2);
                                    return paper === "P1" ? idx < half : idx >= half;
                                })
                                .map(unit => (
                                    <div
                                        key={unit.unit_code}
                                        className="p-2 rounded-none sm:rounded-md flex items-center justify-between bg-white dark:bg-gray-900 shadow-none border-0 cursor-pointer hover:scale-105 transform transition-all"
                                        onClick={() => navigate("/Medrae-quizzes")}
                                    >
                                        <div className="flex flex-col">
                                            <p className="text-sm font-medium flex items-center gap-2">
                                                <Badge
                                                    className={`text-white text-xs ${paper === "P1" ? "bg-blue-500" : "bg-purple-500"
                                                        }`}
                                                >
                                                    {paper === "P1" ? "P1 NCK" : "P2 NCK"}
                                                </Badge>
                                                {unit.unit}
                                            </p>
                                            <p className="text-xs text-muted-foreground">{unit.unit_code}</p>
                                        </div>
                                        <Badge
                                            className={`text-white text-xs ${paper === "P1" ? "bg-blue-500" : "bg-purple-500"
                                                }`}
                                        >
                                            {getQuestionCount(unit.unit_code)} Qs
                                        </Badge>
                                    </div>
                                ))
                        )}

                    </>
                ) : loading ? (
                    Array.from({ length: 6 }).map((_, idx) => (
                        <div
                            key={idx}
                            className="p-4 rounded-none sm:rounded-md flex flex-col justify-between animate-pulse bg-white dark:bg-gray-900 min-h-[80px] shadow-none border-0"
                        >
                            <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded-full w-3/4 mb-2"></div>
                            <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded-full w-1/2"></div>
                        </div>
                    ))
                ) : (
                    <p className="text-sm text-muted-foreground">No unit data available.</p>
                )}
            </CardContent>
        </Card>
    );
}
