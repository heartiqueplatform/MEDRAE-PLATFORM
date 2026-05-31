// NEW
import React, { useState, useEffect } from 'react'; // Added useEffect
import { useNavigate } from 'react-router-dom';
import { survivalApi } from '../../lib/survivalApi';
import { supabase } from '@/lib/supabaseClient';
import {
    ChevronLeft, Save, Hospital, MapPin, Stethoscope,
    Phone, Loader2, Camera, X, Lock, Sparkles // Added Lock and Sparkles
} from 'lucide-react';

const AddPlacementPage = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [isPremium, setIsPremium] = useState(false); // Track subscription
    const [checkingSub, setCheckingSub] = useState(true); // Loading check
    const [showLockOverlay, setShowLockOverlay] = useState(false); // Toggle lock message

    // NEW: State for photos
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);

    const [formData, setFormData] = useState({
        hospital_name: '',
        location: '',
        county: '',
        ward_specialties: '',
        student_friendly: true,
        supervisor_contact: '',
        intake_notes: ''
    });

    // NEW: Handle photo selection
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            if (files.length + selectedFiles.length > 3) {
                alert("Maximum 3 photos allowed");
                return;
            }
            setSelectedFiles([...selectedFiles, ...files]);
            const newPreviews = files.map(file => URL.createObjectURL(file));
            setPreviews([...previews, ...newPreviews]);
        }
    };
    useEffect(() => {
        const checkSubscription = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    setCheckingSub(false);
                    return;
                }

                const { data: sub, error } = await supabase
                    .from("subscriptions")
                    .select("plan_type, is_active, expires_at")
                    .eq("user_id", user.id)
                    .maybeSingle();

                if (sub && !error) {
                    const now = new Date();
                    const expiry = sub.expires_at ? new Date(sub.expires_at) : null;
                    const isPaid = sub.plan_type === 'pro' || sub.plan_type === 'premium';
                    const isActive = sub.is_active === true;
                    const notExpired = expiry ? expiry > now : true;

                    if (isPaid && isActive && notExpired) {
                        setIsPremium(true);
                    }
                }
            } catch (err) {
                console.error("Sub check error:", err);
            } finally {
                setCheckingSub(false);
            }
        };

        checkSubscription();
    }, []);
    // NEW: Remove photo from list
    const removePhoto = (index: number) => {
        setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
        setPreviews(previews.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // NEW: Upload Logic
            const uploadedUrls = [];
            for (const file of selectedFiles) {
                const fileExt = file.name.split('.').pop();
                const fileName = `${Math.random()}.${fileExt}`;
                const filePath = `placement-sites/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('housing_photos') // We use the same bucket for simplicity
                    .upload(filePath, file);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('housing_photos')
                    .getPublicUrl(filePath);

                uploadedUrls.push(publicUrl);
            }

            // Save to database including images
            await survivalApi.createPlacementSite({
                ...formData,
                images: uploadedUrls
            });

            alert("Hospital added to Placement Directory!");
            navigate('/survival-hub/placements');
        } catch (error: any) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-10 dark:bg-background">
            <div className="sticky -top-4 z-20 flex items-center gap-4 bg-white/90 p-4 backdrop-blur-md dark:bg-slate-900/90 border-b dark:border-slate-800">
                <button onClick={() => navigate(-1)} className="p-2"><ChevronLeft /></button>
                <h1 className="text-lg font-bold dark:text-white">Add Placement Site</h1>
            </div>

            <form onSubmit={handleSubmit} className="mx-auto max-w-xl p-4 space-y-2">

                {/* 1. HOSPITAL INFO */}
                <div className="bg-white dark:bg-muted/30 rounded-2xl p-5 border dark:border-slate-800 space-y-4">
                    <div className="flex items-center gap-2 text-amber-600 font-bold text-xs uppercase tracking-widest">
                        <Hospital size={16} /> Step 1: Hospital Info
                    </div>
                    <input required placeholder="Hospital Name" className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-amber-500" onChange={e => setFormData({ ...formData, hospital_name: e.target.value })} />

                    <div className="grid grid-cols-2 gap-2">
                        <input required placeholder="County" className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-amber-500" onChange={e => setFormData({ ...formData, county: e.target.value })} />
                        <input required placeholder="Town/Location" className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-amber-500" onChange={e => setFormData({ ...formData, location: e.target.value })} />
                    </div>
                </div>

                {/* 2. PHOTO UPLOAD SECTION */}
                <div className="bg-white dark:bg-muted/30 rounded-2xl p-5 border dark:border-slate-800 space-y-4">
                    <div className="flex items-center gap-2 text-blue-500 font-bold text-xs uppercase tracking-widest">
                        <Camera size={16} /> Step 2: Site Photos
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        {previews.map((src, index) => (
                            <div key={index} className="relative aspect-square rounded-xl overflow-hidden border dark:border-slate-700">
                                <img src={src} className="h-full w-full object-cover" alt="Preview" />
                                <button
                                    type="button"
                                    onClick={() => removePhoto(index)}
                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow-lg"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        ))}

                        {selectedFiles.length < 3 && (
                            <label className="flex flex-col items-center justify-center aspect-square rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 cursor-pointer hover:bg-slate-100 transition-colors">
                                <Camera className="text-slate-400" size={24} />
                                <span className="text-[10px] font-bold text-slate-400 mt-1">Add Photo</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                    onChange={handleFileChange}
                                />
                            </label>
                        )}
                    </div>
                    <p className="text-[10px] text-slate-400 italic text-center">Add up to 3 photos of the gate, main ward, or signage.</p>
                </div>

                {/* 3. WARD DETAILS */}
                <div className="bg-white dark:bg-muted/30 rounded-2xl p-5 border dark:border-slate-800 space-y-4">
                    <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-widest">
                        <Stethoscope size={16} /> Step 3: Ward Details
                    </div>
                    <input required placeholder="Specialties (e.g. Med/Surg, Paeds)" className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-amber-500" onChange={e => setFormData({ ...formData, ward_specialties: e.target.value })} />
                    <textarea placeholder="Intake Notes (e.g. Bring own scrubs)" className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-amber-500 min-h-[100px]" onChange={e => setFormData({ ...formData, intake_notes: e.target.value })} />
                </div>

                {/* 4. CONTACT INFO */}
                <div className="bg-white dark:bg-muted/30 rounded-2xl p-5 border dark:border-slate-800 space-y-4">
                    <div className="flex items-center gap-2 text-rose-600 font-bold text-xs uppercase tracking-widest">
                        <Phone size={16} /> Step 4: Contact Info
                    </div>
                    <input placeholder="WhatsApp Number or Email" className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-amber-500" onChange={e => setFormData({ ...formData, supervisor_contact: e.target.value })} />
                </div>

                {/* SECTION: SAVE / LOCK LOGIC */}
                <div className="relative pt-4">
                    {/* 1. THE FLOATING OVERLAY (Only shows when free user clicks) */}
                    {showLockOverlay && (
                        <div className="absolute bottom-full left-0 right-0 mb-4 animate-in fade-in slide-in-from-bottom-4 duration-300 z-30">
                            <div className="bg-white dark:bg-muted/30 border-2 border-amber-500 rounded-2xl p-6 shadow-2xl">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2 text-amber-600 font-bold uppercase text-[10px] tracking-widest">
                                        <Sparkles size={14} /> Contributor Verification
                                    </div>
                                    <button onClick={() => setShowLockOverlay(false)}>
                                        <X size={18} className="text-slate-400 hover:text-slate-600" />
                                    </button>
                                </div>

                                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                    Upgrade to Publish Sites
                                </h3>
                                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                                    Placement data is vital for students. To ensure accuracy and prevent unverified listings, only <b>Medrae Pro</b> members can contribute to this directory.
                                </p>

                                <button
                                    type="button"
                                    onClick={() => navigate('/subscription')}
                                    className="w-full mt-4 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold py-3 rounded-xl transition-all shadow-md active:scale-95"
                                >
                                    Upgrade & Unlock Access
                                </button>
                            </div>
                            {/* Small arrow pointing down */}
                            <div className="w-4 h-4 bg-white dark:bg-muted/30 border-r-2 border-b-2 border-amber-500 rotate-45 mx-auto -mt-2"></div>
                        </div>
                    )}

                    {/* 2. THE MAIN ACTION BUTTON */}
                    <button
                        disabled={loading || checkingSub}
                        type={isPremium ? "submit" : "button"}
                        onClick={() => {
                            if (!isPremium) {
                                setShowLockOverlay(true);
                            }
                        }}
                        className={`w-full rounded-2xl p-5 font-bold transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg
            ${isPremium
                                ? "bg-amber-600 text-white shadow-amber-200 dark:shadow-none"
                                : "bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-default shadow-none"
                            }`}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="animate-spin" />
                                <span>Saving Site...</span>
                            </>
                        ) : (
                            <>
                                {isPremium ? <Save size={20} /> : <Lock size={20} />}
                                <span>{isPremium ? "Save Placement Site" : " Upgrade to Publish Sites"}</span>
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AddPlacementPage;