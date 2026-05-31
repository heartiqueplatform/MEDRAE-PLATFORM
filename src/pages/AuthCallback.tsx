import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";

// ── Rubik's cube colours ──────────────────────────────────────────
const COLORS: Record<string, string> = {
    U: "#ffd500", D: "#ffffff", F: "#0046ad",
    B: "#009b48", L: "#ff5800", R: "#b71234",
};
const FACE_KEYS = ["F", "B", "U", "D", "L", "R"] as const;
type FaceKey = typeof FACE_KEYS[number];
type CubeState = Record<FaceKey, FaceKey[]>;

function freshState(): CubeState {
    const s = {} as CubeState;
    FACE_KEYS.forEach((k) => (s[k] = Array(9).fill(k)));
    return s;
}

function rotateFace(state: CubeState, face: FaceKey, cw: boolean): CubeState {
    const f = [...state[face]];
    const nf = cw
        ? [f[6], f[3], f[0], f[7], f[4], f[1], f[8], f[5], f[2]]
        : [f[2], f[5], f[8], f[1], f[4], f[7], f[0], f[3], f[6]];
    return { ...state, [face]: nf };
}

function scrambleState(): CubeState {
    let s = freshState();
    for (let i = 0; i < 28; i++) {
        const face = FACE_KEYS[Math.floor(Math.random() * 6)];
        s = rotateFace(s, face, Math.random() > 0.5);
    }
    return s;
}

// ── RubiksCubeLoader ──────────────────────────────────────────────
const FACE_TRANSFORMS: Record<string, string> = {
    F: "translateZ(75px)",
    B: "translateZ(-75px) rotateY(180deg)",
    U: "rotateX(90deg) translateZ(75px)",
    D: "rotateX(-90deg) translateZ(75px)",
    L: "rotateY(-90deg) translateZ(75px)",
    R: "rotateY(90deg) translateZ(75px)",
};

interface CubeLoaderProps {
    isSolving: boolean;
    onSolved: () => void;
}

