"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Minus } from "lucide-react";
import { motion } from "framer-motion";

export interface FreeTierCardProps {
    tier: {
        key: string;
        name: string;
        priceLabel: string;
        sub: string;
        blurb: string;
        features: string[];
        excluded: string[];
        ctaLabel: string;
    };
    index: number;
    onOpenInfo: () => void;
}

export function FreeTierCard({ tier, index, onOpenInfo }: FreeTierCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: index * 0.05 }}
            className="h-full"
        >
            <Card className="h-full rounded-3xl border-0 bg-muted/40 flex flex-col">
                <CardContent className="p-6 md:p-7 flex flex-col flex-1 gap-6">
                    <div className="space-y-1">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {tier.sub}
                        </p>
                        <h3 className="text-xl font-semibold tracking-tight">{tier.name}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{tier.blurb}</p>
                    </div>

                    <div className="space-y-1">
                        <span className="text-3xl md:text-4xl font-semibold tracking-tight tabular-nums">
                            {tier.priceLabel}
                        </span>
                        <p className="text-xs text-muted-foreground">No card needed. No expiry.</p>
                    </div>

                    <div className="space-y-3 flex-1">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Included
                        </p>
                        <ul className="space-y-2.5">
                            {tier.features.map((f, i) => (
                                <li key={i} className="flex items-start gap-2.5 text-sm">
                                    <div className="mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0 bg-foreground/5">
                                        <Check className="h-2.5 w-2.5 text-foreground/70" strokeWidth={3} />
                                    </div>
                                    <span className="leading-relaxed text-foreground/90">{f}</span>
                                </li>
                            ))}
                        </ul>

                        {tier.excluded.length > 0 && (
                            <>
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground pt-2">
                                    Not included
                                </p>
                                <ul className="space-y-2">
                                    {tier.excluded.map((f, i) => (
                                        <li key={`x-${i}`} className="flex items-start gap-2.5 text-sm opacity-50">
                                            <div className="mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0 bg-muted">
                                                <Minus className="h-2.5 w-2.5 text-muted-foreground" strokeWidth={3} />
                                            </div>
                                            <span className="leading-relaxed line-through">{f}</span>
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}
                    </div>

                    <div className="space-y-2 pt-1">
                        <Button disabled variant="outline" className="w-full h-11 rounded-xl text-sm font-semibold">
                            {tier.ctaLabel}
                        </Button>
                        <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
                            You are already on this plan by default.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}