// src/components/index/StudentSidebar.tsx

import {
    Home, Sparkles, Headphones, Users, Trophy, Stethoscope, BookOpen,
    Brain, Info, Mail, GraduationCap, FileText, HelpCircle, ClipboardList, Award,
    Coins,          // 👈 ADD
} from "lucide-react";
import { BaseTopNav } from "./BaseTopNav";
import { BaseSidebarMobileTrigger, BaseSidebarDrawer } from "./BaseSidebar";

const SECTIONS = [
    { id: "home", label: "Home", icon: Home },
    { id: "features", label: "Features", icon: Sparkles },
    { id: "coins", label: "Medrae Coins", icon: Coins },          // 👈 ADD — right after Features
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
    // ... unchanged
] as const;

const baseProps = {
    accent: "blue" as const,
    roleLabel: "Student",
    homeRoute: "/for/student",
    sections: SECTIONS,
    guides: GUIDES,
};

export function StudentTopNav() {
    return <BaseTopNav {...baseProps} />;
}

export function StudentSidebarMobileTrigger({ onOpen }: { onOpen: () => void }) {
    return <BaseSidebarMobileTrigger onOpen={onOpen} />;
}

export function StudentSidebarDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
    return <BaseSidebarDrawer {...baseProps} open={open} onClose={onClose} />;
}