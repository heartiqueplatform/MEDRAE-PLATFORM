// src/lib/multiAccount.ts
import { supabase } from "@/lib/supabaseClient";

export type Role = "student" | "tutor" | "staff";
const ROLES: readonly Role[] = ["student", "tutor", "staff"] as const;

/* ═══════════════════════════════════════════════════════════════
   Logging helpers
   ═══════════════════════════════════════════════════════════════ */

const LOG = (label: string, ...args: any[]) => {
    console.log(`%c[multiAccount] ${label}`, "color:#2196F3;font-weight:bold", ...args);
};
const WARN = (label: string, ...args: any[]) => {
    console.warn(`%c[multiAccount] ${label}`, "color:#FF9800;font-weight:bold", ...args);
};
const ERR = (label: string, ...args: any[]) => {
    console.error(`%c[multiAccount] ${label}`, "color:#F44336;font-weight:bold", ...args);
};

/* ═══════════════════════════════════════════════════════════════
   Shadow email helpers
   ═══════════════════════════════════════════════════════════════ */

export function buildShadowEmail(baseEmail: string, role: Role): string {
    const clean = baseEmail.trim().toLowerCase();
    const [local, domain] = clean.split("@");
    if (!local || !domain) throw new Error("Invalid email address.");
    const shadow = `${local}+${role}@${domain}`;
    LOG("buildShadowEmail", { baseEmail, role, shadow });
    return shadow;
}

export function baseEmailFromShadow(shadowEmail: string): string {
    const clean = shadowEmail.trim().toLowerCase();
    const [local, domain] = clean.split("@");
    if (!local || !domain) return clean;
    return `${local.split("+")[0]}@${domain}`;
}

export function roleFromShadowEmail(shadowEmail: string): Role | null {
    const local = shadowEmail.trim().toLowerCase().split("@")[0] || "";
    const plusIdx = local.indexOf("+");
    if (plusIdx === -1) return null;
    const suffix = local.slice(plusIdx + 1);
    return ROLES.includes(suffix as Role) ? (suffix as Role) : null;
}

/* ═══════════════════════════════════════════════════════════════
   Safe wrappers — prevent the "hanging forever" bug
   Used by loginWithAnyRole and createLinkedRole only.
   The switch flow now uses its own page with a fresh auth context.
   ═══════════════════════════════════════════════════════════════ */

async function safeSignOut(): Promise<void> {
    LOG("safeSignOut → start");
    const t0 = Date.now();
    try {
        await Promise.race([
            supabase.auth.signOut(),
            new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error("signOut timeout")), 2000)
            ),
        ]);
        LOG(`safeSignOut → done in ${Date.now() - t0}ms`);
        return;
    } catch (e: any) {
        WARN(`safeSignOut → FAILED after ${Date.now() - t0}ms:`, e?.message);
    }

    // Force-clear local auth keys — no more Supabase calls
    try {
        const removed: string[] = [];
        Object.keys(localStorage)
            .filter(
                (k) =>
                    (k.startsWith("sb-") && k.endsWith("-auth-token")) ||
                    k.includes("supabase.auth")
            )
            .forEach((k) => {
                localStorage.removeItem(k);
                removed.push(k);
            });
        LOG("safeSignOut → force-cleared localStorage keys:", removed);
    } catch (e: any) {
        WARN("safeSignOut → localStorage clear failed:", e?.message);
    }
}

async function safeSignIn(
    email: string,
    password: string
): Promise<{ success: boolean; errorMessage?: string }> {
    LOG("safeSignIn → start", { email, passwordLength: password.length });
    const t0 = Date.now();
    const TIMEOUT_MS = 12000;

    try {
        const result: any = await Promise.race([
            supabase.auth.signInWithPassword({ email, password }),
            new Promise<never>((_, reject) =>
                setTimeout(
                    () => reject(new Error("signIn timeout — no response from auth server")),
                    TIMEOUT_MS
                )
            ),
        ]);

        LOG(`safeSignIn → response in ${Date.now() - t0}ms`, {
            hasError: !!result?.error,
            errorMessage: result?.error?.message,
            userId: result?.data?.user?.id,
            userEmail: result?.data?.user?.email,
            hasSession: !!result?.data?.session,
        });

        if (result?.error) {
            return { success: false, errorMessage: result.error.message };
        }
        return { success: true };
    } catch (e: any) {
        ERR(`safeSignIn → THREW after ${Date.now() - t0}ms:`, e?.message, e);
        return {
            success: false,
            errorMessage: e?.message || "Login timed out. Please try again.",
        };
    }
}

