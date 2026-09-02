// contexts/DrawerContext.tsx
import { createContext, useContext, useState } from 'react';

const DrawerContext = createContext<{
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
}>({
    isOpen: false,
    setIsOpen: () => { },
});

export const DrawerProvider = ({ children }: { children: React.ReactNode }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <DrawerContext.Provider value={{ isOpen, setIsOpen }}>
            {children}
        </DrawerContext.Provider>
    );
};

export const useDrawer = () => useContext(DrawerContext);