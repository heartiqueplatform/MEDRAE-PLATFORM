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
    initialized: boolean;
};

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    loading: true,
    initialized: false,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [authState, setAuthState] = useState<AuthContextType>(
        authManager.getState()
    );

    const lastUserIdRef = useRef<string | null>(
        authManager.getState()?.user?.id ?? null
    );
    const lastLoadingRef = useRef<boolean>(
        authManager.getState()?.loading ?? true
    );
    const lastInitializedRef = useRef<boolean>(
        authManager.getState()?.initialized ?? false
    );

    useEffect(() => {
        authManager.initialize();

        const unsubscribe = authManager.subscribe((state) => {
            const nextUserId = state?.user?.id ?? null;
            const nextLoading = state?.loading ?? true;
            const nextInitialized = state?.initialized ?? false;

            if (
                nextUserId === lastUserIdRef.current &&
                nextLoading === lastLoadingRef.current &&
                nextInitialized === lastInitializedRef.current
            ) {
                return;
            }

            lastUserIdRef.current = nextUserId;
            lastLoadingRef.current = nextLoading;
            lastInitializedRef.current = nextInitialized;
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