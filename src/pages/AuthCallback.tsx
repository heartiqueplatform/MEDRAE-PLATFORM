import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallback() {
    const navigate = useNavigate();

    useEffect(() => {
        const handleGoogleAuth = async () => {
            try {
                const {
                    data: { session },
                    error: sessionError,
                } = await supabase.auth.getSession();

                if (sessionError || !session?.user) {
                    throw new Error("No active session found");
                }

                const user = session.user;
                const email = user.email || "";
                const fullName = user.user_metadata?.full_name || user.user_metadata?.name || "User";
                const avatar = user.user_metadata?.avatar_url || "";
                const username = email ? email.split("@")[0].toLowerCase() : `user_${user.id.slice(0, 6)}`;

                const { data: existingProfile, error: profileFetchError } = await supabase
                    .from("profiles")
                    .select("role")
                    .eq("user_id", user.id)
                    .maybeSingle();

                if (profileFetchError) throw new Error("Failed to fetch profile");

                let role = existingProfile?.role || "student";

                const { error: upsertError } = await supabase
                    .from("profiles")
                    .upsert({
                        user_id: user.id,
                        name: fullName,
                        username,
                        email,
                        avatar_url: avatar,
                        role,
                        subscription: "Free",
                        joined_date: new Date().toISOString().split("T")[0],
                        is_online: true,
                        last_seen: new Date().toISOString(),
                    }, { onConflict: "user_id" });

                if (upsertError) throw new Error("Failed creating/updating profile");

                let deviceId = localStorage.getItem("device_id") || crypto.randomUUID();
                localStorage.setItem("device_id", deviceId);

                const { data: sessions } = await supabase
                    .from("user_sessions")
                    .select("*")
                    .eq("user_id", user.id);

                const existingSessions = sessions || [];
                const alreadyExists = existingSessions.find((s) => s.device_id === deviceId);

                if (!alreadyExists) {
                    if (existingSessions.length >= 3) throw new Error("Maximum devices reached");
                    await supabase.from("user_sessions").insert({
                        user_id: user.id,
                        device_id: deviceId,
                        device_info: navigator.userAgent,
                    });
                }

                if (role === "student") navigate("/dashboard/student", { replace: true });
                else if (role === "tutor") navigate("/dashboard/tutor", { replace: true });
                else if (role === "staff") navigate("/dashboard/staff", { replace: true });
                else navigate("/", { replace: true });

            } catch (err: any) {
                console.error("Auth callback error:", err);
                navigate("/login", { replace: true });
            }
        };

        handleGoogleAuth();
    }, [navigate]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
            {/* Custom Nurses Watch Loader */}
            <div className="relative flex flex-col items-center">

                {/* Watch Pin/Fob (The part that clips to the uniform) */}
                <div className="w-8 h-2 bg-slate-400 rounded-t-sm shadow-sm" />
                <div className="w-1 h-6 bg-gradient-to-b from-slate-400 to-slate-300" />

                {/* The Watch Body */}
                <div className="relative w-24 h-24 bg-white border-[6px] border-slate-300 rounded-full shadow-xl flex items-center justify-center">

                    {/* Dial Markers (Subtle dots) */}
                    <div className="absolute inset-2 border border-dashed border-slate-100 rounded-full" />

                    {/* Hour Hand */}
                    <div className="absolute w-1 h-6 bg-slate-800 rounded-full origin-bottom bottom-1/2 translate-y-0 rotate-[45deg]" />

                    {/* Minute Hand */}
                    <div className="absolute w-1 h-8 bg-slate-600 rounded-full origin-bottom bottom-1/2 translate-y-0 rotate-[140deg]" />

                    {/* Ticking Second Hand (The "Cool" Part) */}
                    <div
                        className="absolute w-0.5 h-9 bg-red-500 rounded-full origin-bottom bottom-1/2 translate-y-0 animate-watch-tick"
                    />

                    {/* Center Pin */}
                    <div className="absolute w-2 h-2 bg-slate-900 rounded-full z-10" />

                    {/* Medical Icon (Small Heart or Plus) */}
                    <div className="absolute top-4 text-[10px] text-red-500 font-bold">✚</div>
                </div>

                {/* Subtle swinging animation for the whole watch */}
                <style>{`
                    @keyframes watch-tick {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                    .animate-watch-tick {
                        animation: watch-tick 60s steps(60) infinite;
                    }
                `}</style>
            </div>

            <div className="mt-8 text-center space-y-2">
                <h2 className="text-lg font-semibold text-slate-700 tracking-tight">
                    Syncing Records...
                </h2>
                <p className="text-sm text-slate-400 italic">
                    "Just a heartbeat away"
                </p>
            </div>
        </div>
    );
}