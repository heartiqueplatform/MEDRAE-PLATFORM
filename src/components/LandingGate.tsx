// src/components/LandingGate.tsx
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { authManager } from "@/lib/authManager";
import { isStandalone } from "@/lib/isStandalone";
import Index from "@/pages/Index";

/**
 * "/" route gate — mirrors Facebook's behavior:
 *
 *  - Logged in               → /dashboard/{role}   (via RedirectToRoleDashboard)
 *  - Installed app, no user  → /login
 *  - Browser tab, no user    → Index (persona chooser)
 *  - Still resolving auth    → null (don't flash anything)
 */
export default function LandingGate() {
    const { user, initialized } = useAuth();
    const cachedUser = authManager.getUser();
    const effectiveUser = user ?? cachedUser;

    // 1. Logged in (live or cached) → dashboard immediately.
    if (effectiveUser) {
        return <Navigate to="/dashboard" replace />;
    }

    // 2. Auth not resolved yet → render nothing (avoids marketing→login flash).
    if (!initialized) return null;

    // 3. Truly anonymous, in the INSTALLED APP → straight to login.
    if (isStandalone()) {
        return <Navigate to="/login" replace />;
    }

    // 4. Truly anonymous, in a BROWSER tab → marketing page.
    return <Index />;
}