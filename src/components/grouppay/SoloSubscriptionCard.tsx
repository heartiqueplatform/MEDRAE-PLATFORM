// src/components/grouppay/SoloSubscriptionCard.tsx

import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, ArrowRight, User, ChevronLeft, ChevronRight } from 'lucide-react';

interface SoloSubscriptionCardProps {
    /** Current signed-in role, used for the caption. */
    role?: string | null;
    /** Optional pre-computed price for the current role + duration. */
    priceLabel?: string;
}

/**
 * Psychological nudge shown on the GroupPay home page for users who
 * might prefer to subscribe individually instead of joining a group.
 *
 * Deliberately neutral: no gradients, no colored accents — one uniform
 * muted surface so it reads as a quiet alternative, not a competing CTA.
 */
export function SoloSubscriptionCard({
    role,
    priceLabel,
}: SoloSubscriptionCardProps) {
    const navigate = useNavigate();

    return (
        <Card className="border-0 rounded-2xl bg-muted/40 dark:bg-muted/20 shadow-none">
            <CardContent className="p-4 md:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Icon */}
                <div className="h-11 w-11 rounded-xl bg-background flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-muted-foreground" />
                </div>

                {/* Copy */}
                <div className="flex-1 min-w-0">
                    <h3 className="text-sm md:text-base font-semibold text-foreground">
                        Prefer to go solo?
                    </h3>
                    <p className="text-xs md:text-sm text-muted-foreground leading-relaxed mt-0.5">
                        No group, no ties, no sharing. Subscribe individually
                        {role ? ` as a ${role}` : ''} and unlock full premium access
                        on your own terms.
                        {priceLabel ? ` From ${priceLabel}.` : ''}
                    </p>
                </div>

                {/* CTA */}
                <Button
                    type="button"
                    onClick={() => navigate('/subscription')}
                    className="gap-2 h-10 px-4 rounded-xl border-0 flex-shrink-0
                        bg-foreground text-background
                        hover:bg-foreground/90
                        font-medium text-sm"
                >
                    <CreditCard className="w-4 h-4" />
                    Subscribe individually
                    <ChevronRight className="w-4 h-4" />
                </Button>
            </CardContent>
        </Card>
    );
}