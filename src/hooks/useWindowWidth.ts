// useWindowWidth.ts
import { useState, useEffect } from "react";

export const useWindowWidth = () => {
    const [width, setWidth] = useState<number>(window.innerWidth);

    useEffect(() => {
        const handleResize = () => setWidth(window.innerWidth);

        // Listen to resize events
        window.addEventListener("resize", handleResize);

        // Cleanup listener on unmount
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    return width;
};