/* ═══════════════════════════════════════════════════════════════
   Fetch linked accounts for the current session's user
   ═══════════════════════════════════════════════════════════════ */

export interface LinkedRole {
    linked_user_id: string;
    role: Role;
    primary_user_id: string;
}

export async function getLinkedRoles(
    currentUserId: string
): Promise<{ primaryUserId: string; roles: LinkedRole[]; currentRole: Role | null }> {
    LOG("getLinkedRoles → start", { currentUserId });

    // ─── Step 1: What role is the current user? ────────────────
    const { data: currentProfile, error: cpErr } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", currentUserId)
        .maybeSingle();
    if (cpErr) ERR("getLinkedRoles → profile fetch error", cpErr);
    const currentRole = (currentProfile?.role as Role | undefined) ?? null;
    LOG("getLinkedRoles → currentRole", currentRole);

    // ─── Step 2: Find the TRUE primary ─────────────────────────
    // Two sub-steps:
    //   a) Look for a link where I'm the primary (I AM the primary)
    //   b) If none, look for a link where I'm the linked user (I'm a sibling)
    //      → use that link's primary_user_id
    let primaryUserId: string = currentUserId;

    const { data: asPrimary, error: aErr } = await supabase
        .from("linked_accounts")
        .select("primary_user_id")
        .eq("primary_user_id", currentUserId)
        .limit(1);
    if (aErr) ERR("getLinkedRoles → asPrimary fetch error", aErr);

    if (asPrimary && asPrimary.length > 0) {
        // I am the primary
        primaryUserId = currentUserId;
        LOG("getLinkedRoles → current user IS primary");
    } else {
        // I'm a linked role — look up my primary
        const { data: asLinked, error: bErr } = await supabase
            .from("linked_accounts")
            .select("primary_user_id")
            .eq("linked_user_id", currentUserId)
            .limit(1);
        if (bErr) ERR("getLinkedRoles → asLinked fetch error", bErr);

        if (asLinked && asLinked.length > 0) {
            primaryUserId = asLinked[0].primary_user_id;
            LOG("getLinkedRoles → current user is LINKED, primary is", primaryUserId);
        } else {
            // No links at all — this user is a standalone account
            primaryUserId = currentUserId;
            LOG("getLinkedRoles → no links found, user is standalone");
        }
    }

    // ─── Step 3: Fetch ALL links belonging to this primary ─────
    // This is the critical fix: query by primary, NOT by currentUserId.
    // That returns every sibling role, not just the link involving me.
    const { data: allLinks, error: lErr } = await supabase
        .from("linked_accounts")
        .select("primary_user_id, linked_user_id, role")
        .eq("primary_user_id", primaryUserId);
    if (lErr) ERR("getLinkedRoles → allLinks fetch error", lErr);
    LOG("getLinkedRoles → allLinks rows", allLinks);

    // ─── Step 4: Build the role map ────────────────────────────
    const roleMap = new Map<Role, string>();

    // 4a. Add the primary's role
    if (primaryUserId === currentUserId && currentRole) {
        roleMap.set(currentRole, currentUserId);
    } else {
        const { data: primaryProfile, error: ppErr } = await supabase
            .from("profiles")
            .select("role")
            .eq("user_id", primaryUserId)
            .maybeSingle();
        if (ppErr) ERR("getLinkedRoles → primary profile fetch error", ppErr);
        if (primaryProfile?.role) {
            roleMap.set(primaryProfile.role as Role, primaryUserId);
        }
    }

    // 4b. Add every linked sibling (from the fresh allLinks query)
    for (const row of allLinks ?? []) {
        if (row.linked_user_id !== primaryUserId) {
            roleMap.set(row.role as Role, row.linked_user_id);
        }
    }
    const roles: LinkedRole[] = Array.from(roleMap.entries()).map(
        ([role, userId]) => ({
            primary_user_id: primaryUserId,
            linked_user_id: userId,
            role,
        })
    );

    // ─── Diagnostic: warn if not all links are accounted for ────
    const expectedLinkedCount = (allLinks?.length ?? 0);
    const actualLinkedCount = roles.length - 1; // minus the primary
    if (actualLinkedCount !== expectedLinkedCount) {
        WARN("getLinkedRoles → MISMATCH", {
            expectedLinkedCount,
            actualLinkedCount,
            allLinks,
            roles,
            primaryUserId,
            currentUserId,
        });
    }

    LOG("getLinkedRoles → final roles", roles);
    return { primaryUserId, roles, currentRole };
}

