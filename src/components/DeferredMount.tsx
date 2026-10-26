import { useEffect, useRef, useState } from "react";

export function DeferredMount({
    children,
    fallback = null,
    rootMargin = "300px",
}: {
    children: React.ReactNode;
    fallback?: React.ReactNode;
    rootMargin?: string;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (!ref.current) return;
        const io = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setVisible(true);
                    io.disconnect();
                }
            },
            { rootMargin }
        );
        io.observe(ref.current);
        return () => io.disconnect();
    }, [rootMargin]);

    return (
        <div ref={ref}>
            {visible ? children : fallback}
        </div>
    );
}