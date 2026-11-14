// src/components/index/StaffSidebar.tsx
import {
    Coins, Award, ShieldCheck, Star, TrendingUp, Trophy,
    BookOpen, ClipboardList, HelpCircle,
} from "lucide-react";
import { BaseTopNav } from "./BaseTopNav";
import { BaseSidebarMobileTrigger, BaseSidebarDrawer } from "./BaseSidebar";

const SECTIONS = [
    { id: "home", label: "Home", icon: Coins },
    { id: "benefits", label: "What You Get", icon: Award },
    { id: "how", label: "How It Works", icon: TrendingUp },
    { id: "cta", label: "Get Started", icon: Star },
] as const;

const GUIDES = [
    { to: "/cpd/coins-policy", label: "MedraeCoins Policy", icon: Coins },
    { to: "/nck-exam-revision", label: "NCK Exam Revision", icon: BookOpen },
    { to: "/nursing-revision-kenya", label: "Nursing Revision", icon: ClipboardList },
    { to: "/cpd/apply", label: "Apply to Contribute", icon: ShieldCheck },
    { to: "/medrae-nursing-merit-cup", label: "Medrae Merit Cup", icon: Trophy },
    { to: "/help", label: "Help Center", icon: HelpCircle },
] as const;

const baseProps = {
    accent: "emerald" as const,
    roleLabel: "Nurse",
    homeRoute: "/for/staff",
    sections: SECTIONS,
    guides: GUIDES,
    exploreLabel: "On This Page",
    guidesLabel: "CPD Resources",
};

export function StaffTopNav() {
    return <BaseTopNav {...baseProps} />;
}

export function StaffSidebarMobileTrigger({ onOpen }: { onOpen: () => void }) {
    return <BaseSidebarMobileTrigger onOpen={onOpen} />;
}

export function StaffSidebarDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
    return <BaseSidebarDrawer {...baseProps} open={open} onClose={onClose} />;
}