"use client";

import { Button } from "@/components/ui/button";
import { Share2, Quote, MessageCircle, Facebook, Send } from "lucide-react";

export default function ShareButtonsGroup({
    user,
    q,
}: {
    user: any;
    q: {
        question_text: string;
        correct_answer: string;
    };
}) {
    const siteLink = typeof window !== "undefined" ? window.location.origin : "";

    // Preservation of your original logic
    const handleShare = (platform: 'wa' | 'fb' | 'tg') => {
        if (!user) {
            alert("Please log in to share!");
            return;
        }

        const message = `Hey! Have you checked out this website? It has great questions for NCK, KMTC revision, and nursing. Here's one:\n\nQuestion: ${q.question_text}\nAnswer: ${q.correct_answer}\n\nExplore more here: ${siteLink}`;
        const encodedMsg = encodeURIComponent(message);

        if (platform === 'wa') {
            window.open(`https://wa.me/?text=${encodedMsg}`, "_blank");
        } else if (platform === 'fb') {
            const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(siteLink)}&quote=${encodedMsg}`;
            window.open(fbUrl, "_blank");
        } else if (platform === 'tg') {
            const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(siteLink)}&text=${encodedMsg}`;
            window.open(tgUrl, "_blank");
        }
    };

    return (
        <div className="w-full max-w-lg mx-auto mt-6 overflow-hidden rounded-[2rem] border border-gray-100 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl shadow-2xl shadow-blue-500/5">

            {/* SAMS-STYLE HEADER */}
            <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 p-5 flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                    <Share2 className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest leading-none">
                        Share Question
                    </h3>
                    <p className="text-[10px] text-blue-100 font-medium mt-1">
                        Help your colleagues master these concepts
                    </p>
                </div>
            </div>

            <div className="p-6 space-y-6">
                {/* STYLIZED PREVIEW BOX */}
                <div className="relative p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
                    <Quote className="absolute -top-2 -left-2 w-6 h-6 text-blue-500/20" />
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 italic line-clamp-2 leading-relaxed">
                        "{q.question_text}"
                    </p>
                </div>

                {/* SOCIAL BUTTONS GRID */}
                <div className="grid grid-cols-3 gap-3">

                    {/* WHATSAPP */}
                    <button
                        onClick={() => handleShare('wa')}
                        className="group flex flex-col items-center gap-2 p-3 rounded-2xl transition-all hover:bg-green-50 dark:hover:bg-green-900/20"
                    >
                        <div className="p-3 bg-green-100 dark:bg-green-900/40 rounded-xl group-hover:scale-110 transition-transform">
                            <svg className="w-5 h-5 fill-[#25D366]" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                            </svg>
                        </div>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">WhatsApp</span>
                    </button>

                    {/* FACEBOOK */}
                    <button
                        onClick={() => handleShare('fb')}
                        className="group flex flex-col items-center gap-2 p-3 rounded-2xl transition-all hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    >
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/40 rounded-xl group-hover:scale-110 transition-transform">
                            <Facebook className="w-5 h-5 text-[#1877F2] fill-current" />
                        </div>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Facebook</span>
                    </button>

                    {/* TELEGRAM */}
                    <button
                        onClick={() => handleShare('tg')}
                        className="group flex flex-col items-center gap-2 p-3 rounded-2xl transition-all hover:bg-sky-50 dark:hover:bg-sky-900/20"
                    >
                        <div className="p-3 bg-sky-100 dark:bg-sky-900/40 rounded-xl group-hover:scale-110 transition-transform">
                            <Send className="w-5 h-5 text-[#26A5E4] fill-current" />
                        </div>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Telegram</span>
                    </button>

                </div>
            </div>

            <div className="bg-gray-50/50 dark:bg-gray-900/50 p-3 text-center border-t border-gray-100 dark:border-gray-800">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                    Secure Knowledge Sharing Enabled
                </p>
            </div>
        </div>
    );
}