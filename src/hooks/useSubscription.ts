// hooks/useSubscription.ts
import { useEffect, useState } from "react";
import { useSession } from "@supabase/auth-helpers-react";
import { supabase } from "@/lib/supabaseClient";

export interface SubscriptionStatus {
    isPremium: boolean;        // Can access ANY premium content
    planType: 'pro' | 'premium' | 'free' | null;
    isActive: boolean;
    expiresAt: Date | null;
    loading: boolean;
    daysRemaining: number | null;
}

export function useSubscription(): SubscriptionStatus {
    const session = useSession();
    const user = session?.user;
    const userId = user?.id;

    const [status, setStatus] = useState<SubscriptionStatus>({
        isPremium: false,
        planType: null,
        isActive: false,
        expiresAt: null,
        loading: true,
        daysRemaining: null,
    });

    useEffect(() => {
        async function checkSubscription() {
            if (!userId) {
                setStatus(prev => ({ ...prev, loading: false, planType: 'free' }));
                return;
            }

            try {
                const { data: sub, error: subError } = await supabase
                    .from("subscriptions")
                    .select("plan_type, is_active, expires_at")
                    .eq("user_id", userId)
                    .maybeSingle();

                if (sub && !subError && sub.is_active) {
                    const now = new Date();
                    const expiry = sub.expires_at ? new Date(sub.expires_at) : null;

                    const isPaidTier = sub.plan_type === 'pro' || sub.plan_type === 'premium';
                    const isNotExpired = expiry ? expiry > now : true;

                    // Calculate days remaining
                    let daysRemaining = null;
                    if (expiry && expiry > now) {
                        const diffTime = expiry.getTime() - now.getTime();
                        daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    }

                    const isPremium = isPaidTier && isNotExpired;

                    setStatus({
                        isPremium,
                        planType: isPremium ? sub.plan_type as 'pro' | 'premium' : 'free',
                        isActive: sub.is_active,
                        expiresAt: expiry,
                        daysRemaining,
                        loading: false,
                    });
                } else {
                    setStatus({
                        isPremium: false,
                        planType: 'free',
                        isActive: false,
                        expiresAt: null,
                        daysRemaining: null,
                        loading: false,
                    });
                }
            } catch (error) {
                console.error("Error checking subscription:", error);
                setStatus({
                    isPremium: false,
                    planType: 'free',
                    isActive: false,
                    expiresAt: null,
                    daysRemaining: null,
                    loading: false,
                });
            }
        }

        checkSubscription();
    }, [userId]);

    return status;
}