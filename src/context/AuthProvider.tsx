"use client";

import {
    createContext,
    useContext,
    useEffect,
    useState,
    ReactNode,
    useRef,
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

    // 🔧 Track the last user id we committed so we can skip identical
    // re-renders. authManager.setState always creates a new object,
    // which would otherwise re-render the whole tree on every
    // internal state change even when nothing meaningful changed.
    const lastUserIdRef = useRef<string | null>(
        authManager.getState()?.user?.id ?? null
    );
    const lastLoadingRef = useRef<boolean>(
        authManager.getState()?.loading ?? true
    );

    useEffect(() => {
        authManager.initialize();

        const unsubscribe = authManager.subscribe((state) => {
            const nextUserId = state?.user?.id ?? null;
            const nextLoading = state?.loading ?? true;

            // Skip the update if user identity and loading are unchanged.
            if (
                nextUserId === lastUserIdRef.current &&
                nextLoading === lastLoadingRef.current
            ) {
                return;
            }

            lastUserIdRef.current = nextUserId;
            lastLoadingRef.current = nextLoading;
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