// src/components/index/TutorSidebar.tsx
import {
    Users, Shield, BarChart3, ClipboardList, Clock, CheckCircle2,
    HelpCircle, BookOpen, FileText,
} from "lucide-react";
import {
    BaseSidebarDesktop,
    BaseSidebarMobileTrigger,
    BaseSidebarDrawer,
} from "./BaseSidebar";

const SECTIONS = [
    { id: "home", label: "Home", icon: Users },
    { id: "features", label: "What You Get", icon: Shield },
    { id: "cta", label: "Get Started", icon: CheckCircle2 },
] as const;

const GUIDES = [
    { to: "/live-classes", label: "Live Classes", icon: Clock },
    { to: "/tutor/exams", label: "Exam Control", icon: ClipboardList },
    { to: "/analytics", label: "Analytics", icon: BarChart3 },
    { to: "/nck-exam-preparation", label: "NCK Prep Guide", icon: FileText },
    { to: "/nursing-revision-kenya", label: "Nursing Revision", icon: BookOpen },
    { to: "/help", label: "Help Center", icon: HelpCircle },
] as const;

const baseProps = {
    accent: "violet" as const,
    roleLabel: "Tutor",
    homeRoute: "/for/tutor",
    sections: SECTIONS,
    guides: GUIDES,
    exploreLabel: "On This Page",
    guidesLabel: "Tutor Tools",
};

export function TutorSidebarDesktop() {
    return <BaseSidebarDesktop {...baseProps} />;
}

export function TutorSidebarMobileTrigger({ onOpen }: { onOpen: () => void }) {
    return <BaseSidebarMobileTrigger onOpen={onOpen} />;
}

export function TutorSidebarDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
    return <BaseSidebarDrawer {...baseProps} open={open} onClose={onClose} />;
}