"use client";

import React, { useState } from "react";

export default function FloatingHearts({ children, bubbleCount = 5 }) {
    const [hearts, setHearts] = useState([]);

    const spawnHearts = () => {
        const newHearts = Array.from({ length: bubbleCount }).map(() => ({
            id: Date.now() + Math.random(),
            left: Math.random() * 60 - 30,
            size: Math.random() * 12 + 8,
            duration: Math.random() * 1 + 1.5,
            color: `hsl(${Math.random() * 360}, 80%, 60%)`,
        }));

        setHearts((prev) => [...prev, ...newHearts]);

        setTimeout(() => {
            setHearts((prev) => prev.filter((h) => !newHearts.includes(h)));
        }, 2500);
    };

    // Trigger hearts on hover and tap/click
    const handleEvent = (e) => {
        spawnHearts();
    };


    return (
        <div
            className="relative w-full"
            onMouseEnter={handleEvent}
            onClick={handleEvent}
            onTouchStart={handleEvent}
        >
            {children}

            <div className="absolute inset-0 pointer-events-none overflow-visible">
                {hearts.map((heart) => (
                    <span
                        key={heart.id}
                        className="absolute rounded-full animate-float"
                        style={{
                            left: `calc(50% + ${heart.left}px)`,
                            bottom: 0,
                            width: `${heart.size}px`,
                            height: `${heart.size}px`,
                            backgroundColor: heart.color,
                            animationDuration: `${heart.duration}s`,
                        }}
                    />
                ))}
            </div>

            <style jsx>{`
      @keyframes float {
        0% { transform: translateY(0) scale(1) rotate(0deg); opacity: 1; }
        25% { transform: translateY(-25%) scale(1.2) rotate(-10deg); }
        50% { transform: translateY(-50%) scale(1.4) rotate(10deg); }
        75% { transform: translateY(-75%) scale(1.3) rotate(-5deg); }
        100% { transform: translateY(-120px) scale(1.5) rotate(0deg); opacity: 0; }
      }
      .animate-float {
        animation-name: float;
        animation-timing-function: ease-out;
        animation-fill-mode: forwards;
      }
    `}</style>
        </div>
    );

}
