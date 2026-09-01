"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { authManager } from "@/lib/authManager";

type AuthContextType = {
    user: any | null;
    session: any | null;
    loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    loading: true,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [authState, setAuthState] = useState<AuthContextType>(authManager.getState());

    useEffect(() => {
        // Initialize auth manager singleton (only runs once globally)
        authManager.initialize();

        // Subscribe to auth state changes from the singleton
        const unsubscribe = authManager.subscribe((state) => {
            setAuthState(state);
        });

        // Set initial state
        setAuthState(authManager.getState());

        return () => {
            unsubscribe();
        };
    }, []);

    return (
        <AuthContext.Provider value={authState}>
            {children}
        </AuthContext.Provider>
    );
};

//  Hook to use in any component
export const useAuth = () => useContext(AuthContext);