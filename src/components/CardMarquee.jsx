import { useRef, useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { TrendingUp, Target as TargetIcon, Clock, Trophy } from 'lucide-react';

const StaticCard = ({ card, onClick }) => (
    <Card
        className="relative overflow-hidden w-[360px] h-[640px] rounded-2xl border-white/10 bg-slate-950 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex-shrink-0 hover:scale-[1.02] active:scale-95 transition-all duration-500 cursor-pointer group"
        onClick={onClick}
    >
        {/* Background Image */}
        <div className="absolute inset-0">
            <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-110"
                style={{ backgroundImage: `url('${card.bgImage}')` }}
            />

            {/* SMART OVERLAY: Dark gradient + blur for readability */}
            <div className="absolute inset-0 z-10">
                {/* Deep dark gradient */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/80 to-black/95" />

                {/* Smart blur overlay - blurs only the background behind text */}
                <div className="absolute inset-0 backdrop-blur-[2px] bg-black/20" />

                {/* Extra dark vignette at edges for contrast */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/40" />
            </div>
        </div>

        <div className="relative z-20 h-full p-8 flex flex-col justify-between">
            {/* Header: Small Glass Icon */}
            <div className="space-y-6">
                <div className="inline-flex p-2.5 bg-white/10 backdrop-blur-2xl rounded-xl border border-white/20 shadow-2xl group-hover:bg-blue-600/30 group-hover:border-blue-500/50 transition-all duration-500">
                    <card.icon className="h-5 w-5 text-white" />
                </div>
                <div>
                    <p className="text-[14px] uppercase tracking-[5px] font-black text-blue-400 leading-none drop-shadow-lg">
                        {card.title}
                    </p>
                </div>
            </div>

            {/* Content: Smaller, readable numbers with text-shadow */}
            <div className="space-y-3">
                <h3 className="text-white text-[18px] font-bold uppercase tracking-widest drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
                    {card.subtitle}
                </h3>
                <div className="flex flex-col">
                    <span className="text-7xl font-black tracking-tighter text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.9)] leading-none">
                        {card.value}
                    </span>
                    <div className="mt-4 h-1.5 w-16 rounded-full bg-blue-500/50 group-hover:w-32 group-hover:bg-blue-500 transition-all duration-500 shadow-[0_0_20px_rgba(59,130,246,0.3)]" />
                </div>
            </div>
        </div>

        {/* Premium Light Sweep effect */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none" />
    </Card>
);
const CardMarquee = ({
    studyProgress = 0,
    quizCount = 0,
    targetScore = 50,
    studyStreak = 0,
    bestStreak = 0,
    onNavigate = null
}) => {
    const [isMobile, setIsMobile] = useState(false);
    const containerRef = useRef(null);
    const scrollRef = useRef(null);
    const requestRef = useRef(null);
    const lastTimestampRef = useRef(null);
    const currentXRef = useRef(0);
    const autoScrollRef = useRef(true);

    const cards = [
        {
            title: "Performance",
            subtitle: " Progress",
            icon: TrendingUp,
            bgImage: "/indexbackground3.jpg",
            value: `${studyProgress ?? 0}%`
        },
        {
            title: "Activity",
            subtitle: "Quizzes",
            icon: TargetIcon,
            bgImage: "/indexbackground6.jpg",
            value: quizCount ?? 0
        },
        {
            title: "Objective",
            subtitle: "Target",
            icon: TargetIcon,
            bgImage: "/background05.jpg",
            value: `${targetScore ?? 50}%`
        },
        {
            title: "Consistency",
            subtitle: "Current",
            icon: Clock,
            bgImage: "/indexbackground5.jpg",
            value: `${studyStreak ?? 0}d`
        },
        {
            title: "Milestone",
            subtitle: "Record",
            icon: Trophy,
            bgImage: "/indexbackground2.jpg",
            value: `${bestStreak ?? 0}d`
        }
    ];

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 1024);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const animate = useCallback((timestamp) => {
        if (!lastTimestampRef.current) lastTimestampRef.current = timestamp;
        const delta = timestamp - lastTimestampRef.current;
        lastTimestampRef.current = timestamp;

        if (!isMobile && autoScrollRef.current && scrollRef.current) {
            currentXRef.current -= 0.03 * delta;
            const contentWidth = scrollRef.current.scrollWidth / 2;
            if (Math.abs(currentXRef.current) >= contentWidth) currentXRef.current = 0;
            scrollRef.current.style.transform = `translate3d(${currentXRef.current}px, 0, 0)`;
        }
        requestRef.current = requestAnimationFrame(animate);
    }, [isMobile]);

    useEffect(() => {
        requestRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(requestRef.current);
    }, [animate]);

    const handleMouseDown = (e) => {
        if (isMobile) return;
        const startX = e.clientX;
        const startTranslate = currentXRef.current;
        autoScrollRef.current = false;
        const move = (m) => {
            currentXRef.current = startTranslate + (m.clientX - startX);
            if (scrollRef.current) scrollRef.current.style.transform = `translate3d(${currentXRef.current}px, 0, 0)`;
        };
        const up = () => {
            document.removeEventListener('mousemove', move);
            document.removeEventListener('mouseup', up);
            setTimeout(() => { autoScrollRef.current = true; }, 2000);
        };
        document.addEventListener('mousemove', move);
        document.addEventListener('mouseup', up);
    };

    return (
        <div className="relative w-full py-10 overflow-hidden" ref={containerRef}>
            {isMobile ? (
                <div className="flex overflow-x-auto pb-12 px-4 gap-4 snap-x snap-mandatory no-scrollbar">
                    {cards.map((card, i) => (
                        <div key={i} className="snap-center">
                            <StaticCard card={card} onClick={() => onNavigate?.("/Medrae-quizzes")} />
                        </div>
                    ))}
                </div>
            ) : (
                <div
                    className="flex cursor-grab active:cursor-grabbing will-change-transform"
                    style={{ width: 'max-content' }}
                    ref={scrollRef}
                    onMouseDown={handleMouseDown}
                >
                    <div className="flex gap-4 px-4">
                        {[...cards, ...cards].map((card, i) => (
                            <StaticCard key={i} card={card} onClick={() => onNavigate?.("/Medrae-quizzes")} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CardMarquee;