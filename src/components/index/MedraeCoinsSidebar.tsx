// src/components/index/MedraeCoinsSidebar.tsx
import {
    Coins, TrendingUp, Gift, ShieldCheck, Ban,
    Users, BookOpen,
} from "lucide-react";
import { BaseTopNav } from "./BaseTopNav";
import { BaseSidebarMobileTrigger, BaseSidebarDrawer } from "./BaseSidebar";

const SECTIONS = [
    { id: "home", label: "Overview", icon: Coins },
    { id: "student-path", label: "For Students", icon: Users },
    { id: "student-details", label: "How Students Earn", icon: TrendingUp },
    { id: "staff-details", label: "How Staff Earn", icon: BookOpen },
    { id: "anti-abuse", label: "Anti-Abuse", icon: Ban },
    { id: "cta", label: "Get Started", icon: Gift },
] as const;

const GUIDES = [
    { to: "/cpd/coins-policy", label: "Staff Coin Policy", icon: ShieldCheck },
    { to: "/wallet/learn", label: "Student Coin Guide", icon: Coins },
    { to: "/for/student", label: "Student Portal", icon: Users },
    { to: "/for/staff", label: "Staff Portal", icon: BookOpen },
    { to: "/medrae-nursing-merit-cup", label: "Medrae Merit Cup", icon: Gift },
    { to: "/help", label: "Help Center", icon: ShieldCheck },
] as const;

const baseProps = {
    accent: "amber" as const,
    roleLabel: "MedraeCoins",
    homeRoute: "/medrae-coins",
    sections: SECTIONS,
    guides: GUIDES,
    exploreLabel: "On This Page",
    guidesLabel: "Related Guides",
};

export function MedraeCoinsTopNav() {
    return <BaseTopNav {...baseProps} />;
}

export function MedraeCoinsSidebarMobileTrigger({ onOpen }: { onOpen: () => void }) {
    return <BaseSidebarMobileTrigger onOpen={onOpen} />;
}

export function MedraeCoinsSidebarDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
    return <BaseSidebarDrawer {...baseProps} open={open} onClose={onClose} />;
}