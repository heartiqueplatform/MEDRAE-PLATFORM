import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { survivalApi } from '../../lib/survivalApi';
import { useAuth } from '@/context/AuthProvider';
import {
    ChevronLeft, Users, Loader2, UserPlus, UserMinus,
    BedDouble, BookOpen, MessageSquare, Share2, GraduationCap,
    Phone, CheckCircle2, X,
    ArrowLeftRight
} from 'lucide-react';

const ExamBuddiesPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user } = useAuth();
    const [userGlobalStatus, setUserGlobalStatus] = useState<any>(null);
    const centerId = searchParams.get('centerId');
    const centerName = searchParams.get('name');

    const [buddies, setBuddies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isJoining, setIsJoining] = useState(false);

    // UI State for the "Join" flow
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [phone, setPhone] = useState('');
    const [prefRoommate, setPrefRoommate] = useState(false);
    const [prefStudy, setPrefStudy] = useState(false);

    const currentCycle = "June 2024";

    const fetchData = useCallback(async () => {
        if (!centerId || !user?.id) return;
        try {
            setLoading(true);

            // 1. Get everyone in THIS center
            const data = await survivalApi.getExamBuddies(centerId);
            setBuddies(data || []);

            // 2. NEW: Check if current user is registered ANYWHERE for this cycle
            const globalStatus = await survivalApi.getUserRegistrationStatus(user.id, currentCycle);
            setUserGlobalStatus(globalStatus);

            // Pre-fill phone number if they are already registered elsewhere
            if (globalStatus?.whatsapp_number) {
                setPhone(globalStatus.whatsapp_number);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    }, [centerId, user?.id]);

    // Update the useEffect to use the new name
    useEffect(() => {
        fetchData();
    }, [fetchData]);
    // Is the user registered in the station they are currently looking at?
    const isRegisteredHere = userGlobalStatus?.exam_center_id === centerId;

    // Is the user registered in a DIFFERENT station?
    const isRegisteredElsewhere = userGlobalStatus && userGlobalStatus.exam_center_id !== centerId;
    const currentUserStatus = buddies.find(b => b.user_id === user?.id);

    // Clean phone number helper
    const cleanPhone = (val: string) => {
        let num = val.replace(/\D/g, '');
        if (num.startsWith('0')) num = '254' + num.substring(1);
        return num;
    };

    const handleJoinSubmit = async () => {
        if (!phone || phone.length < 9) {
            alert("Please enter a valid WhatsApp number");
            return;
        }

        try {
            setIsJoining(true);

            // NEW: If they are in another station, leave it first
            if (isRegisteredElsewhere) {
                // Use the ID of the station they are CURRENTLY in
                await survivalApi.leaveExamCenter(userGlobalStatus.exam_center_id);
            }

            // Now join the NEW station
            await survivalApi.joinExamCenter({
                centerId,
                examCycle: currentCycle,
                roommate: prefRoommate,
                study: prefStudy,
                whatsapp_number: cleanPhone(phone)
            });

            setShowJoinModal(false);
            fetchData(); // Refresh the list and status
        } catch (error) {
            alert("Failed to join. Please try again.");
        } finally {
            setIsJoining(false);
        }
    };
    const handleLeave = async () => {
        // 1. Ask for confirmation
        if (!window.confirm(`Are you sure you want to remove your details from ${centerName}?`)) return;

        try {
            setIsJoining(true);

            // 2. Call the API to delete the row
            // We pass the centerId from the URL since the user is removing themselves from THIS station
            await survivalApi.leaveExamCenter(centerId);

            // 3. Refresh the data so the "Count me in" button reappears
            fetchData();

            // Optional: Reset preferences if you want
            setPrefRoommate(false);
            setPrefStudy(false);
        } catch (error) {
            console.error("Error leaving center:", error);
            alert("Action failed. Please try again.");
        } finally {
            setIsJoining(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-background pb-20 font-sans">
            {/* Header */}
            <div className="sticky -top-4 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-4 border-b border-slate-200/50 dark:border-slate-800/50">
                <div className="flex items-center gap-4 max-w-2xl mx-auto">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition-transform active:scale-90">
                        <ChevronLeft size={20} />
                    </button>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-lg font-heavy dark:text-white truncate tracking-tight">Exam Buddies</h1>
                        <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest truncate">
                            {centerName || 'Exam Center'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="p-4 max-w-2xl mx-auto space-y-2">

                {/* Status Section */}
                <div className="relative overflow-hidden bg-white dark:bg-muted/30 rounded-xl p-8 border border-slate-200/60 dark:border-slate-800 shadow-sm">
                    <div className="relative z-10 flex flex-col items-center text-center">
                        <div className="h-16 w-16 bg-blue-50 dark:bg-blue-500/10 rounded-3xl flex items-center justify-center text-blue-600 mb-4">
                            <Users size={32} />
                        </div>
                        <h2 className="text-xl font-black dark:text-white mb-1">Sitting here in {currentCycle}?</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Join the list so others can connect with you for study or logistics.</p>
                        {/* REPLACE the old {!currentUserStatus ? (...) : (...)} block with this: */}

                        {!userGlobalStatus ? (
                            // CASE 1: Not joined anywhere yet
                            <button
                                onClick={() => setShowJoinModal(true)}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95"
                            >
                                <UserPlus size={20} />
                                Count me in
                            </button>
                        ) : isRegisteredHere ? (
                            // CASE 2: Already joined THIS station
                            <button
                                onClick={handleLeave}
                                disabled={isJoining}
                                className="text-rose-500 dark:text-rose-400 text-sm font-bold flex items-center gap-2 hover:underline"
                            >
                                <UserMinus size={16} />
                                Remove my details from {centerName}
                            </button>
                        ) : (
                            // CASE 3: Joined a DIFFERENT station
                            <button
                                onClick={() => setShowJoinModal(true)}
                                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95"
                            >
                                <div className="flex flex-col items-center">
                                    <span className="flex items-center gap-2">
                                        <ArrowLeftRight size={20} />
                                        Switch to this station
                                    </span>
                                    <span className="text-[10px] opacity-80 font-medium">
                                        (Currently at {userGlobalStatus.exam_center?.name})
                                    </span>
                                </div>
                            </button>
                        )}

                    </div>

                </div>
                {/* Smart WhatsApp Group Banner */}
                <div className="relative group overflow-hidden rounded-xl p-8 shadow-2xl shadow-emerald-200/50 dark:shadow-none border border-emerald-400/20">

                    {/* 1. Rich Gradient & Image Background Layer */}
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-700 transition-transform duration-500 group-hover:scale-105" />

                    {/* 2. Abstract Background Pattern/Image */}
                    <div
                        className="absolute inset-0 opacity-10 mix-blend-overlay bg-cover bg-center"
                        style={{ backgroundImage: `url('https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80')` }}
                    />

                    {/* 3. Decorative Glowing Orb */}
                    <div className="absolute -top-12 -right-12 h-40 w-40 bg-white/20 rounded-full blur-3xl group-hover:bg-white/30 transition-colors" />

                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
                        {/* Left Side: Content */}
                        <div className="flex-1 text-center md:text-left">
                            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-emerald-50 mb-3 border border-white/20">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                                </span>
                                Live Community
                            </div>

                            <h3 className="text-2xl font-black text-white leading-tight mb-2 tracking-tighter">
                                Medrae Exam <br />Candidate Hub
                            </h3>

                            <p className="text-emerald-50/80 text-sm font-medium max-w-[240px] mx-auto md:mx-0">
                                Discuss clinical papers, exam tips, and logistics with everyone.
                            </p>
                        </div>

                        {/* Right Side: Action & Icon */}
                        <div className="flex flex-col items-center gap-4 min-w-[160px]">
                            {/* High-End WhatsApp Icon */}
                            <div className="relative">
                                <div className="absolute inset-0 bg-white/20 blur-xl rounded-full animate-pulse" />
                                <div className="relative h-16 w-16 bg-white rounded-3xl flex items-center justify-center shadow-xl rotate-3 group-hover:rotate-6 transition-transform">
                                    <svg viewBox="0 0 24 24" className="w-10 h-10 fill-emerald-500">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                    </svg>
                                </div>
                            </div>

                            <a
                                href="https://chat.whatsapp.com/Lad2s4XXx1AA1TtThbMgWV"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full bg-white text-emerald-700 hover:bg-emerald-50 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest text-center transition-all shadow-lg active:scale-95"
                            >
                                Join Now
                            </a>
                        </div>
                    </div>
                </div>
                {/* Candidates List */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="font-black text-slate-800 dark:text-slate-200 flex items-center gap-2 text-lg">
                            Candidates
                            <span className="text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-3 py-0.5 rounded-full text-xs">{buddies.length}</span>
                        </h3>
                    </div>

                    {loading ? (
                        <div className="py-20 text-center">
                            <Loader2 className="animate-spin mx-auto text-blue-600 mb-2" />
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Buddies...</p>
                        </div>
                    ) : buddies.length > 0 ? (
                        <div className="grid gap-4">
                            {buddies.map((buddy) => (
                                <div key={buddy.id} className="group bg-white dark:bg-muted/30 p-4 rounded-[1.5rem] border border-slate-100 dark:border-slate-800/50 flex items-center gap-4 transition-all hover:shadow-md">
                                    <div className="relative">
                                        <img
                                            src={buddy.student?.avatar_url || `https://ui-avatars.com/api/?name=${buddy.student?.name}&background=random`}
                                            className="h-14 w-14 rounded-2xl object-cover"
                                            alt=""
                                        />
                                        <div className="absolute -bottom-1 -right-1 h-5 w-5 bg-emerald-500 border-4 border-white dark:border-slate-900 rounded-full"></div>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-slate-900 dark:text-white truncate">{buddy.student?.name}</h4>
                                        <div className="flex items-center gap-1 text-slate-500">
                                            <GraduationCap size={12} />
                                            <p className="text-[10px] font-bold uppercase tracking-tight truncate">
                                                {buddy.student?.institution || 'Medical Student'}
                                            </p>
                                        </div>

                                        <div className="flex gap-1.5 mt-2">
                                            {buddy.is_looking_for_roommate && (
                                                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[9px] font-black uppercase rounded-md flex items-center gap-1">
                                                    <BedDouble size={10} /> Room
                                                </span>
                                            )}
                                            {buddy.is_looking_for_study_partner && (
                                                <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[9px] font-black uppercase rounded-md flex items-center gap-1">
                                                    <BookOpen size={10} /> Study
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <a
                                        href={`https://wa.me/${buddy.whatsapp_number || cleanPhone(buddy.student?.phone || '')}?text=${encodeURIComponent(`Hi ${buddy.student?.name}, I'm also sitting exams at ${centerName}. Found you on Medrae Hub!`)}`}
                                        target="_blank"
                                        className="h-12 w-12 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 rounded-2xl flex items-center justify-center transition-all group-hover:bg-emerald-500 group-hover:text-white active:scale-90"
                                    >
                                        <MessageSquare size={20} />
                                    </a>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16 bg-slate-100/50 dark:bg-slate-900/50 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                            <Users className="mx-auto text-slate-300 mb-3" size={40} />
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No one here yet</p>
                        </div>
                    )}
                </div>
            </div>

            {/* JOIN MODAL */}
            {showJoinModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowJoinModal(false)} />

                    <div className="relative w-full max-w-md bg-white dark:bg-muted/30 rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom-10 duration-300">
                        <button onClick={() => setShowJoinModal(false)} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600">
                            <X size={24} />
                        </button>

                        {/* --- EDITED HEADER SECTION --- */}
                        <h3 className="text-2xl font-black dark:text-white mb-2">
                            {isRegisteredElsewhere ? "Switch Stations?" : "Almost there!"}
                        </h3>
                        <p className="text-slate-500 text-sm mb-8">
                            {isRegisteredElsewhere
                                ? `Confirming will remove you from "${userGlobalStatus.exam_center?.name}" and move you to "${centerName}".`
                                : "Make sure your WhatsApp number is correct so buddies can reach you."}
                        </p>
                        {/* ------------------------------ */}

                        <div className="space-y-6">
                            {/* Phone Input */}
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 mb-2 ml-1">WhatsApp Number</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400">
                                        <Phone size={18} />
                                    </div>
                                    <input
                                        type="tel"
                                        placeholder="0712 345 678"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-4 pl-12 pr-4 text-lg font-bold dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            </div>

                            {/* Preferences */}
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setPrefRoommate(!prefRoommate)}
                                    className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${prefRoommate ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600' : 'border-slate-100 dark:border-slate-800 text-slate-400'}`}
                                >
                                    <BedDouble size={20} />
                                    <span className="text-[10px] font-black uppercase">Need Room</span>
                                </button>
                                <button
                                    onClick={() => setPrefStudy(!prefStudy)}
                                    className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${prefStudy ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20 text-purple-600' : 'border-slate-100 dark:border-slate-800 text-slate-400'}`}
                                >
                                    <BookOpen size={20} />
                                    <span className="text-[10px] font-black uppercase">Study Partner</span>
                                </button>
                            </div>

                            {/* --- EDITED BUTTON SECTION --- */}
                            <button
                                onClick={handleJoinSubmit}
                                disabled={isJoining}
                                className={`w-full ${isRegisteredElsewhere ? 'bg-amber-500' : 'bg-blue-600'} hover:scale-[1.02] text-white font-black py-5 rounded-2xl flex items-center justify-center gap-3 transition-all disabled:opacity-50 shadow-xl`}
                            >
                                {isJoining ? (
                                    <Loader2 className="animate-spin" />
                                ) : (
                                    <CheckCircle2 size={20} />
                                )}

                                {isJoining
                                    ? "Saving..."
                                    : isRegisteredElsewhere
                                        ? "Confirm Switch"
                                        : "Confirm & Join"
                                }
                            </button>

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExamBuddiesPage;