// src/components/settings/RoleSwitch.tsx
"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    GraduationCap,
    UserCheck,
    Stethoscope,
    AlertTriangle,
    Shield,
    RefreshCw,
    History,
    Trash2
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";
// IMPORT THE ROLE CONTEXT
import { useUserRole } from "@/context/UserRoleContext";

interface RoleSwitchProps {
    currentRole?: string;
    userId?: string;
    onRoleChange?: () => void;
}

export function RoleSwitch({ currentRole, userId, onRoleChange }: RoleSwitchProps) {
    const navigate = useNavigate();
    // ADD THIS LINE - Get the refreshRole function from context
    const { refreshRole } = useUserRole();

    const [isLoading, setIsLoading] = useState(false);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [selectedRole, setSelectedRole] = useState<string | null>(null);
    const [roleHistory, setRoleHistory] = useState<any[]>([]);
    const [showHistory, setShowHistory] = useState(false);

    const roleOptions = [
        {
            id: "student",
            label: "Student",
            icon: GraduationCap,
            description: "Access learning materials and courses",
            bgColor: "hover:bg-blue-500/10 dark:hover:bg-blue-500/20",
            iconColor: "text-blue-600 dark:text-blue-400",
            activeBg: "bg-blue-600 dark:bg-blue-500",
        },
        {
            id: "tutor",
            label: "Tutor",
            icon: UserCheck,
            description: "Create content and teach students",
            bgColor: "hover:bg-emerald-500/10 dark:hover:bg-emerald-500/20",
            iconColor: "text-emerald-600 dark:text-emerald-400",
            activeBg: "bg-emerald-600 dark:bg-emerald-500",
        },
        {
            id: "staff",
            label: "Staff",
            icon: Stethoscope,
            description: "Administrative & management access",
            bgColor: "hover:bg-purple-500/10 dark:hover:bg-purple-500/20",
            iconColor: "text-purple-600 dark:text-purple-400",
            activeBg: "bg-purple-600 dark:bg-purple-500",
            disabled: false,
        },
    ];

    // Fetch role change history
    const fetchRoleHistory = async () => {
        try {
            let userIdToUse = userId;
            if (!userIdToUse) {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;
                userIdToUse = user.id;
            }

            const { data, error } = await supabase
                .from("role_change_history")
                .select("*")
                .eq("user_id", userIdToUse)
                .order("changed_at", { ascending: false })
                .limit(10);

            if (error) throw error;
            setRoleHistory(data || []);
        } catch (error) {
            console.error("Error fetching role history:", error);
        }
    };

    useEffect(() => {
        if (userId) {
            fetchRoleHistory();
        }
    }, [userId]);

    const handleRoleClick = (roleId: string) => {
        if (roleId === currentRole) {
            toast({
                title: "Already in this role",
                description: `You are already a ${roleId}`,
            });
            return;
        }
        setSelectedRole(roleId);
        setShowConfirmDialog(true);
    };

    const logRoleChange = async (userIdToUse: string, oldRole: string, newRole: string) => {
        try {
            const { error } = await supabase
                .from("role_change_history")
                .insert({
                    user_id: userIdToUse,
                    old_role: oldRole,
                    new_role: newRole,
                    changed_at: new Date().toISOString(),
                    changed_by: userIdToUse,
                    user_agent: navigator.userAgent || 'unknown',
                    metadata: {
                        browser: navigator.userAgent,
                        platform: navigator.platform,
                        timestamp: new Date().toISOString()
                    }
                });

            if (error) {
                console.error("Error logging role change:", error);
            }
        } catch (error) {
            console.error("Error in role change logging:", error);
        }
    };

    // ✅ UPDATED: Clear app data with proper role preservation
    const clearAllAppData = (newRole: string) => {
        try {
            // Store the new role before clearing
            const roleKey = userId ? `userRole_${userId}` : "last_known_role";

            // Clear everything
            localStorage.clear();
            sessionStorage.clear();

            // Restore the new role
            if (userId) {
                localStorage.setItem(`userRole_${userId}`, newRole);
            }
            localStorage.setItem("last_known_role", newRole);

            // Clear cookies
            document.cookie.split(";").forEach(cookie => {
                document.cookie = cookie
                    .replace(/^ +/, "")
                    .replace(/=.*/, `=; expires=${new Date(0).toUTCString()}; path=/`);
            });

            console.log("App data cleared successfully!");
            return true;
        } catch (error) {
            console.error("Error clearing app data:", error);
            return false;
        }
    };

    // ✅ UPDATED: Main role change handler with context integration
    const handleRoleChange = async () => {
        if (!selectedRole) return;

        setIsLoading(true);

        try {
            let userIdToUse = userId;
            let oldRole = currentRole || 'unknown';

            if (!userIdToUse) {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) throw new Error("User not found");
                userIdToUse = user.id;
            }

            // ✅ STEP 1: Update role in database
            const { error: updateError } = await supabase
                .from("profiles")
                .update({ role: selectedRole })
                .eq("user_id", userIdToUse);

            if (updateError) {
                console.error("Update error:", updateError);
                throw new Error(`Failed to update role: ${updateError.message}`);
            }

            // ✅ STEP 2: Verify the update was successful
            const { data: verifyData, error: verifyError } = await supabase
                .from("profiles")
                .select("role")
                .eq("user_id", userIdToUse)
                .single();

            if (verifyError) {
                console.error("Verify error:", verifyError);
                throw new Error("Role update could not be verified");
            }

            if (verifyData.role !== selectedRole) {
                throw new Error(`Role mismatch: expected ${selectedRole}, got ${verifyData.role}`);
            }

            console.log(`✅ Role verified: ${verifyData.role}`);

            // ✅ STEP 3: Log the role change history
            await logRoleChange(userIdToUse, oldRole, selectedRole);

            // ✅ STEP 4: Show success toast
            toast({
                title: "Role Updated Successfully",
                description: `Your role has been changed to ${selectedRole}. Refreshing...`,
            });

            // ✅ STEP 5: Clear app data with the new role
            clearAllAppData(selectedRole);

            // ✅ STEP 6: Update the role context
            await refreshRole();

            // ✅ STEP 7: Dispatch role change events
            window.dispatchEvent(new CustomEvent('roleChanged', {
                detail: { role: selectedRole, userId: userIdToUse }
            }));

            // ✅ STEP 8: Get updated profile and dispatch profile update
            const { data: updatedProfile } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', userIdToUse)
                .single();

            if (updatedProfile) {
                localStorage.setItem('userProfile', JSON.stringify(updatedProfile));
                window.dispatchEvent(new CustomEvent('profileUpdated', { detail: updatedProfile }));
            }

            // ✅ STEP 9: Call callback if provided
            if (onRoleChange) {
                onRoleChange();
            }

            // ✅ STEP 10: Force page reload to ensure all components update
            setTimeout(() => {
                window.location.reload();
            }, 500);

        } catch (error: any) {
            console.error("Role change error:", error);

            toast({
                title: "Role Change Failed",
                description: error.message || "Failed to change role. Please try again.",
                variant: "destructive",
            });

            setIsLoading(false);
            setShowConfirmDialog(false);
        }
    };

    return (
        <>
            <Card className="border-0 shadow-none bg-transparent">
                <CardHeader className="px-0">
                    <CardTitle className="flex items-center gap-2 text-lg text-foreground">
                        <Shield className="w-5 h-5 text-yellow-500" />
                        Change User Role
                    </CardTitle>
                    <CardDescription className="text-sm text-muted-foreground">
                        Switch your account role to access different features and dashboards.
                        <span className="block mt-1 text-red-600 dark:text-red-400 text-xs font-bold">
                            ⚠️ This will clear ALL cached data and refresh the page. You'll start fresh with your new role.
                        </span>
                    </CardDescription>
                </CardHeader>
                <CardContent className="px-0">
                    {currentRole && (
                        <div className="mb-4 p-3 bg-muted/50 dark:bg-muted/30 rounded-lg border-0">
                            <p className="text-sm text-foreground">
                                <span className="font-medium text-muted-foreground">Current Role:</span>{" "}
                                <span className="capitalize font-semibold text-primary">
                                    {currentRole}
                                </span>
                            </p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {roleOptions.map((role) => {
                            const Icon = role.icon;
                            const isActive = currentRole === role.id;

                            return (
                                <Button
                                    key={role.id}
                                    variant={isActive ? "default" : "outline"}
                                    className={`
                                        h-auto py-4 px-4 flex flex-col items-center gap-2
                                        transition-all duration-200
                                        ${!isActive && !role.disabled ? role.bgColor : ''}
                                        ${isActive ? `${role.activeBg} hover:${role.activeBg}/90 text-white` : ''}
                                        ${role.disabled ? 'opacity-50 cursor-not-allowed' : ''}
                                        border-0 shadow-none
                                        dark:bg-transparent dark:hover:bg-transparent
                                        ${!isActive && !role.disabled ? 'bg-transparent hover:bg-transparent dark:bg-transparent dark:hover:bg-transparent' : ''}
                                    `}
                                    onClick={() => !role.disabled && handleRoleClick(role.id)}
                                    disabled={isLoading || role.disabled || isActive}
                                >
                                    <Icon className={`
                                        w-6 h-6 md:w-8 md:h-8
                                        ${isActive ? "text-white" : role.iconColor}
                                        ${!isActive && !role.disabled ? 'dark:text-white/70' : ''}
                                    `} />
                                    <span className={`font-semibold ${isActive ? "text-white" : "text-foreground"}`}>
                                        {role.label}
                                    </span>
                                    <span className={`text-[10px] text-center leading-tight ${isActive ? "text-white/80" : "text-muted-foreground"
                                        }`}>
                                        {role.description}
                                    </span>
                                    {isActive && (
                                        <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full text-white">
                                            Current
                                        </span>
                                    )}
                                    {role.disabled && (
                                        <span className="text-[10px] bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 px-2 py-0.5 rounded-full">
                                            Coming Soon
                                        </span>
                                    )}
                                </Button>
                            );
                        })}
                    </div>

                    <div className="mt-4 p-3 bg-red-50/50 dark:bg-red-900/10 border-0 rounded-lg">
                        <div className="flex items-start gap-2">
                            <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                            <div className="text-xs text-red-700 dark:text-red-400">
                                <p className="font-bold">⚠️ Role Change Will:</p>
                                <ul className="list-disc list-inside space-y-0.5 mt-1">
                                    <li>Update your role in the database</li>
                                    <li>Clear ALL localStorage and sessionStorage</li>
                                    <li>Refresh the page to apply changes</li>
                                    <li>Keep your new role saved</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Role History Section */}
                    <div className="mt-6">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowHistory(!showHistory)}
                            className="text-xs text-muted-foreground hover:text-foreground gap-2 border-0"
                        >
                            <History className="w-4 h-4" />
                            {showHistory ? "Hide" : "Show"} Role Change History
                        </Button>

                        {showHistory && (
                            <div className="mt-3 space-y-2">
                                {roleHistory.length === 0 ? (
                                    <p className="text-xs text-muted-foreground">No role changes recorded yet.</p>
                                ) : (
                                    roleHistory.map((entry) => (
                                        <div
                                            key={entry.id}
                                            className="flex items-center justify-between p-2 bg-muted/30 dark:bg-muted/10 rounded-lg border-0"
                                        >
                                            <div className="flex items-center gap-2 text-xs">
                                                <span className="capitalize text-foreground font-medium">
                                                    {entry.old_role}
                                                </span>
                                                <span className="text-muted-foreground">→</span>
                                                <span className="capitalize text-foreground font-medium">
                                                    {entry.new_role}
                                                </span>
                                            </div>
                                            <span className="text-[10px] text-muted-foreground">
                                                {new Date(entry.changed_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Confirmation Dialog */}
            <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <AlertDialogContent className="border-0 dark:border-0">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-foreground">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                            ⚠️ Confirm Role Change - Data Will Be Cleared
                        </AlertDialogTitle>
                        <AlertDialogDescription className="space-y-2 text-muted-foreground">
                            <p>
                                You are about to change your role from{" "}
                                <span className="font-semibold capitalize text-foreground">
                                    {currentRole}
                                </span>{" "}
                                to{" "}
                                <span className="font-semibold capitalize text-foreground">
                                    {selectedRole}
                                </span>
                                .
                            </p>
                            <div className="p-3 bg-red-50/50 dark:bg-red-900/20 border-0 rounded-lg">
                                <p className="text-sm font-bold text-red-700 dark:text-red-400">
                                    🗑️ This will:
                                </p>
                                <ul className="text-xs text-red-600 dark:text-red-500 list-disc list-inside mt-1">
                                    <li>Clear all saved app data (localStorage, sessionStorage)</li>
                                    <li>Update your role in the database</li>
                                    <li>Refresh the page to apply changes</li>
                                    <li>Keep your new role saved</li>
                                </ul>
                                <p className="text-xs text-red-600 dark:text-red-500 mt-2 font-bold">
                                    ⚠️ This action CANNOT be undone!
                                </p>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isLoading} className="border-0">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleRoleChange}
                            disabled={isLoading}
                            className="bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 border-0"
                        >
                            {isLoading ? (
                                <>
                                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                    Updating & Refreshing...
                                </>
                            ) : (
                                "Yes, Change Role"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

export default RoleSwitch;