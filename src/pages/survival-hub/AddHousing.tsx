import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { survivalApi } from '../../lib/survivalApi';
import { supabase } from '@/lib/supabaseClient';
import {
    ChevronLeft, Save, Building2, Wallet,
    Phone, Wifi, Droplets, ShieldCheck, Loader2, AlertCircle,
    MapPin, Camera, X, Lock,
    Sparkles
} from 'lucide-react';
import SmartSelect from '@/components/ui/SmartSelect';

const AddHousingPage = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [centers, setCenters] = useState<{ id: string, name: string, county: string }[]>([]);

    // NEW
    const [isPremium, setIsPremium] = useState(false); // Check for Pro/Premium
    const [checkingSub, setCheckingSub] = useState(true); // Loading state for the check
    const [showLockOverlay, setShowLockOverlay] = useState(false); // To toggle the lock message
    // NEW: State to hold the actual image files and their preview URLs
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);

    const [category, setCategory] = useState<'exam' | 'hospital' | 'placement'>('exam');
    const [options, setOptions] = useState<{ id: string, name: string }[]>([]);

    const [formData, setFormData] = useState({
        name: '',
        price_per_night: '',
        distance_to_center: '',
        contact_phone: '',
        contact_name: '',
        has_wifi: false,
        has_water: true,
        has_security: true,
        notes: '',
        exam_center_id: null as string | null,
        nearby_hospital_id: null as string | null,
        placement_site_id: null as string | null
    });

    // NEW: Logic to handle when a user picks photos
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);

            if (files.length + selectedFiles.length > 3) {
                alert("You can only upload a maximum of 3 photos.");
                return;
            }

            const newFiles = [...selectedFiles, ...files];
            setSelectedFiles(newFiles);

            // Create preview URLs so the user sees their photos immediately
            const newPreviews = files.map(file => URL.createObjectURL(file));
            setPreviews([...previews, ...newPreviews]);
        }
    };

    // NEW: Remove a photo if they clicked the 'X'
    const removePhoto = (index: number) => {
        const updatedFiles = selectedFiles.filter((_, i) => i !== index);
        const updatedPreviews = previews.filter((_, i) => i !== index);
        setSelectedFiles(updatedFiles);
        setPreviews(updatedPreviews);
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
    useEffect(() => {
        const loadData = async () => {
            setOptions([]);
            try {
                if (category === 'exam') {
                    const data = await survivalApi.getExamCenters();
                    setOptions(data.map(i => ({ id: i.id, name: i.name })));
                } else if (category === 'hospital') {
                    const { data } = await supabase.from('oriented_nearby_hospitals').select('id, hospital_name');
                    setOptions(data?.map(i => ({ id: i.id, name: i.hospital_name })) || []);
                } else {
                    const data = await survivalApi.getPlacements();
                    setOptions(data.map(i => ({ id: i.id, name: i.hospital_name })));
                }
            } catch (err) {
                console.error("Link error:", err);
            }
        };
        loadData();
    }, [category]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const hasSelectedAnchor = formData.exam_center_id || formData.nearby_hospital_id || formData.placement_site_id;
        if (!hasSelectedAnchor) {
            alert("Please select where this housing belongs first!");
            return;
        }

        setLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Please log in first!");

            // NEW: STEP 1 - UPLOAD IMAGES TO STORAGE
            const uploadedImageUrls = [];

            for (const file of selectedFiles) {
                const fileExt = file.name.split('.').pop();
                const fileName = `${Math.random()}.${fileExt}`;
                const filePath = `house-photos/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('housing_photos') // Make sure you created this bucket in Step 2 of my last message!
                    .upload(filePath, file);

                if (uploadError) throw uploadError;

                // Get the public link
                const { data: { publicUrl } } = supabase.storage
                    .from('housing_photos')
                    .getPublicUrl(filePath);

                uploadedImageUrls.push(publicUrl);
            }

            // B. Send the data (including the new image URLs)
            await survivalApi.createHousing({
                ...formData,
                price_per_night: parseInt(formData.price_per_night),
                created_by: user.id,
                images: uploadedImageUrls // <--- Sending the list of photo links!
            });

            alert("Success! Your housing contribution is being verified.");
            navigate('/survival-hub/housing');
        } catch (error: any) {
            alert("Error: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-12 dark:bg-background">
            <div className="sticky -top-4 z-20 flex items-center justify-between bg-white/90 p-4 backdrop-blur-md dark:bg-slate-900/90 border-b dark:border-slate-800">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                        <ChevronLeft size={20} className="text-slate-600 dark:text-slate-300" />
                    </button>
                    <h1 className="text-lg font-bold dark:text-white">Add Housing</h1>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="mx-auto max-w-xl p-4 space-y-2">
                {/* INSTRUCTION CARD */}
                <div className="bg-blue-600 rounded-2xl p-5 text-white shadow-lg shadow-blue-200 dark:shadow-none">
                    <p className="text-xs font-bold uppercase opacity-80 tracking-widest mb-1">Contributor Mode</p>
                    <h2 className="text-lg font-bold">Help your fellow students!</h2>
                </div>

                {/* SECTION 1: THE ANCHOR */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 space-y-4">
                    <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                        {['exam', 'hospital', 'placement'].map((type) => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => {
                                    setCategory(type as any);
                                    setFormData({ ...formData, exam_center_id: null, nearby_hospital_id: null, placement_site_id: null });
                                }}
                                className={`py-2 text-[10px] font-bold uppercase rounded-lg transition-all ${category === type ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600' : 'text-slate-400'}`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                    <SmartSelect
                        label={`Link to ${category}`}
                        categoryName={category}
                        options={options}
                        value={formData.exam_center_id || formData.nearby_hospital_id || formData.placement_site_id}
                        onChange={(id) => {
                            if (category === 'exam') setFormData({ ...formData, exam_center_id: id });
                            if (category === 'hospital') setFormData({ ...formData, nearby_hospital_id: id });
                            if (category === 'placement') setFormData({ ...formData, placement_site_id: id });
                        }}
                    />
                </div>

                {/* NEW SECTION: PHOTO UPLOAD */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 space-y-4">
                    <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-widest">
                        <Camera size={16} /> Step 2: Photos (Max 3)
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
                </div>

                {/* SECTION 2: THE HOUSE DETAILS */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 space-y-4">
                    <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-widest">
                        <Wallet size={16} /> Step 3: House Details
                    </div>

                    <input
                        required
                        placeholder="Hostel or Building Name"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />

                    <div className="grid grid-cols-2 gap-2">
                        <input
                            type="number" required placeholder="Price/Night (Ksh)"
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                            onChange={e => setFormData({ ...formData, price_per_night: e.target.value })}
                        />
                        <input
                            required placeholder="Distance (e.g. 5 mins)"
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                            onChange={e => setFormData({ ...formData, distance_to_center: e.target.value })}
                        />
                    </div>

                    <div className="flex flex-wrap gap-3 pt-2">
                        <AmenityCheck label="Wifi" icon={<Wifi size={14} />} checked={formData.has_wifi} onChange={(val) => setFormData({ ...formData, has_wifi: val })} />
                        <AmenityCheck label="Water" icon={<Droplets size={14} />} checked={formData.has_water} onChange={(val) => setFormData({ ...formData, has_water: val })} />
                        <AmenityCheck label="Security" icon={<ShieldCheck size={14} />} checked={formData.has_security} onChange={(val) => setFormData({ ...formData, has_security: val })} />
                    </div>
                </div>

                {/* SECTION 3: CONTACT */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 space-y-4">
                    <div className="flex items-center gap-2 text-rose-600 font-bold text-xs uppercase tracking-widest">
                        <Phone size={16} /> Step 4: Contact Info
                    </div>
                    <input
                        required placeholder="Owner/Host Name"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                        onChange={e => setFormData({ ...formData, contact_name: e.target.value })}
                    />
                    <input
                        required placeholder="Phone Number"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                        onChange={e => setFormData({ ...formData, contact_phone: e.target.value })}
                    />
                </div>
                {/* SECTION: PUBLISH / LOCK LOGIC */}
                <div className="relative">
                    {/* 1. THE ACTUAL BUTTON */}
                    <button
                        disabled={loading}
                        type={isPremium ? "submit" : "button"} // If not premium, it's just a regular button (won't submit)
                        onClick={() => {
                            if (!isPremium) {
                                setShowLockOverlay(true); // Show the explanation if clicked
                            }
                        }}
                        className={`flex w-full items-center justify-center gap-3 rounded-2xl p-5 font-bold transition-all active:scale-95
            ${isPremium
                                ? "bg-slate-900 text-white dark:bg-white dark:text-black shadow-xl"
                                : "dark:bg-gray-800 text-slate-500 bg-gray-200  cursor-default" // Looks disabled/locked
                            }`}
                    >
                        {loading ? (
                            <>
                                <Loader2 size={20} className="animate-spin" />
                                <span>Uploading...</span>
                            </>
                        ) : (
                            <>
                                {isPremium ? <Save size={20} /> : <Lock size={20} />}
                                <span>{isPremium ? "Publish Listing" : "Upgrade to Publish Listing"}</span>
                            </>
                        )}
                    </button>
                    {showLockOverlay && (
                        <div className="absolute bottom-full left-0 right-0 mb-4 animate-in fade-in slide-in-from-bottom-4 duration-300 z-50">
                            <div className="relative bg-white dark:bg-slate-900 border-2 border-amber-200 dark:border-amber-500/50 rounded-2xl p-6 shadow-2xl backdrop-blur-sm">
                                {/* Glow Effect for Dark Mode */}
                                <div className="absolute inset-0 rounded-2xl bg-amber-500/5 dark:bg-amber-500/10 pointer-events-none" />

                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold uppercase text-xs tracking-wider">
                                            <Sparkles size={16} className="animate-pulse" /> Medrae Pro Required
                                        </div>
                                        <button
                                            onClick={() => setShowLockOverlay(false)}
                                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                                        >
                                            <X size={18} className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300" />
                                        </button>
                                    </div>

                                    <h3 className="text-sm font-bold text-slate-900 dark:text-amber-50">
                                        Help us maintain listing quality!
                                    </h3>
                                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                                        To keep our survival hub reliable and spam-free, only verified Pro members can publish housing listings.
                                    </p>

                                    <button
                                        type="button"
                                        onClick={() => navigate('/subscription')}
                                        className="w-full mt-4 bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500 text-white text-xs font-black py-3 rounded-xl transition-all shadow-lg active:scale-[0.98]"
                                    >
                                        UPGRADE TO PUBLISH LISTING
                                    </button>
                                </div>
                            </div>

                            {/* Small arrow pointing down */}
                            <div className="w-4 h-4 bg-white dark:bg-slate-900 border-r-2 border-b-2 border-amber-200 dark:border-amber-500/50 rotate-45 mx-auto -mt-2 shadow-lg"></div>
                        </div>
                    )}
                </div>
            </form>
        </div>
    );
};

const AmenityCheck = ({ label, icon, checked, onChange }: any) => (
    <label className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all cursor-pointer ${checked
        ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/20 dark:border-blue-800'
        : 'bg-slate-50 border-slate-100 text-slate-400 dark:bg-slate-800 dark:border-slate-800'
        }`}>
        <input type="checkbox" className="hidden" checked={checked} onChange={e => onChange(e.target.checked)} />
        {icon}
        <span className="text-xs font-bold uppercase">{label}</span>
    </label>
);

export default AddHousingPage;