// src/navigation/tabs.ts
// ONE ordered list. Footer + TabStack read from this.
// Order = display order. No swipe navigation.

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

// ⚠️ ORDER MATTERS. Footer reads this order left → right.
//   `MyMistakes` stays MOUNTED for perf (kept warm in TabStack),
//   but is NOT shown in the footer — no footer icon exists for it.
export const STUDENT_TABS: TabDef[] = [
    { path: "/dashboard/student", label: "Home", icon: null as any, element: StudentDashboard },
    { path: "/feed", label: "Feed", icon: null as any, element: Feed },
    { path: "/Medrae-quizzes", label: "Quizzes", icon: null as any, element: MedraeQuizzes },
    { path: "/listen", label: "Listen", icon: null as any, element: ListenPage },
    { path: "/menu", label: "Menu", icon: null as any, element: MenuPage },
    { path: "/my-mistakes", label: "Mistakes", icon: null as any, element: MyMistakes },
];

// Set of every path that TabStack should keep mounted (not just footer tabs).
export const TAB_PATHS = new Set(STUDENT_TABS.map((t) => t.path));