// src/components/index/StudentSidebar.tsx
import {
    Home, Sparkles, Headphones, Users, Trophy, Stethoscope, BookOpen,
    Brain, Info, Mail, GraduationCap, FileText, HelpCircle, ClipboardList, Award,
} from "lucide-react";
import {
    BaseSidebarDesktop,
    BaseSidebarMobileTrigger,
    BaseSidebarDrawer,
} from "./BaseSidebar";

const SECTIONS = [
    { id: "home", label: "Home", icon: Home },
    { id: "features", label: "Features", icon: Sparkles },
    { id: "podcasts", label: "Podcasts", icon: Headphones },
    { id: "grouppay", label: "GroupPay", icon: Users },
    { id: "merit-cup", label: "Merit Cup", icon: Trophy },
    { id: "clinical-assessment", label: "Clinical Assessment", icon: Stethoscope },
    { id: "curriculum", label: "Curriculum", icon: BookOpen },
    { id: "algorithm", label: "AI Algorithm", icon: Brain },
    { id: "about", label: "About", icon: Info },
    { id: "contact", label: "Contact", icon: Mail },
] as const;

const GUIDES = [
    { to: "/nursing-revision-kenya", label: "Nursing Revision in Kenya", icon: GraduationCap },
    { to: "/nck-exam-revision", label: "NCK Exam Revision", icon: FileText },
    { to: "/nck-exam-questions", label: "NCK Exam Questions", icon: HelpCircle },
    { to: "/nck-past-papers", label: "NCK Past Papers", icon: ClipboardList },
    { to: "/nck-exam-preparation", label: "NCK Exam Preparation", icon: Award },
    { to: "/krchn-revision", label: "KRCHN Revision", icon: BookOpen },
    { to: "/medrae-nursing-merit-cup", label: "Medrae Merit Cup", icon: Trophy },
] as const;

const baseProps = {
    accent: "blue" as const,
    roleLabel: "Student",
    homeRoute: "/for/student",
    sections: SECTIONS,
    guides: GUIDES,
};

export function StudentSidebarDesktop() {
    return <BaseSidebarDesktop {...baseProps} />;
}

export function StudentSidebarMobileTrigger({ onOpen }: { onOpen: () => void }) {
    return <BaseSidebarMobileTrigger onOpen={onOpen} />;
}

export function StudentSidebarDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
    return <BaseSidebarDrawer {...baseProps} open={open} onClose={onClose} />;
}