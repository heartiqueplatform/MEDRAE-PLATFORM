import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function RouteScrollManager() {
    const { pathname } = useLocation();

    useEffect(() => {
        const scrollContainer =
            document.querySelector("main") ||
            document.querySelector("[data-scroll-container]");

        if (scrollContainer) {
            scrollContainer.scrollTop = 0;
        } else {
            window.scrollTo(0, 0);
        }
    }, [pathname]);

    return null;
}