"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, Lock, CheckCircle2, Zap } from "lucide-react";
import { motion } from "framer-motion";

export interface OneMonthTierCardProps {
    tier: {
        key: string;
        name: string;
        priceLabel: string;
        sub: string;
        blurb: string;
        features: string[];
        ctaLabel: string;
    };
    index: number;
    hasActivePlan: boolean;
    hasAgreedToTerms: boolean;
    showTermsWarning: boolean;
    loading: boolean;
    onSelect: () => void;
    onOpenInfo: () => void;
}

export function OneMonthTierCard({
    tier,
    index,
    hasActivePlan,
    hasAgreedToTerms,
    showTermsWarning,
    loading,
    onSelect,
    onOpenInfo,
}: OneMonthTierCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: index * 0.05 }}
            className="h-full"
        >
            <Card className="h-full rounded-3xl border-0 bg-sky-500/[0.06] flex flex-col">
                <CardContent className="p-6 md:p-7 flex flex-col flex-1 gap-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-sky-500/15 flex items-center justify-center">
                                <Zap className="w-4 h-4 text-sky-500" strokeWidth={2.5} />
                            </div>
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                                {tier.sub}
                            </p>
                        </div>
                        <h3 className="text-xl font-semibold tracking-tight">{tier.name}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{tier.blurb}</p>
                    </div>

                    <div className="space-y-1">
                        <span className="text-3xl md:text-4xl font-semibold tracking-tight tabular-nums">
                            {tier.priceLabel}
                        </span>
                        <p className="text-xs text-muted-foreground">Billed once. No auto renewal.</p>
                    </div>

                    <div className="space-y-3 flex-1">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            What you get
                        </p>
                        <ul className="space-y-2.5">
                            {tier.features.map((f, i) => (
                                <li key={i} className="flex items-start gap-2.5 text-sm">
                                    <div className="mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0 bg-sky-500/15">
                                        <Check className="h-2.5 w-2.5 text-sky-600 dark:text-sky-400" strokeWidth={3} />
                                    </div>
                                    <span className="leading-relaxed text-foreground/90">{f}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="space-y-3 pt-1">
                        <Button
                            onClick={onSelect}
                            disabled={loading || hasActivePlan}
                            className="w-full h-11 rounded-xl text-sm font-semibold bg-sky-600 hover:bg-sky-700 text-white"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Processing
                                </>
                            ) : hasActivePlan ? (
                                <>
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    Active
                                </>
                            ) : (
                                <>
                                    <Lock className="mr-2 h-4 w-4" />
                                    {tier.ctaLabel}
                                </>
                            )}
                        </Button>

                        {showTermsWarning && !hasAgreedToTerms && (
                            <p className="text-[11px] text-rose-500 text-center">
                                Accept terms above to continue.
                            </p>
                        )}

                        <button
                            onClick={onOpenInfo}
                            className="w-full text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                        >
                            See full details
                        </button>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}