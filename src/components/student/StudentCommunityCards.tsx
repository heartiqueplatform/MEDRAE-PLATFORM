import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function StudentCommunityCards() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 w-full mt-2 px-2 sm:px-0">
            <Card className="overflow-hidden border-0 bg-white/50 dark:bg-muted/30 backdrop-blur-md rounded-2xl shadow-none">
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-bold">Share Medrae</CardTitle>
                    <CardDescription className="text-xs mt-2">
                        Invite colleagues to join Kenya's premier network for medical education and career growth.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 font-bold"
                        onClick={() => {
                            const shareMessage = `Medrae – The Professional Medical Education & Career Network\n\n• Structured modules\n• Expert-led lectures\n• NCK Exam Prep\n\nJoin today: https://medrae.vercel.app`;
                            if (navigator.share) navigator.share({ title: "Medrae Network", text: shareMessage, url: "https://medrae.vercel.app" });
                            else { navigator.clipboard.writeText(shareMessage); alert("Link copied to clipboard!"); }
                        }}
                    >
                        Spread the Word
                    </Button>
                </CardContent>
            </Card>

            <Card className="overflow-hidden border-0 bg-white/50 dark:bg-muted/30 backdrop-blur-md rounded-2xl shadow-none">
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-bold">Official Channel</CardTitle>
                    <CardDescription className="text-xs mt-2">
                        Instant updates on new study content and professional announcements.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <a href="https://whatsapp.com/channel/0029VbBFzgAEawdkJKtRtF2H" target="_blank" rel="noopener noreferrer">
                        <Button className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl h-11 font-bold">
                            Join Channel
                        </Button>
                    </a>
                </CardContent>
            </Card>

            <Card className="overflow-hidden border-0 bg-white/50 dark:bg-muted/30 backdrop-blur-md rounded-2xl shadow-none">
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-bold">Student Community</CardTitle>
                    <CardDescription className="text-xs mt-2">
                        Connect with peers, share resources, and ask questions in real-time.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <a href="https://chat.whatsapp.com/Lad2s4XXx1AA1TtThbMgWV" target="_blank" rel="noopener noreferrer">
                        <Button className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl h-11 font-bold">
                            WhatsApp Group
                        </Button>
                    </a>
                </CardContent>
            </Card>

            <Card className="overflow-hidden border-0 bg-white dark:bg-slate-900 rounded-2xl">
                <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">Telegram Hub</CardTitle>
                    <CardDescription className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                        Complete repository of nursing and medical scholarship materials.
                    </CardDescription>
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-1 flex flex-col sm:flex-row gap-2">
                    <a href="https://t.me/heartiquenursingnexusscholar" target="_blank" rel="noopener noreferrer" className="w-full sm:flex-1">
                        <Button className="w-full h-9 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 text-xs font-bold">Telegram</Button>
                    </a>
                    <a href="https://web.facebook.com/share/g/1AY4nC9Hcp/" target="_blank" rel="noopener noreferrer" className="w-full sm:flex-1">
                        <Button className="w-full h-9 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-bold">Facebook</Button>
                    </a>
                </CardContent>
            </Card>
        </div>
    );
}