/* ═══════════════════════════════════════════════════════════════
   Create a NEW role for the current user
   ═══════════════════════════════════════════════════════════════ */

export async function createLinkedRole(
    baseEmail: string,
    newPassword: string,
    newRole: Role
): Promise<{ linkedUserId: string; primaryUserId: string }> {
    LOG("createLinkedRole → start", { baseEmail, newRole });

    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
        ERR("createLinkedRole → no current user");
        throw new Error("Not signed in.");
    }
    LOG("createLinkedRole → current user", { id: user.id, email: user.email });

    const shadowEmail = buildShadowEmail(baseEmail, newRole);

    const { roles } = await getLinkedRoles(user.id);
    if (roles.some((r) => r.role === newRole)) {
        ERR("createLinkedRole → role already exists", newRole);
        throw new Error(`You already have a ${newRole} role.`);
    }
    if (roles.length >= 3) {
        ERR("createLinkedRole → max roles reached");
        throw new Error("Maximum 3 roles per account.");
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const currentAccessToken = sessionData?.session?.access_token ?? null;
    const currentRefreshToken = sessionData?.session?.refresh_token ?? null;
    LOG("createLinkedRole → saved session tokens", {
        hasAccess: !!currentAccessToken,
        hasRefresh: !!currentRefreshToken,
    });

    LOG("createLinkedRole → signUp start", shadowEmail);
    const t0 = Date.now();
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: shadowEmail,
        password: newPassword,
        options: {
            data: {
                role: newRole,
                linked_to: user.id,
                base_email: baseEmail,
            },
        },
    });
    LOG(`createLinkedRole → signUp done in ${Date.now() - t0}ms`, {
        error: signUpError?.message,
        newUserId: signUpData?.user?.id,
        newUserEmail: signUpData?.user?.email,
    });

    if (signUpError) {
        const msg = String(signUpError.message || "").toLowerCase();
        if (msg.includes("already registered")) {
            ERR("createLinkedRole → signUp already registered", signUpError);
            throw new Error(
                `A ${newRole} profile already exists for this email. ` +
                `Please refresh the page and try again, or contact support if it persists.`
            );
        }
        ERR("createLinkedRole → signUp failed", signUpError);
        throw new Error(signUpError.message);
    }

    const newAuthUserId = signUpData.user?.id;
    if (!newAuthUserId) {
        ERR("createLinkedRole → signUp returned no user id");
        throw new Error("Signup returned no user ID.");
    }

    if (currentAccessToken && currentRefreshToken) {
        LOG("createLinkedRole → restoring primary session");
        const restore = await supabase.auth.setSession({
            access_token: currentAccessToken,
            refresh_token: currentRefreshToken,
        });
        LOG("createLinkedRole → setSession result", {
            error: restore?.error?.message,
            restoredUserId: restore?.data?.user?.id,
        });
    } else {
        WARN("createLinkedRole → no tokens to restore; profile insert may fail RLS");
    }
    // 6. Insert the profile row for the new role — via RPC (bypasses RLS safely)
    LOG("createLinkedRole → create_linked_profile RPC start");
    const { error: profileError } = await supabase.rpc(
        "create_linked_profile",
        {
            p_user_id: newAuthUserId,
            p_role: newRole,
            p_base_email: baseEmail,
            p_primary_user_id: user.id,
        }
    );

    if (profileError) {
        ERR("createLinkedRole → create_linked_profile RPC failed", profileError);
        throw new Error(`Couldn't create profile: ${profileError.message}`);
    }
    LOG("createLinkedRole → create_linked_profile RPC OK");
    // 7. Insert the link — use the TRUE primary user id, not the current user.
    //    Chain-linking bug: if the current user is a linked role (e.g. Tutor),
    //    using user.id would create a link with Tutor as primary, orphaning
    //    the new role from the actual primary (Student).
    LOG("createLinkedRole → resolving true primary user id");
    const { roles: existingRoles, primaryUserId: truePrimaryId } =
        await getLinkedRoles(user.id);
    LOG("createLinkedRole → true primary resolved", {
        currentUserId: user.id,
        truePrimaryId,
        existingRoles,
    });

    if (!truePrimaryId) {
        ERR("createLinkedRole → no primary user id found");
        await supabase.from("profiles").delete().eq("user_id", newAuthUserId);
        throw new Error("Couldn't resolve your primary account. Please try again.");
    }

    LOG("createLinkedRole → linked_accounts insert start", {
        primary_user_id: truePrimaryId,
        linked_user_id: newAuthUserId,
        role: newRole,
    });
    const { error: linkError } = await supabase
        .from("linked_accounts")
        .insert({
            primary_user_id: truePrimaryId,       // ← FIX: always use the true primary
            linked_user_id: newAuthUserId,
            role: newRole,
        });

    if (linkError) {
        ERR("createLinkedRole → linked_accounts insert failed", linkError);
        // Roll back the profile insert to avoid orphan
        await supabase.from("profiles").delete().eq("user_id", newAuthUserId);
        throw new Error(`Couldn't link accounts: ${linkError.message}`);
    }
    LOG("createLinkedRole → linked_accounts insert OK");

    // Extra safety: if the current user is NOT the primary, the auth user is
    // still logged in as the linked account. That's fine — the caller
    // (RoleSwitch) will navigate to /switch-account and the switch will work.
    // But we should also verify that the new auth user has a profile row now.
    LOG("createLinkedRole → COMPLETE", {
        linkedUserId: newAuthUserId,
        primaryUserId: user.id,
    });
    return { linkedUserId: newAuthUserId, primaryUserId: user.id };
}

