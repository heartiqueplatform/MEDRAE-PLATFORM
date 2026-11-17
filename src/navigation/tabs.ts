// src/navigation/tabs.ts
import type { ComponentType, JSX } from "react";
import StudentDashboard from "@/pages/dashboard/student";
import Feed from "@/pages/Feed";
import MyMistakes from "@/pages/MyMistakes";
import { MedraeQuizzes } from "@/pages/MedraeQuizzes";
import ListenPage from "@/pages/ListenPage";

export type TabDef = {
    path: string;
    label: string;
    icon: (props: { active: boolean }) => JSX.Element;
    element: ComponentType;
};

export const STUDENT_TABS: TabDef[] = [
    { path: "/dashboard/student", label: "Home", icon: null as any, element: StudentDashboard },
    { path: "/feed", label: "Feed", icon: null as any, element: Feed },
    { path: "/Medrae-quizzes", label: "Quizzes", icon: null as any, element: MedraeQuizzes },
    { path: "/listen", label: "Listen", icon: null as any, element: ListenPage },
    { path: "/my-mistakes", label: "Mistakes", icon: null as any, element: MyMistakes },
];

export const TAB_PATHS = new Set(STUDENT_TABS.map((t) => t.path));