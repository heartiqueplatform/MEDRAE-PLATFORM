import { supabase } from "@/lib/supabaseClient";

export const signInWithGoogle = async (role: "student" | "tutor") => {
    try {
        // Save selected role BEFORE redirect
        localStorage.setItem("pendingOAuthRole", role);

        console.log(" Saved OAuth role:", role);

        const redirectTo = `${window.location.origin}/auth/callback`;

        console.log("🔁 Redirect URL:", redirectTo);

        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo,
                queryParams: {
                    access_type: "offline",
                    prompt: "select_account",
                },
                skipBrowserRedirect: false,
            },
        });

        if (error) {
            console.error("❌ OAuth error:", error.message);
            localStorage.removeItem("pendingOAuthRole");
            throw error;
        }

        console.log("🚀 OAuth initiated:", data);

    } catch (err: any) {
        console.error("❌ Google sign-in failed:", err.message);

        // cleanup to avoid wrong role leaks
        localStorage.removeItem("pendingOAuthRole");

        throw err;
    }
};