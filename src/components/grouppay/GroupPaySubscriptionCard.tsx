// src/components/grouppay/GroupPaySubscriptionCard.tsx

import React from "react";
import { useNavigate } from "react-router-dom";
import {
    Users,
    Wallet,
    PiggyBank,
    Sparkles,
    ArrowRight,
    CheckCircle,
    Shield,
    Clock,
    Crown,
    Smartphone,
    Gift,
    Rocket,
    Users2,
    DollarSign,
    GraduationCap,
    TrendingUp,
    Star,
    ChevronRight,
    Zap
} from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface GroupPaySubscriptionCardProps {
    className?: string;
    compact?: boolean;
}

export function GroupPaySubscriptionCard({ className = "", compact = false }: GroupPaySubscriptionCardProps) {
    const navigate = useNavigate();

    const handleClick = () => {
        navigate('/grouppay');
    };

    if (compact) {
        return (
            <Card
                className={`group cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-2 border-green-200 dark:border-green-800/50 overflow-hidden ${className}`}
                onClick={handleClick}
            >
                <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-100 to-blue-100 dark:from-green-900/30 dark:to-blue-900/30 flex items-center justify-center">
                                <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                                    GroupPay
                                </h4>
                                <Badge className="bg-gradient-to-r from-green-500 to-blue-500 text-white text-[8px] font-black uppercase tracking-wider border-0">
                                    Save 50%
                                </Badge>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                                Study together. Pay together. Learn together.
                            </p>
                            <div className="flex items-center gap-3 mt-2 text-xs">
                                <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
                                    <DollarSign className="w-3 h-3" />
                                    KSh 99/member
                                </span>
                                <span className="text-slate-400 line-through">KSh 199</span>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="mt-2 p-0 h-auto text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-medium group/btn"
                            >
                                Learn more
                                <ArrowRight className="w-3 h-3 ml-1 transition-transform group-hover/btn:translate-x-1" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card
            className={`group cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-2 border-green-200 dark:border-green-800/50 overflow-hidden relative ${className}`}
            onClick={handleClick}
        >
            {/* Decorative gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-green-50/30 via-blue-50/20 to-purple-50/10 dark:from-green-950/10 dark:via-blue-950/5 dark:to-purple-950/5 pointer-events-none" />

            {/* Sparkle decoration */}
            <div className="absolute -top-2 -right-2">
                <Sparkles className="w-8 h-8 text-green-500/20 dark:text-green-400/20" />
            </div>

            <CardHeader className="relative pb-2">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-100 to-blue-100 dark:from-green-900/30 dark:to-blue-900/30 flex items-center justify-center">
                            <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                                GroupPay
                            </CardTitle>
                            <p className="text-xs text-muted-foreground">
                                Study Groups • Premium Access • Savings
                            </p>
                        </div>
                    </div>
                    <Badge className="bg-gradient-to-r from-green-500 to-blue-500 text-white text-[10px] font-black uppercase tracking-wider border-0">
                        <Zap className="w-3 h-3 mr-1" />
                        Save 50%
                    </Badge>
                </div>
            </CardHeader>

            <CardContent className="relative space-y-4">
                {/* What is GroupPay */}
                <div className="bg-slate-50 dark:bg-gray-800/50 rounded-lg p-3 border border-slate-200 dark:border-gray-700">
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        <span className="font-semibold text-slate-900 dark:text-white">What is GroupPay?</span>
                        {" "}Form a study group of 10+ nursing students and get premium access for everyone at just
                        <span className="font-bold text-green-600 dark:text-green-400"> KSh 99</span> per member
                        instead of <span className="line-through text-slate-400">KSh 199</span> individually.
                    </p>
                </div>

                {/* Key Benefits - Quick View */}
                <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                            <CheckCircle className="w-3 h-3 text-green-600 dark:text-green-400" />
                        </div>
                        <span className="text-xs text-slate-600 dark:text-slate-400">Save 50%</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                            <Clock className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="text-xs text-slate-600 dark:text-slate-400">Instant Access</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                            <Users2 className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                        </div>
                        <span className="text-xs text-slate-600 dark:text-slate-400">Group Learning</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                            <Smartphone className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                        </div>
                        <span className="text-xs text-slate-600 dark:text-slate-400">M-Pesa Payments</span>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-2 p-2 bg-white dark:bg-gray-900/50 rounded-lg border border-slate-200 dark:border-gray-700">
                    <div className="text-center">
                        <p className="text-xs font-bold text-green-600 dark:text-green-400">KSh 99</p>
                        <p className="text-[8px] text-slate-500 dark:text-slate-400">Per Member</p>
                    </div>
                    <div className="text-center border-l border-slate-200 dark:border-gray-700">
                        <p className="text-xs font-bold text-blue-600 dark:text-blue-400">10+</p>
                        <p className="text-[8px] text-slate-500 dark:text-slate-400">Members Required</p>
                    </div>
                    <div className="text-center border-l border-slate-200 dark:border-gray-700">
                        <p className="text-xs font-bold text-purple-600 dark:text-purple-400">100%</p>
                        <p className="text-[8px] text-slate-500 dark:text-slate-400">Premium Access</p>
                    </div>
                </div>
            </CardContent>

            <CardFooter className="relative">
                <Button
                    className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all group/btn"
                >
                    <span className="flex items-center">
                        Explore GroupPay
                        <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover/btn:translate-x-1" />
                    </span>
                </Button>
            </CardFooter>
        </Card>
    );
}