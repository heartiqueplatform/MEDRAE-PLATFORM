// src/navigation/NavItem.tsx
import { memo } from "react";
import { preloadRoute } from "./routePreload";
import { useSmartNavigate } from "./useSmartNavigate";

interface NavItemProps {
    icon: React.ComponentType<{ active: boolean }>;
    label: string;
    path: string;
    isActive: boolean;
    isDark: boolean;
    badge?: number;
    /** Optional custom handler — used by "Listen" which doesn't navigate */
    onCustomPress?: () => void;
}

export const NavItem = memo(function NavItem({
    icon: Icon, label, path, isActive, isDark, badge, onCustomPress,
}: NavItemProps) {
    const smartNav = useSmartNavigate();

    const handlePointerDown = (e: React.PointerEvent) => {
        // Prefetch on pointerdown — 40-120ms head start before tap completes
        preloadRoute(path);

        if (onCustomPress) {
            e.preventDefault();
            onCustomPress();
            return;
        }
        smartNav(e, path);
    };

    const labelColor = isActive
        ? isDark ? "text-white" : "text-blue-600"
        : isDark ? "text-gray-400" : "text-gray-500";

    return (
        <button
            onPointerDown={handlePointerDown}
            className="flex flex-col items-center justify-center flex-1 h-full relative select-none
                 active:scale-95 transition-transform duration-100"
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            aria-label={label}
        >
            <div className="relative flex items-center justify-center w-[26px] h-[26px]">
                <span className={labelColor}>
                    <Icon active={isActive} />
                </span>
                {badge !== undefined && badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[17px] h-[17px] px-1
                           text-[9.5px] font-bold flex items-center justify-center
                           bg-red-500 text-white rounded-full ring-2 ring-background">
                        {badge > 99 ? "99+" : badge}
                    </span>
                )}
            </div>
            <span className={`leading-none mt-1.5 text-[10px] tracking-tight
                        ${isActive ? "font-semibold" : "font-medium"} ${labelColor}`}>
                {label}
            </span>
        </button>
    );
});