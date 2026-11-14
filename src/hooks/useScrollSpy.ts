import { useEffect, useState } from "react";
import type { ScrollSection } from "../components/index/navShared";

export function useScrollSpy(sections: readonly ScrollSection[]) {
    const [active, setActive] = useState(sections[0]?.id ?? "home");

    useEffect(() => {
        const handler = () => {
            const y = window.scrollY + 120;
            let current = sections[0]?.id ?? "home";
            for (const s of sections) {
                const el = document.getElementById(s.id);
                if (el && el.offsetTop <= y) current = s.id;
            }
            setActive(current);
        };
        handler();
        window.addEventListener("scroll", handler, { passive: true });
        return () => window.removeEventListener("scroll", handler);
    }, [sections]);

    return active;
}