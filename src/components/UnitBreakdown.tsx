"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Calendar, Target, TrendingUp, Award, Clock, Brain, ChevronRight, Zap } from 'lucide-react';

// ============================================
// NCK STUDY TIPS
// ============================================

const studyTips = [
    { icon: Calendar, title: "Daily Practice", desc: "30-45 mins on 1 unit daily" },
    { icon: Target, title: "Weak Areas First", desc: "Identify & strengthen weak units" },
    { icon: TrendingUp, title: "Track Progress", desc: "Monitor scores & completion" },
    { icon: Award, title: "Mock Exams", desc: "Use practice papers for simulation" },
    { icon: Clock, title: "Time Management", desc: "Practice with timed sessions" },
    { icon: Brain, title: "Active Recall", desc: "Test without notes" }
];

// ============================================
// MAIN COMPONENT - NO DATA FETCHING
// ============================================

export function UnitBreakdown() {
    const navigate = useNavigate();

    const handleNavigate = () => {
        navigate("/Medrae-quizzes");
    };

    return (
        <div className="w-full px-0 sm:px-0">
            <Card className="w-full rounded-none sm:rounded-2xl border-0 sm:border bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-gray-800/30 dark:to-gray-800/20 shadow-none sm:shadow-sm">
                <CardHeader className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                            <CardTitle className="text-lg sm:text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                                <Zap className="w-5 h-5 text-blue-500" />
                                <span>NCK Exam Success Tips</span>
                            </CardTitle>
                            <CardDescription className="text-xs text-gray-600 dark:text-gray-400">
                                Smart strategies to ace your nursing exams
                            </CardDescription>
                        </div>
                        <Button
                            onClick={handleNavigate}
                            className="rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                        >
                            Start Practicing <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="p-4 sm:p-6 pt-0">
                    {/* Study Tips Grid - All cards are tappable */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
                        {studyTips.map((tip, index) => {
                            const Icon = tip.icon;
                            return (
                                <div
                                    key={index}
                                    onClick={handleNavigate}
                                    className="group p-3 sm:p-4 bg-white dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700/50 hover:shadow-md transition-all hover:border-blue-200 dark:hover:border-blue-800 text-center cursor-pointer active:scale-[0.97]"
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            handleNavigate();
                                        }
                                    }}
                                >
                                    <div className="flex flex-col items-center gap-1.5">
                                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg group-hover:scale-110 transition-transform">
                                            <Icon className="w-4 h-4 text-blue-500" />
                                        </div>
                                        <p className="text-[10px] sm:text-xs font-bold text-gray-700 dark:text-gray-200 leading-tight">
                                            {tip.title}
                                        </p>
                                        <p className="text-[8px] sm:text-[9px] text-gray-500 dark:text-gray-400 leading-tight">
                                            {tip.desc}
                                        </p>
                                        <ChevronRight className="w-3 h-3 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Quick Stats - Static */}
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700/50">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
                            <p className="text-[10px] font-medium text-gray-600 dark:text-gray-400">
                                💡 Tip: Consistent daily practice = Better retention = Exam success
                            </p>
                            <div className="flex items-center gap-3">
                                <span className="text-[9px] text-gray-400 uppercase tracking-wider">
                                    NCK & NCLEX Prep
                                </span>
                                <span className="w-px h-4 bg-gray-300 dark:bg-gray-600" />
                                <span className="text-[9px] text-gray-400 uppercase tracking-wider">
                                    Updated Syllabus
                                </span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}