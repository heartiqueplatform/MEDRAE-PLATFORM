// src/staff-cpd/admin/AdminLayout.tsx
import { Link, useLocation, Outlet } from "react-router-dom";
import { BookOpen, HelpCircle, Calendar, ClipboardList, LayoutDashboard, ChevronRight } from "lucide-react";

const NAV = [
    { label: "Overview", to: "/cpd/admin", icon: LayoutDashboard, exact: true },
    { label: "Activities", to: "/cpd/admin/activities", icon: BookOpen },
    { label: "Question Bank", to: "/cpd/admin/questions", icon: HelpCircle },
    { label: "Completions", to: "/cpd/admin/completions", icon: ClipboardList },
    { label: "Periods", to: "/cpd/admin/periods", icon: Calendar },
];

export default function AdminLayout() {
    const loc = useLocation();
    const active = (item: typeof NAV[number]) =>
        item.exact ? loc.pathname === item.to : loc.pathname.startsWith(item.to);

    return (
        <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
                <Link to="/cpd" className="hover:text-foreground">CPD</Link>
                <ChevronRight className="h-3 w-3" />
                <span className="font-medium text-foreground">Admin</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
                <aside className="space-y-1">
                    {NAV.map((item) => {
                        const Icon = item.icon;
                        const isActive = active(item);
                        return (
                            <Link
                                key={item.to}
                                to={item.to}
                                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${isActive
                                    ? "bg-primary/10 text-primary font-semibold"
                                    : "hover:bg-muted/60 text-foreground/85"
                                    }`}
                            >
                                <Icon className="h-4 w-4" />
                                {item.label}
                            </Link>
                        );
                    })}
                </aside>

                <main className="min-w-0">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}