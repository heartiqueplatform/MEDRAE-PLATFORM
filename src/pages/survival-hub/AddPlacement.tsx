// NEW
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { survivalApi } from '../../lib/survivalApi';
import { supabase } from '@/lib/supabaseClient';
import {
    ChevronLeft, Save, Hospital, MapPin, Stethoscope,
    Phone, Loader2, Camera, X, Lock, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';

// Cloudinary configuration (same as your CreateClass)
const CLOUDINARY_CLOUD_NAME = 'dpj5vprwf';
const CLOUDINARY_UPLOAD_PRESET = 'medrae-placements';

const AddPlacementPage = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [isPremium, setIsPremium] = useState(false);
    const [checkingSub, setCheckingSub] = useState(true);
    const [showLockOverlay, setShowLockOverlay] = useState(false);

    // State for photos - storing files for later upload
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);

    const [formData, setFormData] = useState({
        hospital_name: '',
        location: '',
        county: '',
        ward_specialties: '',
        student_friendly: true,
        supervisor_contact: '',
        intake_notes: ''
    });

    // Cloudinary upload function (copied from CreateClass)
    const uploadToCloudinary = async (file: File): Promise<string> => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        formData.append('folder', 'medrae/placements');

        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
            {
                method: 'POST',
                body: formData,
            }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Upload failed');
        }

        const data = await response.json();
        return data.secure_url;
    };

    // Handle photo selection - preview only, NO upload yet
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);

            // Validate files
            const invalidFiles = files.filter(file => !file.type.startsWith('image/'));
            if (invalidFiles.length > 0) {
                toast.error('Please upload only image files');
                return;
            }

            const oversizedFiles = files.filter(file => file.size > 5 * 1024 * 1024);
            if (oversizedFiles.length > 0) {
                toast.error('Images must be less than 5MB each');
                return;
            }

            if (files.length + selectedFiles.length > 3) {
                toast.error('Maximum 3 photos allowed');
                return;
            }

            // Store files for later upload
            setSelectedFiles([...selectedFiles, ...files]);

            // Show previews only
            const newPreviews = files.map(file => URL.createObjectURL(file));
            setPreviews([...previews, ...newPreviews]);

            toast.success(`${files.length} image(s) selected. Will upload when you save.`);
        }
    };

    // Remove photo from list
    const removePhoto = (index: number) => {
        setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
        setPreviews(previews.filter((_, i) => i !== index));
        setUploadedUrls(uploadedUrls.filter((_, i) => i !== index));
    };

    // Check subscription (same as before)
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

    // Handle form submit - upload images AND create placement
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Validate required fields
            if (!formData.hospital_name.trim()) {
                toast.error('Hospital name is required');
                setLoading(false);
                return;
            }

            if (!formData.county.trim() || !formData.location.trim()) {
                toast.error('County and location are required');
                setLoading(false);
                return;
            }

            let imageUrls: string[] = [];

            // Upload images NOW (during submit, not before)
            if (selectedFiles.length > 0) {
                setUploadingImage(true);
                toast.info(`Uploading ${selectedFiles.length} image(s)...`);

                try {
                    // Upload each image to Cloudinary
                    for (const file of selectedFiles) {
                        const url = await uploadToCloudinary(file);
                        imageUrls.push(url);
                    }
                    setUploadedUrls(imageUrls);
                    toast.success('Images uploaded successfully!');
                } catch (error) {
                    console.error('Upload error:', error);
                    toast.error('Failed to upload images. Placement will be created without images.');
                    imageUrls = [];
                } finally {
                    setUploadingImage(false);
                }
            }

            // Save to database including uploaded image URLs
            await survivalApi.createPlacementSite({
                ...formData,
                images: imageUrls
            });

            toast.success('Hospital added to Placement Directory! 🎉');
            navigate('/survival-hub/placements');

        } catch (error: any) {
            console.error('Error creating placement:', error);
            toast.error(error.message || 'Failed to create placement site');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-background">
            {/* Header - Mobile Native Style */}
            <div className="sticky -top-4 z-20 bg-white dark:bg-slate-900 border-b border-slate-200/50 dark:border-slate-800/50">
                <div className="flex items-center justify-between px-3 py-3 md:px-6 md:py-4">
                    <div className="flex items-center gap-3 md:gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-1.5 md:p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 active:scale-90 transition-transform"
                        >
                            <ChevronLeft size={20} className="md:w-5 md:h-5" />
                        </button>
                        <h1 className="text-lg md:text-xl font-bold dark:text-white">Add Placement Site</h1>
                    </div>
                    {isPremium && (
                        <span className="text-[10px] font-bold text-amber-600 uppercase bg-amber-50 dark:bg-amber-900/20 px-3 py-1 rounded-full">
                            Pro
                        </span>
                    )}
                </div>
            </div>

            <form onSubmit={handleSubmit} className="mx-auto max-w-xl px-0 md:px-4 py-0 md:py-4 space-y-0 md:space-y-4">

                {/* 1. HOSPITAL INFO */}
                <div className="bg-white dark:bg-muted/30 px-4 py-5 md:p-5 border-b md:border md:rounded-2xl md:border-slate-100 dark:md:border-slate-800 space-y-4">
                    <div className="flex items-center gap-2 text-amber-600 font-bold text-[10px] md:text-xs uppercase tracking-widest">
                        <Hospital size={16} className="md:w-4 md:h-4" /> Step 1: Hospital Info
                    </div>
                    <input
                        required
                        placeholder="Hospital Name"
                        className="w-full rounded-lg md:rounded-xl border border-slate-200 bg-slate-50 p-3.5 md:p-4 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                        onChange={e => setFormData({ ...formData, hospital_name: e.target.value })}
                    />

                    <div className="grid grid-cols-2 gap-2">
                        <input
                            required
                            placeholder="County"
                            className="w-full rounded-lg md:rounded-xl border border-slate-200 bg-slate-50 p-3.5 md:p-4 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                            onChange={e => setFormData({ ...formData, county: e.target.value })}
                        />
                        <input
                            required
                            placeholder="Town/Location"
                            className="w-full rounded-lg md:rounded-xl border border-slate-200 bg-slate-50 p-3.5 md:p-4 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                            onChange={e => setFormData({ ...formData, location: e.target.value })}
                        />
                    </div>
                </div>

                {/* 2. PHOTO UPLOAD SECTION - Preview Only */}
                <div className="bg-white dark:bg-muted/30 px-4 py-5 md:p-5 border-b md:border md:rounded-2xl md:border-slate-100 dark:md:border-slate-800 space-y-4">
                    <div className="flex items-center gap-2 text-blue-500 font-bold text-[10px] md:text-xs uppercase tracking-widest">
                        <Camera size={16} className="md:w-4 md:h-4" /> Step 2: Site Photos
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 md:gap-2">
                        {previews.map((src, index) => (
                            <div key={index} className="relative aspect-square rounded-lg md:rounded-xl overflow-hidden border dark:border-slate-700">
                                <img src={src} className="h-full w-full object-cover" alt="Preview" />
                                {uploadedUrls[index] && (
                                    <div className="absolute bottom-1 left-1 bg-green-500 text-white text-[7px] md:text-[8px] px-1 py-0.5 rounded">
                                        ✓ Uploaded
                                    </div>
                                )}
                                <button
                                    type="button"
                                    onClick={() => removePhoto(index)}
                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600 transition-colors"
                                >
                                    <X size={10} className="md:w-3 md:h-3" />
                                </button>
                            </div>
                        ))}

                        {selectedFiles.length < 3 && (
                            <label className="flex flex-col items-center justify-center aspect-square rounded-lg md:rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 cursor-pointer hover:bg-slate-100 transition-colors">
                                <Camera className="text-slate-400" size={20} />
                                <span className="text-[8px] md:text-[10px] font-bold text-slate-400 mt-0.5 md:mt-1">Add Photo</span>
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
                    <p className="text-[9px] md:text-[10px] text-slate-400 italic text-center">
                        Add up to 3 photos (gate, main ward, or signage).
                        {selectedFiles.length > 0 && !uploadingImage && (
                            <span className="text-blue-500 block mt-0.5 md:mt-1">
                                {selectedFiles.length} image(s) selected. Will upload on save.
                            </span>
                        )}
                        {uploadingImage && (
                            <span className="text-amber-500 block mt-0.5 md:mt-1 flex items-center justify-center gap-2">
                                <Loader2 className="animate-spin h-3 w-3" />
                                Uploading images...
                            </span>
                        )}
                    </p>
                </div>

                {/* 3. WARD DETAILS */}
                <div className="bg-white dark:bg-muted/30 px-4 py-5 md:p-5 border-b md:border md:rounded-2xl md:border-slate-100 dark:md:border-slate-800 space-y-4">
                    <div className="flex items-center gap-2 text-emerald-600 font-bold text-[10px] md:text-xs uppercase tracking-widest">
                        <Stethoscope size={16} className="md:w-4 md:h-4" /> Step 3: Ward Details
                    </div>
                    <input
                        required
                        placeholder="Specialties (e.g. Med/Surg, Paeds)"
                        className="w-full rounded-lg md:rounded-xl border border-slate-200 bg-slate-50 p-3.5 md:p-4 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                        onChange={e => setFormData({ ...formData, ward_specialties: e.target.value })}
                    />
                    <textarea
                        placeholder="Intake Notes (e.g. Bring own scrubs)"
                        className="w-full rounded-lg md:rounded-xl border border-slate-200 bg-slate-50 p-3.5 md:p-4 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-amber-500 min-h-[80px] md:min-h-[100px]"
                        onChange={e => setFormData({ ...formData, intake_notes: e.target.value })}
                    />
                </div>

                {/* 4. CONTACT INFO */}
                <div className="bg-white dark:bg-muted/30 px-4 py-5 md:p-5 border-b md:border md:rounded-2xl md:border-slate-100 dark:md:border-slate-800 space-y-4">
                    <div className="flex items-center gap-2 text-rose-600 font-bold text-[10px] md:text-xs uppercase tracking-widest">
                        <Phone size={16} className="md:w-4 md:h-4" /> Step 4: Contact Info
                    </div>
                    <input
                        placeholder="WhatsApp Number or Email"
                        className="w-full rounded-lg md:rounded-xl border border-slate-200 bg-slate-50 p-3.5 md:p-4 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                        onChange={e => setFormData({ ...formData, supervisor_contact: e.target.value })}
                    />
                </div>

                {/* SECTION: SAVE / LOCK LOGIC */}
                <div className="relative px-4 md:px-0 pb-4 md:pb-0">
                    {/* FLOATING OVERLAY - Mobile Optimized */}
                    {showLockOverlay && (
                        <div className="absolute bottom-full left-0 right-0 mb-3 md:mb-4 animate-in fade-in slide-in-from-bottom-4 duration-300 z-30">
                            <div className="bg-white dark:bg-muted/30 border-2 border-amber-500 rounded-xl md:rounded-2xl p-4 md:p-6 shadow-2xl mx-2 md:mx-0">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2 text-amber-600 font-bold uppercase text-[9px] md:text-[10px] tracking-widest">
                                        <Sparkles size={14} className="md:w-4 md:h-4" /> Contributor Verification
                                    </div>
                                    <button onClick={() => setShowLockOverlay(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                                        <X size={16} className="md:w-[18px] md:h-[18px] text-slate-400 hover:text-slate-600" />
                                    </button>
                                </div>

                                <h3 className="text-sm md:text-base font-bold text-slate-900 dark:text-white">
                                    Upgrade to Publish Sites
                                </h3>
                                <p className="text-[11px] md:text-xs text-slate-600 dark:text-slate-400 mt-1.5 md:mt-2 leading-relaxed">
                                    Placement data is vital for students. To ensure accuracy and prevent unverified listings, only <b>Medrae Pro</b> members can contribute to this directory.
                                </p>

                                <button
                                    type="button"
                                    onClick={() => navigate('/subscription')}
                                    className="w-full mt-3 md:mt-4 bg-amber-600 hover:bg-amber-700 text-white text-[10px] md:text-xs font-bold py-2.5 md:py-3 rounded-lg md:rounded-xl transition-all shadow-md active:scale-95"
                                >
                                    Upgrade & Unlock Access
                                </button>
                            </div>
                            <div className="w-3 h-3 md:w-4 md:h-4 bg-white dark:bg-muted/30 border-r-2 border-b-2 border-amber-500 rotate-45 mx-auto -mt-1.5 md:-mt-2"></div>
                        </div>
                    )}

                    {/* MAIN ACTION BUTTON */}
                    <button
                        disabled={loading || checkingSub || uploadingImage}
                        type={isPremium ? "submit" : "button"}
                        onClick={() => {
                            if (!isPremium) {
                                setShowLockOverlay(true);
                            }
                        }}
                        className={`w-full rounded-xl md:rounded-2xl p-4 md:p-5 font-bold transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg
                            ${isPremium
                                ? "bg-amber-600 text-white shadow-amber-200 dark:shadow-none hover:bg-amber-700"
                                : "bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-default shadow-none"
                            }`}
                    >
                        {loading || uploadingImage ? (
                            <>
                                <Loader2 size={18} className="md:w-5 md:h-5 animate-spin" />
                                <span className="text-sm md:text-base">{uploadingImage ? 'Uploading Images...' : 'Saving Site...'}</span>
                            </>
                        ) : (
                            <>
                                {isPremium ? <Save size={18} className="md:w-5 md:h-5" /> : <Lock size={18} className="md:w-5 md:h-5" />}
                                <span className="text-sm md:text-base">{isPremium ? "Save Placement Site" : "Upgrade to Publish Sites"}</span>
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AddPlacementPage;