import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { GlobalLoader } from "@/components/GlobalLoader";

export default function AuthCallback() {
    const navigate = useNavigate();
    const [phase, setPhase] = useState<"loading" | "solving" | "done">("loading");
    const navigateFn = useRef<() => void>(() => { });
    const processed = useRef(false); // Prevents double-processing in Strict Mode

    useEffect(() => {

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (processed.current) return;

            if (session) {
                processed.current = true;
                handleAuthSuccess(session);
            } else if (event === "INITIAL_SESSION") {
                // If no session after initial check, wait a moment then error out
                const timer = setTimeout(() => {
                    if (!processed.current) {
                        handleAuthError("No session found");
                    }
                }, 4000);
                return () => clearTimeout(timer);
            }
        });

        const handleAuthSuccess = async (session: any) => {
            try {
                console.log("=== AUTH SUCCESS ===");
                const user = session.user;

                // Profile processing logic (PRESERVED)
                const email = user.email || "";
                const fullName = user.user_metadata?.full_name || user.user_metadata?.name || "User";
                const avatar = user.user_metadata?.avatar_url || "";
                const username = email ? email.split("@")[0].toLowerCase() : `user_${user.id.slice(0, 6)}`;

                const pendingRole = localStorage.getItem("pendingOAuthRole") as "student" | "tutor" | "staff" | null;
                const role = pendingRole || "student";
                localStorage.removeItem("pendingOAuthRole");

                // Update or create profile (PRESERVED)
                const { error: upsertError } = await supabase
                    .from("profiles")
                    .upsert(
                        {
                            user_id: user.id,
                            name: fullName,
                            username: username,
                            email: email,
                            avatar_url: avatar,
                            role: role,
                            subscription: "Free",
                            joined_date: new Date().toISOString().split("T")[0],
                            is_online: true,
                            last_seen: new Date().toISOString(),
                            tokens: 0,
                        },
                        { onConflict: "user_id" }
                    );

                if (upsertError) console.error("Profile upsert error:", upsertError);

                // Determine navigation (PRESERVED)
                if (role === "student") {
                    navigateFn.current = () => navigate("/dashboard/student", { replace: true });
                } else if (role === "tutor") {
                    navigateFn.current = () => navigate("/dashboard/tutor", { replace: true });
                } else if (role === "staff") {
                    navigateFn.current = () => navigate("/dashboard/staff", { replace: true });
                } else {
                    navigateFn.current = () => navigate("/", { replace: true });
                }

                // Trigger animations
                setPhase("solving");
                setTimeout(() => handleSolved(), 800); // Transitions to "Done"

            } catch (err: any) {
                handleAuthError(err.message);
            }
        };

        const handleAuthError = (message: string) => {
            console.error("=== AUTH CALLBACK ERROR ===", message);
            localStorage.removeItem("pendingOAuthRole");
            navigateFn.current = () => navigate("/login?error=auth_failed", { replace: true });
            setPhase("solving");
            setTimeout(() => handleSolved(), 800);
        };

        return () => subscription.unsubscribe();
    }, [navigate]);

    const handleSolved = () => {
        setPhase("done");
        // Final navigation after the "Synced!" checkmark shows
        setTimeout(() => navigateFn.current(), 800);
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-white flex items-center justify-center">
            <div className="text-center">
                {phase !== "done" ? (
                    <>
                        <GlobalLoader />
                        <div className="mt-6 text-center space-y-2">
                            <p className="text-slate-500 font-bold animate-pulse uppercase tracking-widest text-xs">
                                {phase === "loading" ? "Verifying Access..." : "Syncing Records..."}
                            </p>
                        </div>

                        {/* Pulsing dots */}
                        <div className="flex gap-2 justify-center mt-4">
                            {[0, 1, 2].map((i) => (
                                <span
                                    key={i}
                                    className="w-2 h-2 rounded-full bg-blue-600"
                                    style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }}
                                />
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center gap-4 animate-fade-in">
                        <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center shadow-lg">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth={3}
                                viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
                        </div>
                        <p className="text-lg font-semibold text-green-600">Synced!</p>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 0.3; transform: scale(0.8); }
                    50% { opacity: 1; transform: scale(1); }
                }
                @keyframes fade-in {
                    from { opacity: 0; transform: scale(0.8); }
                    to { opacity: 1; transform: scale(1); }
                }
                .animate-fade-in { animation: fade-in 0.4s ease-out forwards; }
            `}</style>
        </div>
    );
}