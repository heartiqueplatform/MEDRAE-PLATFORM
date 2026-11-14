import { Menu } from "@headlessui/react";
import { Link } from "react-router-dom";
import type { ScrollSection, GuideLink, SidebarAccent } from "./navShared";
import { ACCENT_MAP } from "./navShared";

export function ScrollNavItem({
    section,
    active,
    accent,
    onPick,
}: {
    section: ScrollSection;
    active: boolean;
    accent: SidebarAccent;
    onPick: (id: string) => void;
}) {
    const Icon = section.icon;
    const A = ACCENT_MAP[accent];
    return (
        <Menu.Item>
            {({ active: hovered }) => (
                <button
                    onClick={() => onPick(section.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left
                      text-sm font-semibold transition-colors
                      ${active
                            ? `${A.activeBg} ${A.activeText}`
                            : hovered
                                ? "bg-slate-100 text-slate-900"
                                : "text-slate-700"}`}
                >
                    <Icon className="w-4 h-4 shrink-0" strokeWidth={2.2} />
                    <span className="truncate">{section.label}</span>
                    {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-current" />}
                </button>
            )}
        </Menu.Item>
    );
}

export function GuideNavItem({ guide }: { guide: GuideLink }) {
    const Icon = guide.icon;
    return (
        <Menu.Item>
            {({ active }) => (
                <Link
                    to={guide.to}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold
                      transition-colors
                      ${active ? "bg-slate-100 text-slate-900" : "text-slate-700"}`}
                >
                    <Icon className="w-4 h-4 shrink-0" strokeWidth={2.2} />
                    <span className="truncate">{guide.label}</span>
                </Link>
            )}
        </Menu.Item>
    );
}