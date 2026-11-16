// components/tutor/ConnectCard.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { tap } from "@/lib/tutor/tap";
import type { ReactNode } from "react";

export interface ConnectAction {
    label: string;
    href?: string;
    onClick?: () => void;
    /** Accent token — one per card max. */
    accent: "blue" | "emerald" | "sky" | "violet";
    variant?: "solid" | "ghost";
}

export interface ConnectCardProps {
    title: string;
    description: string;
    icon: ReactNode;
    accent: "blue" | "emerald" | "sky" | "violet";
    actions: ConnectAction[];
}

const accentMap: Record<
    ConnectCardProps["accent"],
    { iconBg: string; iconText: string; solid: string; ghost: string }
> = {
    blue: {
        iconBg: "bg-blue-500/10",
        iconText: "text-blue-600 dark:text-blue-400",
        solid: "bg-blue-600 hover:bg-blue-700 text-white",
        ghost: "bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400",
    },
    emerald: {
        iconBg: "bg-emerald-500/10",
        iconText: "text-emerald-600 dark:text-emerald-400",
        solid: "bg-emerald-600 hover:bg-emerald-700 text-white",
        ghost: "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
    },
    sky: {
        iconBg: "bg-sky-500/10",
        iconText: "text-sky-600 dark:text-sky-400",
        solid: "bg-sky-600 hover:bg-sky-700 text-white",
        ghost: "bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400",
    },
    violet: {
        iconBg: "bg-violet-500/10",
        iconText: "text-violet-600 dark:text-violet-400",
        solid: "bg-violet-600 hover:bg-violet-700 text-white",
        ghost: "bg-violet-500/10 hover:bg-violet-500/20 text-violet-600 dark:text-violet-400",
    },
};

export function ConnectCard({
    title,
    description,
    icon,
    accent,
    actions,
}: ConnectCardProps) {
    const a = accentMap[accent];

    const renderAction = (action: ConnectAction, i: number) => {
        const cls = `w-full h-10 rounded-xl text-xs font-bold ${action.variant === "solid" ? a.solid : a.ghost
            }`;
        const handle = () => {
            tap();
            action.onClick?.();
        };

        if (action.href) {
            return (
                <a
                    key={i}
                    href={action.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1"
                    onClick={handle}
                    style={{ touchAction: "manipulation" }}
                >
                    <Button className={cls}>{action.label}</Button>
                </a>
            );
        }
        return (
            <Button
                key={i}
                onClick={handle}
                className={cls}
                style={{ touchAction: "manipulation" }}
            >
                {action.label}
            </Button>
        );
    };

    return (
        <Card className="bg-white dark:bg-[#161b22] rounded-2xl overflow-hidden border-0 shadow-none">
            <CardHeader className="p-4 pb-2">
                <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-xl ${a.iconBg} ${a.iconText}`}>
                        {icon}
                    </div>
                    <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                        {title}
                    </CardTitle>
                </div>
                <CardDescription className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 mt-1.5">
                    {description}
                </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-2 flex gap-2">
                {actions.map(renderAction)}
            </CardContent>
        </Card>
    );
}