/* ═══════════════════════════════════════════════════════════════
   🆕 Navigate to the dedicated Switch Account page
   ─────────────────────────────────────────────────────────────
   Instead of doing signOut+signIn on the current page (which
   caused auth lock hangs), we navigate to /switch-account.
   That page loads fresh, does its own signOut+signIn safely,
   and redirects to the new dashboard. This is the industry
   standard pattern (Google, Slack, GitHub all do this).
   ═══════════════════════════════════════════════════════════════ */

export function navigateToSwitchAccount(targetRole: Role): void {
    LOG("navigateToSwitchAccount → navigating", { targetRole });
    const url = `/switch-account?role=${encodeURIComponent(targetRole)}`;
    // Full reload (not SPA nav) so the auth client is 100% fresh
    window.location.href = url;
}

/* ═══════════════════════════════════════════════════════════════
   Log in with any role
   ═══════════════════════════════════════════════════════════════ */

export async function loginWithAnyRole(
    baseEmail: string,
    password: string
): Promise<{ userId: string; role: Role | null; emailUsed: string }> {
    const clean = baseEmail.trim().toLowerCase();
    LOG("loginWithAnyRole → start", { clean });

    LOG("loginWithAnyRole → trying base email", clean);
    const baseAttempt = await safeSignIn(clean, password);
    LOG("loginWithAnyRole → base attempt result", baseAttempt);

    if (baseAttempt.success) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: prof } = await supabase
                .from("profiles")
                .select("role")
                .eq("user_id", user.id)
                .maybeSingle();
            LOG("loginWithAnyRole → matched base", {
                userId: user.id,
                role: prof?.role,
            });
            return {
                userId: user.id,
                role: (prof?.role as Role | undefined) ?? null,
                emailUsed: clean,
            };
        }
    }

    for (const role of ROLES) {
        const shadow = buildShadowEmail(clean, role);
        LOG("loginWithAnyRole → trying shadow", shadow);
        const attempt = await safeSignIn(shadow, password);
        LOG(`loginWithAnyRole → ${role} attempt result`, attempt);

        if (attempt.success) {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                LOG("loginWithAnyRole → matched shadow", {
                    userId: user.id,
                    role,
                });
                return {
                    userId: user.id,
                    role,
                    emailUsed: shadow,
                };
            }
        }
    }

    ERR("loginWithAnyRole → all attempts failed");
    throw new Error("Invalid email or password.");
}

/* ═══════════════════════════════════════════════════════════════
   Forgot password — send reset to correct variant
   ═══════════════════════════════════════════════════════════════ */

export async function sendPasswordReset(
    baseEmail: string,
    role: Role
): Promise<void> {
    LOG("sendPasswordReset → start", { baseEmail, role });
    const clean = baseEmail.trim().toLowerCase();
    const target =
        role === "student" || role === "tutor" || role === "staff"
            ? buildShadowEmail(clean, role)
            : clean;
    LOG("sendPasswordReset → target email", target);

    const { error } = await supabase.auth.resetPasswordForEmail(target, {
        redirectTo: `${window.location.origin}/reset-password?email=${encodeURIComponent(
            clean
        )}&role=${role}`,
    });
    if (error) {
        ERR("sendPasswordReset → failed", error);
        throw new Error(error.message);
    }
    LOG("sendPasswordReset → sent OK");
}