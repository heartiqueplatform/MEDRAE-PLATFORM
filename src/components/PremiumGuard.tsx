// components/PremiumGuard.tsx
import { ReactNode } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import { useNavigate } from "react-router-dom";
import { Sparkles, Lock } from "lucide-react";

interface PremiumGuardProps {
    children: ReactNode;
    fallback?: ReactNode;  // Custom UI for non-premium users
    featureName?: string;   // e.g., "Video Lectures", "Practice Exams"
    requiredPlan?: 'pro' | 'premium'; // Specific plan requirement
}

export function PremiumGuard({
    children,
    fallback,
    featureName = "Premium Content",
    requiredPlan
}: PremiumGuardProps) {
    const { isPremium, planType, loading } = useSubscription();
    const navigate = useNavigate();

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    // Check if user meets specific plan requirement
    const hasRequiredPlan = !requiredPlan ||
        (requiredPlan === 'pro' && (planType === 'pro' || planType === 'premium')) ||
        (requiredPlan === 'premium' && planType === 'premium');

    const canAccess = isPremium && hasRequiredPlan;

    if (!canAccess) {
        if (fallback) {
            return <>{fallback}</>;
        }

        // Default premium wall UI
        return (
            <div className="flex flex-col items-center justify-center p-8 sm:p-16 bg-white dark:bg-muted/30 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xl text-center">
                <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-6">
                    <Lock className="w-10 h-10 text-amber-600 dark:text-amber-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    {featureName} - Premium Feature
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-sm">
                    Upgrade to {requiredPlan || 'Pro'} to unlock this feature and get full access to all study materials.
                </p>
                <button
                    onClick={() => navigate("/subscription")}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-10 rounded-xl transition-all shadow-lg active:scale-95 flex items-center gap-2 group"
                >
                    <Sparkles className="w-5 h-5" />
                    <span>Upgrade Now</span>
                </button>
            </div>
        );
    }

    return <>{children}</>;
}