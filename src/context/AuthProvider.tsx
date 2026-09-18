"use client";

import {
    createContext,
    useContext,
    useEffect,
    useState,
    ReactNode,
} from "react";
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
    const [authState, setAuthState] = useState<AuthContextType>(
        authManager.getState()
    );

    useEffect(() => {
        authManager.initialize();

        const unsubscribe = authManager.subscribe((state) => {
            setAuthState(state);
        });

        return () => unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={authState}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);