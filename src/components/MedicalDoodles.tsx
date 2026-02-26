"use client";

import { useMemo } from "react";

const icons = ["cap", "heart", "check", "shield"];

function getRandom(min: number, max: number) {
    return Math.random() * (max - min) + min;
}

export function MedicalDoodles() {

    // ✅ Generate positions only once
    const doodles = useMemo(() => {
        return Array.from({ length: 40 }).map((_, i) => ({
            type: icons[i % icons.length],
            top: `${getRandom(0, 95)}%`,
            left: `${getRandom(0, 95)}%`,
            rotate: `rotate(${getRandom(-25, 25)}deg)`,
            size: `${getRandom(18, 32)}px`,
            opacity: getRandom(0.4, 0.9),
        }));
    }, []);

    return (
        <div className="absolute inset-0 overflow-hidden
                    opacity-[0.07] dark:opacity-[0.12]">

            {doodles.map((item, i) => (
                <svg
                    key={i}
                    className="absolute text-muted-foreground pointer-events-none"
                    style={{
                        top: item.top,
                        left: item.left,
                        transform: item.rotate,
                        width: item.size,
                        height: item.size,
                        opacity: item.opacity,
                    }}
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.4}
                    stroke="currentColor"
                >
                    {item.type === "cap" && (
                        <path strokeLinecap="round" strokeLinejoin="round"
                            d="M4.26 10.147A60.438 60.438 0 0 0 12 20.904A60.46 60.46 0 0 0 19.7 10.147M4.26 10.147A50.717 50.717 0 0 1 12 13.489A50.702 50.702 0 0 1 19.7 10.147"
                        />
                    )}
                    {item.type === "heart" && (
                        <path strokeLinecap="round" strokeLinejoin="round"
                            d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
                        />
                    )}
                    {item.type === "check" && (
                        <path strokeLinecap="round" strokeLinejoin="round"
                            d="m4.5 12.75 6 6 9-13.5"
                        />
                    )}
                    {item.type === "shield" && (
                        <path strokeLinecap="round" strokeLinejoin="round"
                            d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z"
                        />
                    )}
                </svg>
            ))}

        </div>
    );
}