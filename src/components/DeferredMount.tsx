// src/components/DeferredMount.tsx
import { useEffect, useRef, useState } from "react";

export function DeferredMount({
    children,
    fallback = null,
    rootMargin = "400px",
    priority = false,
}: {
    children: React.ReactNode;
    fallback?: React.ReactNode;
    rootMargin?: string;
    priority?: boolean;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(priority);
    const [mounted, setMounted] = useState(priority);

    useEffect(() => {
        if (mounted) return;
        if (!ref.current) return;
        const io = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setVisible(true);
                    setMounted(true); // ← never unmount again
                    io.disconnect();
                }
            },
            { rootMargin }
        );
        io.observe(ref.current);
        return () => io.disconnect();
    }, [rootMargin, mounted]);

    return (
        <div ref={ref}>
            {visible ? children : fallback}
        </div>
    );
}