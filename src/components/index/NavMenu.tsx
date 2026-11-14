import { Menu, Transition } from "@headlessui/react";
import { Fragment, ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export function NavMenu({
    label,
    children,
    activeLabel,
    icon,
    anchor = "bottom start",
}: {
    label: string;
    children: ReactNode;
    activeLabel?: string;
    icon?: ReactNode;
    anchor?: "bottom start" | "bottom end" | "bottom";
}) {
    return (
        <Menu as="div" className="relative">
            {({ open }) => (
                <>
                    <Menu.Button
                        className={`flex items-center gap-1.5 px-3 h-10 rounded-lg text-sm font-semibold
                        transition-colors
                        ${open
                                ? "bg-slate-100 text-slate-900"
                                : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"}`}
                    >
                        {icon ?? activeLabel ?? label}
                        {!icon && (
                            <ChevronDown
                                className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
                                strokeWidth={2.2}
                            />
                        )}
                    </Menu.Button>

                    <Transition
                        as={Fragment}
                        enter="transition ease-out duration-150"
                        enterFrom="opacity-0 translate-y-1"
                        enterTo="opacity-100 translate-y-0"
                        leave="transition ease-in duration-100"
                        leaveFrom="opacity-100 translate-y-0"
                        leaveTo="opacity-0 translate-y-1"
                    >
                        <Menu.Items
                            anchor={anchor}
                            className="mt-2 w-72 rounded-2xl bg-white
                         shadow-xl ring-1 ring-slate-900/5 p-2
                         focus:outline-none z-50"
                        >
                            {children}
                        </Menu.Items>
                    </Transition>
                </>
            )}
        </Menu>
    );
}