// src/components/layout/FrozenShell.tsx
import { memo } from "react";
import { Outlet } from "react-router-dom";
import { AppSidebar } from "../AppSidebar";
import { Header } from "../Header";
import { Footer } from "@/components/Footer";
import { MusicPlayer } from "@/components/MusicPlayer";
import { FloatingChatButton } from "../FloatingChatButton";
import { MedicalDoodles } from "@/components/MedicalDoodles";

export const FrozenShell = memo(function FrozenShell({
    user, role, streak, isDarkMode, toggleDarkMode, userId,
}: any) {
    return (
        <div
            className="fixed inset-0 flex h-[100dvh] w-full overflow-hidden"
            style={{ backgroundColor: isDarkMode ? '#0d1117' : '#ffffff' }}
        >
            <MedicalDoodles className="-z-10 pointer-events-none" />
            <div className="relative z-10 flex w-full h-full">
                <AppSidebar userRole={role} />
                <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden max-w-[880px] mx-auto">
                    <Header user={user} isDarkMode={isDarkMode} onToggleDarkMode={toggleDarkMode} streak={streak} />
                    <main data-scroll-container className="flex-1 overflow-y-auto overflow-x-hidden hide-scrollbar">
                        <div className="flex flex-col min-h-full">
                            <div className="flex-1 pt-4 px-0 md:px-4 lg:px-6">
                                <Outlet />
                            </div>
                            <Footer mistakeCount={0} />
                            <div className="h-20 md:hidden shrink-0" />
                        </div>
                    </main>
                </div>
            </div>
            <MusicPlayer />
            <FloatingChatButton userId={userId} />
        </div>
    );
});