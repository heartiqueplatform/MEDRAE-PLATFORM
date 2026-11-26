"use client";

import { Suspense, useEffect, useState } from "react";
import { Lottie } from "lottie-react";
import shareAnimation from "@/assets/lottie/Share.json";

interface ShareLottieProps {
    className?: string;
    loop?: boolean;
}

export default function ShareLottie({
    className,
    loop = true,
}: ShareLottieProps) {
    const [reducedMotion, setReducedMotion] = useState(false);
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
        setReducedMotion(mq.matches);
        const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
        mq.addEventListener?.("change", onChange);
        return () => mq.removeEventListener?.("change", onChange);
    }, []);

    useEffect(() => {
        const onVis = () => setVisible(!document.hidden);
        document.addEventListener("visibilitychange", onVis);
        return () => document.removeEventListener("visibilitychange", onVis);
    }, []);

    return (
        <div className={`pointer-events-none w-full h-full ${className ?? ""}`}>
            <Suspense fallback={null}>
                <Lottie
                    src={shareAnimation}
                    loop={loop && !reducedMotion && visible}
                    autoplay={!reducedMotion}
                    style={{ width: "100%", height: "100%" }}
                />
            </Suspense>
        </div>
    );
}