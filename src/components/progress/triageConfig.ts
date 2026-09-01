// components/progress/triageConfig.tsx
import { AlertTriangle, AlertCircle, CheckCircle, Skull } from "lucide-react";
import { TriageLevel } from "./TriagePopup";
export const TRIAGE_LEVELS: TriageLevel[] = [
    {
        code: "GREEN",
        label: "Stable",
        description: "Strong performance! You're on track and showing excellent understanding of nursing concepts.",
        icon: "CheckCircle",
        color: "text-emerald-600",
        bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
        borderColor: "border-emerald-500",
        textColor: "text-emerald-700",
        threshold: 70,
        emoji: "🟢",
        actionText: "Challenge Yourself",
        actionLink: "/Medrae-quizzes",
        detailedMessage: "🟢 CODE GREEN: STABLE\n\nExcellent work! You're performing at a high level across your nursing units. You have a solid understanding of the material and are well-prepared for clinical practice.\n\n💪 Keep challenging yourself with more difficult topics to continue growing. You're on the path to becoming an exceptional nurse!",
    },
    {
        code: "YELLOW",
        label: "Urgent",
        description: "Needs attention! Review weak areas and practice more to improve your understanding.",
        icon: "AlertTriangle",
        color: "text-amber-600",
        bgColor: "bg-amber-50 dark:bg-amber-900/20",
        borderColor: "border-amber-500",
        textColor: "text-amber-700",
        threshold: 50,
        emoji: "🟡",
        actionText: "Review & Practice",
        actionLink: "/Medrae-quizzes",
        detailedMessage: "🟡 CODE YELLOW: URGENT\n\nYour performance needs attention in several areas. While you have some understanding, there are gaps that need to be addressed.\n\n📚 Focus on reviewing the topics where you scored lowest. Re-read the material, take notes, and practice with targeted quizzes. You have the foundation - now build on it!",
    },
    {
        code: "RED",
        label: "Critical",
        description: "Immediate intervention needed! Focus on fundamentals and basic nursing concepts.",
        icon: "AlertCircle",
        color: "text-red-600",
        bgColor: "bg-red-50 dark:bg-red-900/20",
        borderColor: "border-red-500",
        textColor: "text-red-700",
        threshold: 30,
        emoji: "🔴",
        actionText: "Start Recovery",
        actionLink: "/Medrae-quizzes",
        detailedMessage: "🔴 CODE RED: CRITICAL\n\nImmediate attention required! Your scores indicate significant gaps in understanding core nursing concepts.\n\n🚨 This is a critical moment in your nursing journey. Start with the fundamentals:\n• Review basic anatomy and physiology\n• Master medication calculations\n• Understand nursing process fundamentals\n• Practice with basic concept quizzes\n\nYou CAN recover from this. Start today, one topic at a time.",
    },
    {
        code: "BLACK",
        label: "No Data",
        description: "No activity recorded. Start your nursing journey today!",
        icon: "Skull",
        color: "text-gray-600",
        bgColor: "bg-gray-50 dark:bg-gray-900/20",
        borderColor: "border-gray-500",
        textColor: "text-gray-700",
        threshold: 0,
        emoji: "⚫",
        actionText: "Start Studying",
        actionLink: "/Medrae-quizzes",
        detailedMessage: "⚫ CODE BLACK: NO DATA\n\nYou haven't started your nursing journey yet! Every expert was once a beginner.\n\n🌟 Your nursing career starts with a single step. Begin by:\n• Taking your first quiz\n• Learning basic nursing concepts\n• Building your foundation\n\nRemember: Every great nurse started exactly where you are now. Take that first step today!",
    },
];
export function getTriageCode(progress: number, hasData: boolean): TriageLevel {
    if (!hasData) return TRIAGE_LEVELS[3];
    if (progress >= TRIAGE_LEVELS[0].threshold) return TRIAGE_LEVELS[0];
    if (progress >= TRIAGE_LEVELS[1].threshold) return TRIAGE_LEVELS[1];
    return TRIAGE_LEVELS[2];
}