const RubiksCubeLoader = ({ isSolving, onSolved }: CubeLoaderProps) => {
    const cubeRef = useRef<HTMLDivElement>(null);
    const rotXRef = useRef(20);
    const rotYRef = useRef(30);
    const rafRef = useRef<number>(0);
    const [cubeState, setCubeState] = useState<CubeState>(scrambleState);
    const [solved, setSolved] = useState(false);

    // Continuous spin
    useEffect(() => {
        if (solved) return;
        const spin = () => {
            rotXRef.current += 0.18;
            rotYRef.current += 0.28;
            if (cubeRef.current) {
                cubeRef.current.style.transform =
                    `rotateX(${rotXRef.current}deg) rotateY(${rotYRef.current}deg)`;
            }
            rafRef.current = requestAnimationFrame(spin);
        };
        rafRef.current = requestAnimationFrame(spin);
        return () => cancelAnimationFrame(rafRef.current);
    }, [solved]);

    // Solve sequence
    useEffect(() => {
        if (!isSolving) return;

        const steps: Array<{ face: FaceKey; step: number }> = [];
        FACE_KEYS.forEach((k) => {
            steps.push({ face: k, step: 0 });
            steps.push({ face: k, step: 1 });
            steps.push({ face: k, step: 2 });
        });

        let i = 0;
        const interval = setInterval(() => {
            if (i >= steps.length) {
                clearInterval(interval);
                cancelAnimationFrame(rafRef.current);
                // Snap to a nice resting angle
                let fx = rotXRef.current % 360;
                let fy = rotYRef.current % 360;
                const snap = setInterval(() => {
                    fx += (20 - fx) * 0.1;
                    fy += (45 - fy) * 0.1;
                    if (cubeRef.current)
                        cubeRef.current.style.transform = `rotateX(${fx}deg) rotateY(${fy}deg)`;
                    if (Math.abs(fx - 20) < 0.5 && Math.abs(fy - 45) < 0.5) {
                        clearInterval(snap);
                        setSolved(true);
                        onSolved();
                    }
                }, 16);
                return;
            }
            const { face, step } = steps[i++];
            setCubeState((prev) => {
                const next = { ...prev, [face]: [...prev[face]] };
                if (step === 0) next[face][4] = face;
                else if (step === 1) [1, 3, 5, 7].forEach((idx) => (next[face][idx] = face));
                else next[face] = Array(9).fill(face);
                return next;
            });
        }, 120);

        return () => clearInterval(interval);
    }, [isSolving, onSolved]);

    const size = 150;
    const half = size / 2;

    return (
        <div style={{ perspective: "600px", width: size, height: size }}>
            <div
                ref={cubeRef}
                style={{ width: "100%", height: "100%", position: "relative", transformStyle: "preserve-3d" }}
            >
                {FACE_KEYS.map((key, fi) => (
                    <div
                        key={key}
                        style={{
                            position: "absolute",
                            inset: 0,
                            display: "grid",
                            gridTemplateColumns: "repeat(3,1fr)",
                            gap: 3,
                            padding: 3,
                            background: "#111",
                            borderRadius: 8,
                            border: "2px solid #222",
                            transform: FACE_TRANSFORMS[key],
                            backfaceVisibility: "hidden",
                            boxSizing: "border-box",
                        }}
                    >
                        {cubeState[key].map((c, i) => (
                            <div
                                key={i}
                                style={{
                                    backgroundColor: COLORS[c],
                                    borderRadius: 2,
                                    boxShadow: "inset 0 0 5px rgba(0,0,0,0.2)",
                                    transition: "background-color 0.3s ease",
                                }}
                            />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
};

// ── AuthCallback (FIXED VERSION) ──────────────────────────────────
export default function AuthCallback() {
    const navigate = useNavigate();
    const [phase, setPhase] = useState<"loading" | "solving" | "done">("loading");
    const navigateFn = useRef<() => void>(() => { });

    useEffect(() => {
        const handleGoogleAuth = async () => {
            try {
                console.log("=== AUTH CALLBACK STARTED ===");
                console.log("Full URL:", window.location.href);
                console.log("Hash:", window.location.hash);
                console.log("Search:", window.location.search);

                // 🔧 IMPORTANT: Handle both hash fragments and query params
                // Supabase might return tokens in hash fragment
                let code = null;

                // Check for code in query params first
                const searchParams = new URLSearchParams(window.location.search);
                code = searchParams.get("code");

                // If no code in query params, check hash fragment
                if (!code && window.location.hash) {
                    const hashParams = new URLSearchParams(window.location.hash.substring(1));
                    code = hashParams.get("code");
                    console.log("Found code in hash fragment:", code);
                }

                // Check for error in URL
                const error = searchParams.get("error") ||
                    (window.location.hash && new URLSearchParams(window.location.hash.substring(1)).get("error"));

                if (error) {
                    console.error("OAuth Error:", error);
                    const errorDesc = searchParams.get("error_description") ||
                        (window.location.hash && new URLSearchParams(window.location.hash.substring(1)).get("error_description"));
                    throw new Error(`Authentication error: ${errorDesc || error}`);
                }

                // If we have an access_token in hash, we might already have a session
                if (!code && window.location.hash) {
                    const hashParams = new URLSearchParams(window.location.hash.substring(1));
                    const accessToken = hashParams.get("access_token");

                    if (accessToken) {
                        console.log("Found access_token, getting session...");
                        // Try to get session directly
                        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

                        if (!sessionError && session) {
                            console.log("Session found from hash token");
                            // We have a session, continue with profile setup
                            const user = session.user;
                            // ... continue with profile processing
                        }
                    }
                }

                if (!code) {
                    // Check if we already have a session
                    const { data: { session } } = await supabase.auth.getSession();
                    if (session) {
                        console.log("Already have a session, proceeding...");
                        // Process the existing session
                        const user = session.user;
                        // Continue with profile setup below
                    } else {
                        throw new Error("No OAuth code or existing session found");
                    }
                } else {
                    // Exchange code for session
                    console.log("Exchanging code for session...");
                    const { data: codeData, error: exchangeError } =
                        await supabase.auth.exchangeCodeForSession(code);

                    if (exchangeError) {
                        console.error("Exchange error:", exchangeError);
                        throw exchangeError;
                    }

                    if (!codeData.session) {
                        throw new Error("No session returned from Supabase");
                    }


                }

                // Get the session and user (either from above or from existing session)
                const { data: { session }, error: sessionError } =
                    await supabase.auth.getSession();

                if (sessionError || !session) {
                    throw new Error("No session available");
                }

                const user = session.user;

                console.log("Session established for user:", user.email);

                // Rest of your profile processing code remains the same...
                const email = user.email || "";
                const fullName = user.user_metadata?.full_name || user.user_metadata?.name || "User";
                const avatar = user.user_metadata?.avatar_url || "";
                const username = email ? email.split("@")[0].toLowerCase() : `user_${user.id.slice(0, 6)}`;

                const pendingRole = localStorage.getItem("pendingOAuthRole") as "student" | "tutor" | null;

                let existingRole = null;
                try {
                    const { data: existingProfile } = await supabase
                        .from("profiles")
                        .select("role")
                        .eq("user_id", user.id)
                        .maybeSingle();

                    if (existingProfile) {
                        existingRole = existingProfile.role;
                    }
                } catch (fetchError) {
                    console.warn("Could not fetch existing profile:", fetchError);
                }
                console.log("PENDING ROLE:", pendingRole);
                console.log("EXISTING ROLE (IGNORED):", existingRole);
                const role = pendingRole || "student";
                localStorage.removeItem("pendingOAuthRole");

                // Update or create profile
                try {
                    const { error: upsertError } = await supabase
                        .from("profiles")
                        .upsert(
                            {
                                user_id: user.id,
                                name: fullName,
                                username: username,
                                email: email,
                                avatar_url: avatar,

                                // ✅ FIXED LINE (IMPORTANT)
                                role: pendingRole || "student",

                                subscription: "Free",
                                joined_date: new Date().toISOString().split("T")[0],
                                is_online: true,
                                last_seen: new Date().toISOString(),
                                tokens: 0,
                            },
                            { onConflict: "user_id" }
                        );

                    if (upsertError) {
                        console.error("Profile upsert error:", upsertError);
                    }
                } catch (profileError) {
                    console.error("Profile operation failed:", profileError);
                }

                // Navigate based on role
                if (role === "student") {
                    navigate("/dashboard/student", { replace: true });
                } else if (role === "tutor") {
                    navigate("/dashboard/tutor", { replace: true });
                } else if (role === "staff") {
                    navigate("/dashboard/staff", { replace: true });
                } else {
                    navigate("/", { replace: true });
                }

            } catch (err: any) {
                console.error("=== AUTH CALLBACK ERROR ===");
                console.error("Error message:", err.message);
                localStorage.removeItem("pendingOAuthRole");
                navigate("/login?error=auth_failed", { replace: true });
            }
        };

        handleGoogleAuth();
    }, [navigate]);
    const handleSolved = () => {
        setPhase("done");
        setTimeout(() => navigateFn.current(), 600);
    };
    return (
        <div className="relative min-h-screen w-full overflow-hidden">

            {/* Background */}
            <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                    backgroundImage: "url('/high1.png')"
                }}
            />

            {/* Dark overlay */}
            <div className="absolute inset-0 bg-black/40" />

            {/* Content */}
            <div className="relative z-10 min-h-screen flex flex-col items-center justify-center gap-8"></div>
            {phase !== "done" ? (
                <>
                    <RubiksCubeLoader isSolving={phase === "solving"} onSolved={handleSolved} />

                    <div className="text-center space-y-1">
                        {phase === "loading" ? (
                            <>
                                <h2 className="text-lg font-semibold text-slate-700 tracking-tight">
                                    Syncing Records...
                                </h2>
                                <p className="text-sm text-slate-400 italic">"Just a heartbeat away"</p>
                            </>
                        ) : (
                            <>
                                <h2 className="text-lg font-semibold text-slate-700 tracking-tight">
                                    Almost there...
                                </h2>
                                <p className="text-sm text-slate-400 italic">Solving the last pieces</p>
                            </>
                        )}
                    </div>

                    {/* Pulsing dots */}
                    <div className="flex gap-2">
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