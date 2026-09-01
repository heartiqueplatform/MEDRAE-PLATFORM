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
import { toast } from 'sonner';

// Cloudinary configuration (same as your other components)
const CLOUDINARY_CLOUD_NAME = 'dpj5vprwf';
const CLOUDINARY_UPLOAD_PRESET = 'medrae-housing';

const AddHousingPage = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [centers, setCenters] = useState<{ id: string, name: string, county: string }[]>([]);

    const [isPremium, setIsPremium] = useState(false);
    const [checkingSub, setCheckingSub] = useState(true);
    const [showLockOverlay, setShowLockOverlay] = useState(false);

    // State for photos - storing files for later upload
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);

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

    // Cloudinary upload function
    const uploadToCloudinary = async (file: File): Promise<string> => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        formData.append('folder', 'medrae/housing');

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

            toast.success(`${files.length} image(s) selected. Will upload when you publish.`);
        }
    };

    // Remove photo from list
    const removePhoto = (index: number) => {
        setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
        setPreviews(previews.filter((_, i) => i !== index));
        setUploadedUrls(uploadedUrls.filter((_, i) => i !== index));
    };

    // Check subscription
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

    // Load options based on category
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

    // Handle form submit - upload images AND create housing
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const hasSelectedAnchor = formData.exam_center_id || formData.nearby_hospital_id || formData.placement_site_id;
        if (!hasSelectedAnchor) {
            toast.error("Please select where this housing belongs first!");
            return;
        }

        setLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Please log in first!");

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
                    toast.error('Failed to upload images. Housing will be created without images.');
                    imageUrls = [];
                } finally {
                    setUploadingImage(false);
                }
            }

            // Save to database including uploaded image URLs
            await survivalApi.createHousing({
                ...formData,
                price_per_night: parseInt(formData.price_per_night),
                created_by: user.id,
                images: imageUrls
            });

            toast.success("Success! Your housing contribution is being verified. 🏠");
            navigate('/survival-hub/housing');

        } catch (error: any) {
            console.error('Error creating housing:', error);
            toast.error(error.message || "Failed to create housing listing");
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
                        <h1 className="text-lg md:text-xl font-bold dark:text-white">Add Housing</h1>
                    </div>
                    {isPremium && (
                        <span className="text-[10px] font-bold text-amber-600 uppercase bg-amber-50 dark:bg-amber-900/20 px-3 py-1 rounded-full">
                            Pro
                        </span>
                    )}
                </div>
            </div>

            <form onSubmit={handleSubmit} className="mx-auto max-w-xl px-0 md:px-4 py-0 md:py-4 space-y-0 md:space-y-4">
                {/* INSTRUCTION CARD - Mobile Native */}
                <div className="bg-blue-600 px-4 py-5 md:p-5 text-white shadow-lg shadow-blue-200 dark:shadow-none border-b md:rounded-2xl md:border">
                    <p className="text-[10px] font-bold uppercase opacity-80 tracking-widest mb-0.5 md:mb-1">Contributor Mode</p>
                    <h2 className="text-lg md:text-xl font-bold">Help your fellow students!</h2>
                </div>

                {/* SECTION 1: THE ANCHOR */}
                <div className="bg-white dark:bg-muted/30 px-4 py-5 md:p-5 border-b md:border md:rounded-2xl md:border-slate-100 dark:md:border-slate-800 space-y-4">
                    <div className="grid grid-cols-3 gap-1.5 md:gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl md:rounded-2xl">
                        {['exam', 'hospital', 'placement'].map((type) => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => {
                                    setCategory(type as any);
                                    setFormData({ ...formData, exam_center_id: null, nearby_hospital_id: null, placement_site_id: null });
                                }}
                                className={`py-1.5 md:py-2.5 text-[9px] md:text-[10px] font-bold uppercase rounded-lg md:rounded-xl transition-all ${category === type
                                    ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600'
                                    : 'text-slate-400'
                                    }`}
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

                {/* SECTION: PHOTO UPLOAD - Preview Only */}
                <div className="bg-white dark:bg-muted/30 px-4 py-5 md:p-5 border-b md:border md:rounded-2xl md:border-slate-100 dark:md:border-slate-800 space-y-4">
                    <div className="flex items-center gap-2 text-blue-600 font-bold text-[10px] md:text-xs uppercase tracking-widest">
                        <Camera size={16} className="md:w-4 md:h-4" /> Step 2: Photos (Max 3)
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
                        Add up to 3 photos of the house or hostel.
                        {selectedFiles.length > 0 && !uploadingImage && (
                            <span className="text-blue-500 block mt-0.5 md:mt-1">
                                {selectedFiles.length} image(s) selected. Will upload on publish.
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

                {/* SECTION 2: THE HOUSE DETAILS */}
                <div className="bg-white dark:bg-muted/30 px-4 py-5 md:p-5 border-b md:border md:rounded-2xl md:border-slate-100 dark:md:border-slate-800 space-y-4">
                    <div className="flex items-center gap-2 text-emerald-600 font-bold text-[10px] md:text-xs uppercase tracking-widest">
                        <Wallet size={16} className="md:w-4 md:h-4" /> Step 3: House Details
                    </div>

                    <input
                        required
                        placeholder="Hostel or Building Name"
                        className="w-full rounded-lg md:rounded-xl border border-slate-200 bg-slate-50 p-3.5 md:p-4 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />

                    <div className="grid grid-cols-2 gap-2">
                        <input
                            type="number" required placeholder="Price/Night (Ksh)"
                            className="w-full rounded-lg md:rounded-xl border border-slate-200 bg-slate-50 p-3.5 md:p-4 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                            onChange={e => setFormData({ ...formData, price_per_night: e.target.value })}
                        />
                        <input
                            required placeholder="Distance (e.g. 5 mins)"
                            className="w-full rounded-lg md:rounded-xl border border-slate-200 bg-slate-50 p-3.5 md:p-4 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                            onChange={e => setFormData({ ...formData, distance_to_center: e.target.value })}
                        />
                    </div>

                    <div className="flex flex-wrap gap-2 md:gap-3 pt-2">
                        <AmenityCheck label="Wifi" icon={<Wifi size={14} />} checked={formData.has_wifi} onChange={(val) => setFormData({ ...formData, has_wifi: val })} />
                        <AmenityCheck label="Water" icon={<Droplets size={14} />} checked={formData.has_water} onChange={(val) => setFormData({ ...formData, has_water: val })} />
                        <AmenityCheck label="Security" icon={<ShieldCheck size={14} />} checked={formData.has_security} onChange={(val) => setFormData({ ...formData, has_security: val })} />
                    </div>
                </div>

                {/* SECTION 3: CONTACT */}
                <div className="bg-white dark:bg-muted/30 px-4 py-5 md:p-5 border-b md:border md:rounded-2xl md:border-slate-100 dark:md:border-slate-800 space-y-4">
                    <div className="flex items-center gap-2 text-rose-600 font-bold text-[10px] md:text-xs uppercase tracking-widest">
                        <Phone size={16} className="md:w-4 md:h-4" /> Step 4: Contact Info
                    </div>
                    <input
                        required placeholder="Owner/Host Name"
                        className="w-full rounded-lg md:rounded-xl border border-slate-200 bg-slate-50 p-3.5 md:p-4 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                        onChange={e => setFormData({ ...formData, contact_name: e.target.value })}
                    />
                    <input
                        required placeholder="Phone Number"
                        className="w-full rounded-lg md:rounded-xl border border-slate-200 bg-slate-50 p-3.5 md:p-4 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                        onChange={e => setFormData({ ...formData, contact_phone: e.target.value })}
                    />
                </div>

                {/* SECTION: PUBLISH / LOCK LOGIC */}
                <div className="relative px-4 md:px-0 pb-4 md:pb-0">
                    {/* THE ACTUAL BUTTON */}
                    <button
                        disabled={loading || uploadingImage}
                        type={isPremium ? "submit" : "button"}
                        onClick={() => {
                            if (!isPremium) {
                                setShowLockOverlay(true);
                            }
                        }}
                        className={`flex w-full items-center justify-center gap-3 rounded-xl md:rounded-2xl p-4 md:p-5 font-bold transition-all active:scale-95
                            ${isPremium
                                ? "bg-slate-900 text-white dark:bg-white dark:text-black shadow-xl hover:bg-slate-800 dark:hover:bg-slate-100"
                                : "dark:bg-gray-800 text-slate-500 bg-gray-200 cursor-default"
                            }`}
                    >
                        {loading || uploadingImage ? (
                            <>
                                <Loader2 size={18} className="md:w-5 md:h-5 animate-spin" />
                                <span className="text-sm md:text-base">{uploadingImage ? 'Uploading Images...' : 'Publishing...'}</span>
                            </>
                        ) : (
                            <>
                                {isPremium ? <Save size={18} className="md:w-5 md:h-5" /> : <Lock size={18} className="md:w-5 md:h-5" />}
                                <span className="text-sm md:text-base">{isPremium ? "Publish Listing" : "Upgrade to Publish Listing"}</span>
                            </>
                        )}
                    </button>

                    {/* LOCK OVERLAY - Mobile Optimized */}
                    {showLockOverlay && (
                        <div className="absolute bottom-full left-0 right-0 mb-3 md:mb-4 animate-in fade-in slide-in-from-bottom-4 duration-300 z-50">
                            <div className="relative bg-white dark:bg-muted/30 border-2 border-amber-200 dark:border-amber-500/50 rounded-xl md:rounded-2xl p-4 md:p-6 shadow-2xl backdrop-blur-sm mx-2 md:mx-0">
                                <div className="absolute inset-0 rounded-xl md:rounded-2xl bg-amber-500/5 dark:bg-amber-500/10 pointer-events-none" />

                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold uppercase text-[9px] md:text-xs tracking-wider">
                                            <Sparkles size={14} className="md:w-4 md:h-4 animate-pulse" /> Medrae Pro Required
                                        </div>
                                        <button
                                            onClick={() => setShowLockOverlay(false)}
                                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                                        >
                                            <X size={16} className="md:w-[18px] md:h-[18px] text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300" />
                                        </button>
                                    </div>

                                    <h3 className="text-sm md:text-base font-bold text-slate-900 dark:text-amber-50">
                                        Help us maintain listing quality!
                                    </h3>
                                    <p className="text-[11px] md:text-xs text-slate-600 dark:text-slate-300 mt-1.5 md:mt-2 leading-relaxed">
                                        To keep our survival hub reliable and spam-free, only verified Pro members can publish housing listings.
                                    </p>

                                    <button
                                        type="button"
                                        onClick={() => navigate('/subscription')}
                                        className="w-full mt-3 md:mt-4 bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500 text-white text-[10px] md:text-xs font-black py-2.5 md:py-3 rounded-lg md:rounded-xl transition-all shadow-lg active:scale-[0.98]"
                                    >
                                        UPGRADE TO PUBLISH LISTING
                                    </button>
                                </div>
                            </div>

                            {/* Small arrow pointing down */}
                            <div className="w-3 h-3 md:w-4 md:h-4 bg-white dark:bg-muted/30 border-r-2 border-b-2 border-amber-200 dark:border-amber-500/50 rotate-45 mx-auto -mt-1.5 md:-mt-2 shadow-lg"></div>
                        </div>
                    )}
                </div>
            </form>
        </div>
    );
};

const AmenityCheck = ({ label, icon, checked, onChange }: any) => (
    <label className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl border transition-all cursor-pointer ${checked
        ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/20 dark:border-blue-800'
        : 'bg-slate-50 border-slate-100 text-slate-400 dark:bg-slate-800 dark:border-slate-800'
        }`}>
        <input type="checkbox" className="hidden" checked={checked} onChange={e => onChange(e.target.checked)} />
        {icon}
        <span className="text-[9px] md:text-xs font-bold uppercase">{label}</span>
    </label>
);

export default AddHousingPage;