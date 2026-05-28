import { supabase } from "@/lib/supabaseClient";

export const signInWithGoogle = async (role: "student" | "tutor") => {
    try {
        const redirectTo =
            window.location.hostname === "localhost"
                ? "http://localhost:8080/auth/callback"
                : `${window.location.origin}/auth/callback`;

        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo,
                queryParams: {
                    access_type: "offline",
                    prompt: "select_account",
                },
                data: {
                    role,
                },
            },
        });

        if (error) {
            throw error;
        }
    } catch (err: any) {
        console.error("Google sign in error:", err.message);
        throw err;
    }
};