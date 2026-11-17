import { lazy, type ComponentType, type JSX } from "react";

export type TabDef = {
    path: string;
    label: string;
    icon: (props: { active: boolean }) => JSX.Element;
    element: ComponentType;
};

const StudentDashboard = lazy(() => import("@/pages/dashboard/student"));
const Feed = lazy(() => import("@/pages/Feed"));
const MyMistakes = lazy(() => import("@/pages/MyMistakes"));
const MedraeQuizzes = lazy(() =>
    import("@/pages/MedraeQuizzes").then((m) => ({ default: m.MedraeQuizzes }))
);
const ListenPage = lazy(() => import("@/pages/ListenPage"));

export const STUDENT_TABS: TabDef[] = [
    { path: "/dashboard/student", label: "Home", icon: null as any, element: StudentDashboard },
    { path: "/feed", label: "Feed", icon: null as any, element: Feed },
    { path: "/Medrae-quizzes", label: "Quizzes", icon: null as any, element: MedraeQuizzes },
    { path: "/listen", label: "Listen", icon: null as any, element: ListenPage },
    { path: "/my-mistakes", label: "Mistakes", icon: null as any, element: MyMistakes },
];

export const TAB_PATHS = new Set(STUDENT_TABS.map((t) => t.path));