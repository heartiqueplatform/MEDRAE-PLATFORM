// src/navigation/NavProgressBar.tsx
import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";

export function NavProgressBar() {
    const location = useLocation();
    const [visible, setVisible] = useState(false);
    const [scale, setScale] = useState(0);
    const raf = useRef<number>();

    // START — fires the instant a tap lands (dispatched by smartNav)
    useEffect(() => {
        const start = () => {
            cancelAnimationFrame(raf.current!);
            setVisible(true);
            setScale(0);
            // Two-frame trick: commit 0, then animate to 80%
            raf.current = requestAnimationFrame(() => {
                raf.current = requestAnimationFrame(() => setScale(0.8));
            });
        };
        window.addEventListener("nav-progress-start", start);
        return () => {
            window.removeEventListener("nav-progress-start", start);
            cancelAnimationFrame(raf.current!);
        };
    }, []);

    // COMPLETE — fires when the new route has actually committed
    useEffect(() => {
        setScale(1);
        const t = setTimeout(() => setVisible(false), 240);
        return () => clearTimeout(t);
    }, [location.pathname]);

    return (
        <div
            className="fixed top-0 left-0 right-0 z-[99999] pointer-events-none"
            style={{
                height: "4px",
                opacity: visible ? 1 : 0,
                transition: "opacity 180ms ease-out",
            }}
        >
            <div
                style={{
                    height: "100%",
                    width: "100%",
                    background: "linear-gradient(90deg, #3b82f6 0%, #2563eb 60%, #1d4ed8 100%)",
                    transform: `scaleX(${scale})`,
                    transformOrigin: "left",
                    boxShadow: "0 0 12px rgba(59,130,246,0.75), 0 0 4px rgba(59,130,246,0.9)",
                    borderRadius: "0 0 4px 0",
                    transition:
                        scale === 0.8
                            ? "transform 500ms cubic-bezier(0.4, 0, 0.2, 1)"
                            : "transform 200ms ease-out",
                }}
            />
        </div>
    );
}