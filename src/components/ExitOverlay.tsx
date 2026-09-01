import React, { useEffect, useRef, useState } from 'react';
import { Button } from "@/components/ui/button";

// AUTHENTIC RUBIK'S CUBE WITH HOVER INTERACTION
const RubiksCube = ({ size = 150, speed = 1, initialRotation = 0, position, className }) => {
    const cubeRef = useRef(null);
    const [isHovered, setIsHovered] = useState(false);

    const faces = [
        { name: 'front', color: '#0046ad' }, // Blue
        { name: 'back', color: '#009b48' },  // Green
        { name: 'top', color: '#ffd500' },   // Yellow
        { name: 'bottom', color: '#ffffff' },// White
        { name: 'left', color: '#ff5800' },  // Orange
        { name: 'right', color: '#b71234' }  // Red
    ];

    useEffect(() => {
        const cube = cubeRef.current;
        let rotationX = initialRotation;
        let rotationY = initialRotation;

        const animate = () => {
            // If hovered, spin 5x faster for an "entertaining" effect
            const currentSpeed = isHovered ? speed * 8 : speed;
            rotationX += 0.2 * currentSpeed;
            rotationY += 0.3 * currentSpeed;

            if (cube) {
                cube.style.transform = `rotateX(${rotationX}deg) rotateY(${rotationY}deg)`;
            }
        };

        const interval = setInterval(animate, 20);
        return () => clearInterval(interval);
    }, [speed, initialRotation, isHovered]);

    return (
        <div
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`absolute cursor-pointer transition-transform duration-500 ${isHovered ? 'scale-125' : 'scale-100'} ${className}`}
            style={{ ...position, perspective: `${size * 6}px`, width: `${size}px`, height: `${size}px`, pointerEvents: 'auto' }}
        >
            <div ref={cubeRef} className="w-full h-full relative" style={{ transformStyle: 'preserve-3d' }}>
                {faces.map((face) => (
                    <div key={face.name} className="absolute inset-0 grid grid-cols-3 gap-[3px] bg-[#111] p-[3px] rounded-lg border-[2px] border-[#111]"
                        style={{ transform: getFaceTransform(face.name, size), backfaceVisibility: 'hidden' }}>
                        {[...Array(9)].map((_, i) => (
                            <div key={i} className="rounded-[2px]" style={{ backgroundColor: face.color, boxShadow: 'inset 0 0 5px rgba(0,0,0,0.2)' }} />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
};

const getFaceTransform = (face, size) => {
    const half = size / 2;
    switch (face) {
        case 'front': return `translateZ(${half}px)`;
        case 'back': return `translateZ(-${half}px) rotateY(180deg)`;
        case 'top': return `rotateX(90deg) translateZ(${half}px)`;
        case 'bottom': return `rotateX(-90deg) translateZ(${half}px)`;
        case 'left': return `rotateY(-90deg) translateZ(${half}px)`;
        case 'right': return `rotateY(90deg) translateZ(${half}px)`;
        default: return '';
    }
};

const ExitOverlay = ({ isOpen, onExit }) => {
    // AUDIO LOGIC
    const playExitSound = () => {
        const notificationAudio = new Audio("/sounds/notification.mp3");
        notificationAudio.play().catch(e => console.log("Audio play failed:", e));
    };

    const handleFinalExit = () => {
        playExitSound();
        // Brief delay so the user hears the sound start before the window closes/redirects
        setTimeout(() => {
            onExit();
        }, 300);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 overflow-hidden">

            {/* UNIVERSE BACKGROUND */}
            <div className="absolute inset-0 bg-[#020617] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/30 via-slate-950 to-black" />

            {/* TWO LARGE INTERACTIVE CUBES */}
            <div className="absolute inset-0 pointer-events-none">
                <RubiksCube
                    className="hidden lg:block opacity-70"
                    size={220}
                    speed={0.4}
                    position={{ top: '35%', left: '10%' }}
                />
                <RubiksCube
                    className="hidden lg:block opacity-70"
                    size={220}
                    speed={0.3}
                    initialRotation={45}
                    position={{ top: '35%', right: '10%' }}
                />
            </div>

            {/* THE MOTIVATIONAL WHITE CARD */}
            <div className="relative z-30 bg-white rounded-[3rem] p-10 max-w-md w-full text-center shadow-[0_40px_100px_rgba(0,0,0,0.9)] animate-card-entrance border-t-8 border-blue-600">

                {/* Logo Header */}
                <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner border border-slate-100">
                    <img src="/pwa-192x192.jpeg" alt="Logo" className="w-14 h-14 object-contain rounded-xl" />
                </div>

                <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">
                    Until We Meet Again
                </h2>

                <div className="space-y-4 mb-8">
                    <p className="text-slate-600 leading-relaxed font-medium">
                        Every pause is just a preparation for a bigger leap. Your progress at <span className="text-blue-600 font-bold">Medrae Nursing</span> is safely stored and waiting for you.
                    </p>

                    <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100/50">
                        <p className="text-blue-800 text-sm italic font-semibold">
                            "Education is the passport to the future, for tomorrow belongs to those who prepare for it today."
                        </p>
                    </div>

                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                        ✨ You are doing amazing. See you soon! ✨
                    </p>
                </div>

                {/* Final Button with Audio Trigger */}
                <Button
                    onClick={handleFinalExit}
                    className="w-full h-16 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xl shadow-xl shadow-blue-200 transition-all active:scale-95 transform hover:-translate-y-1"
                >
                    Take Care & Goodbye
                </Button>

                <div className="mt-8 pt-4">
                    <p className="text-[10px] text-slate-300 uppercase tracking-[0.4em] font-black">
                        Medrae Academic Excellence
                    </p>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                    @keyframes cardEntrance {
                        0% { opacity: 0; transform: scale(0.8) translateY(40px); }
                        100% { opacity: 1; transform: scale(1) translateY(0); }
                    }
                    .animate-card-entrance { animation: cardEntrance 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
                `
            }} />
        </div>
    );
};

export default ExitOverlay;