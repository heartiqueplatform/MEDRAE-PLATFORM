// src/navigation/tabs.ts
// ONE ordered list. Footer + TabStack + SwipeTabs all read from this.
// Order = swipe order. Wrap-around at the ends.

import type { ComponentType, JSX } from "react";
import StudentDashboard from "@/pages/dashboard/student";
import Feed from "@/pages/Feed";
import MyMistakes from "@/pages/MyMistakes";
import { MedraeQuizzes } from "@/pages/MedraeQuizzes";
import MenuPage from "@/pages/MenuPage";
import ListenPage from "@/pages/ListenPage";

export type TabDef = {
    path: string;
    label: string;
    icon: (props: { active: boolean }) => JSX.Element;
    element: ComponentType;
};

// ⚠️ ORDER MATTERS. Swipe moves left/right through this exact array.
export const STUDENT_TABS: TabDef[] = [
    { path: "/dashboard/student", label: "Home", icon: null as any, element: StudentDashboard },
    { path: "/feed", label: "Feed", icon: null as any, element: Feed },
    { path: "/Medrae-quizzes", label: "Quizzes", icon: null as any, element: MedraeQuizzes },
    { path: "/listen", label: "Listen", icon: null as any, element: ListenPage },
    { path: "/menu", label: "Menu", icon: null as any, element: MenuPage },
    // MyMistakes stays MOUNTED for perf but is NOT swipeable (no footer icon).
    { path: "/my-mistakes", label: "Mistakes", icon: null as any, element: MyMistakes },
];

// The paths swipe can land on — must match Footer's icons exactly, in order.
export const SWIPE_PATHS: string[] = [
    "/dashboard/student",
    "/feed",
    "/Medrae-quizzes",
    "/listen",
    "/menu",
];

// Swipe is DISABLED on these paths (precious screens — user must tap).
export const SWIPE_DISABLED_PATHS = new Set<string>([
    "/listen",
]);

export const TAB_PATHS = new Set(STUDENT_TABS.map((t) => t.path));