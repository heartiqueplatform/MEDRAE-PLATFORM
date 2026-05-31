// hooks/usePremiumFeature.ts
import { useSubscription } from "./useSubscription";

interface PremiumFeatureOptions {
    freeLimit?: number;      // e.g., first 20 items are free
    requiredPlan?: 'pro' | 'premium';
}

export function usePremiumFeature(options: PremiumFeatureOptions = {}) {
    const { freeLimit = 20, requiredPlan } = options;
    const { isPremium, planType, loading } = useSubscription();

    const hasRequiredPlan = !requiredPlan ||
        (requiredPlan === 'pro' && (planType === 'pro' || planType === 'premium')) ||
        (requiredPlan === 'premium' && planType === 'premium');

    const canAccessPremium = isPremium && hasRequiredPlan;

    // Check if a specific item at index should be accessible
    const canAccessItem = (index: number): boolean => {
        if (!canAccessPremium && index >= freeLimit) {
            return false;
        }
        return true;
    };

    // Get the limit for free users
    const getFreeLimit = () => freeLimit;

    // Get remaining free items count
    const getRemainingFreeItems = (totalItems: number, currentIndex: number): number => {
        if (canAccessPremium) return 0;
        return Math.max(0, freeLimit - currentIndex - 1);
    };

    return {
        isPremium: canAccessPremium,
        planType,
        loading,
        canAccessItem,
        getFreeLimit,
        getRemainingFreeItems,
        isFreeTier: !canAccessPremium,
    };
}