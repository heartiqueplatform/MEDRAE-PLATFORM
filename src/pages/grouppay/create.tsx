// src/pages/grouppay/create.tsx

import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthProvider';
import { useGroupPay } from '@/hooks/useGroupPay';
import { useHomeRoute } from '@/hooks/useHomeRoute';
import { playSound } from '@/lib/soundManager';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Users,
    School,
    FileText,
    DollarSign,
    Info,
    CheckCircle,
    AlertTriangle,
    Users2,
    TrendingUp,
    Lock,
    Sparkles,
    Phone,
    MessageCircle,
    Mail,
    Shield,
    UserCheck,
    Calendar,
    ChevronLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import {
    GROUPPAY_CONFIG,
    GroupDuration,
    getGroupPricePerMember,
    getIndividualPrice,
    getSavingsPerMember,
    getMonthlyRate,
} from '@/types/grouppay';

/* ------------------------------------------------------------------ */
/*  Tap helper                                                        */
/* ------------------------------------------------------------------ */

const vibrate = (pattern: number | number[] = 20) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(pattern);
    }
};

const tap = (type: 'light' | 'success' | 'warning' = 'light') => {
    playSound('ui-tap');
    if (type === 'success') vibrate([15, 30, 15]);
    else if (type === 'warning') vibrate(60);
    else vibrate(15);
};

export default function CreateGroupPage() {
    const navigate = useNavigate();
    const home = useHomeRoute();
    const { user } = useAuth();
    const { createGroup } = useGroupPay();
    const [loading, setLoading] = useState(false);

    const handleBack = useCallback(() => {
        tap();
        navigate('/grouppay', { replace: true });
    }, [navigate]);

    const [selectedDuration, setSelectedDuration] =
        useState<GroupDuration>('2-months');

    const [formData, setFormData] = useState({
        name: '',
        school: '',
        max_members: String(GROUPPAY_CONFIG.DEFAULT_MAX_MEMBERS),
        description: '',
        leader_phone: '',
        leader_whatsapp: '',
        leader_email: '',
    });

    const maxMembers = useMemo(
        () => parseInt(formData.max_members) || 0,
        [formData.max_members]
    );

    const isMaxMembersValid = useMemo(
        () =>
            maxMembers >= GROUPPAY_CONFIG.MIN_MEMBERS_LIMIT &&
            maxMembers <= GROUPPAY_CONFIG.MAX_MEMBERS_LIMIT,
        [maxMembers]
    );

    const isPhoneValid = useMemo(() => {
        if (!formData.leader_phone) return false;
        const cleaned = formData.leader_phone.replace(/\D/g, '');
        return cleaned.length >= 10 && cleaned.length <= 12;
    }, [formData.leader_phone]);

    const isWhatsappValid = useMemo(() => {
        if (!formData.leader_whatsapp) return true;
        const cleaned = formData.leader_whatsapp.replace(/\D/g, '');
        return cleaned.length >= 10 && cleaned.length <= 12;
    }, [formData.leader_whatsapp]);

    const isFormValid = useMemo(
        () =>
            formData.name.trim().length > 0 &&
            formData.school.trim().length > 0 &&
            isMaxMembersValid &&
            isPhoneValid &&
            isWhatsappValid,
        [
            formData.name,
            formData.school,
            isMaxMembersValid,
            isPhoneValid,
            isWhatsappValid,
        ]
    );

    const pricePerMember = useMemo(
        () => getGroupPricePerMember(selectedDuration),
        [selectedDuration]
    );
    const individualPrice = useMemo(
        () => getIndividualPrice(selectedDuration),
        [selectedDuration]
    );
    const savingsPerMember = useMemo(
        () => getSavingsPerMember(selectedDuration),
        [selectedDuration]
    );
    const monthlyRate = useMemo(
        () => getMonthlyRate(selectedDuration),
        [selectedDuration]
    );

    const totalGroupCost = useMemo(
        () => maxMembers * pricePerMember,
        [maxMembers, pricePerMember]
    );
    const totalSavings = useMemo(
        () => maxMembers * savingsPerMember,
        [maxMembers, savingsPerMember]
    );

    const durationLabel =
        selectedDuration === '1-month' ? '1 Month' : '2 Months';

    const handleInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            const { id, value } = e.target;
            setFormData((prev) => ({ ...prev, [id]: value }));
        },
        []
    );

    const handlePhoneChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const { id, value } = e.target;
            const cleaned = value.replace(/\D/g, '');
            setFormData((prev) => ({ ...prev, [id]: cleaned }));
        },
        []
    );

    const handleSubmit = useCallback(
        async (e: React.FormEvent) => {
            e.preventDefault();
            if (!user) {
                toast.error('Please log in to create a group');
                return;
            }
            if (!formData.name.trim()) {
                toast.error('Please enter a group name');
                return;
            }
            if (!formData.school.trim()) {
                toast.error('Please enter your school name');
                return;
            }
            if (!isMaxMembersValid) {
                toast.error(
                    `Group size must be between ${GROUPPAY_CONFIG.MIN_MEMBERS_LIMIT} and ${GROUPPAY_CONFIG.MAX_MEMBERS_LIMIT}`
                );
                return;
            }
            if (!isPhoneValid) {
                toast.error('Please enter a valid phone number');
                return;
            }
            if (!isWhatsappValid) {
                toast.error('Please enter a valid WhatsApp number');
                return;
            }

            tap('success');
            setLoading(true);
            try {
                const newGroup = await createGroup({
                    name: formData.name.trim(),
                    school: formData.school.trim(),
                    max_members: maxMembers,
                    description: formData.description.trim() || undefined,
                    contribution_per_member: pricePerMember,
                    duration_type: selectedDuration,
                    leader_phone: formData.leader_phone.trim(),
                    leader_whatsapp:
                        formData.leader_whatsapp.trim() || undefined,
                    leader_email: formData.leader_email.trim() || undefined,
                });
                if (newGroup) {
                    toast.success('Group created successfully!');
                    navigate(`/grouppay/${newGroup.id}`);
                }
            } catch (error) {
                console.error('Error creating group:', error);
                toast.error('Failed to create group. Please try again.');
            } finally {
                setLoading(false);
            }
        },
        [
            user,
            formData,
            isMaxMembersValid,
            isPhoneValid,
            isWhatsappValid,
            maxMembers,
            pricePerMember,
            selectedDuration,
            createGroup,
            navigate,
        ]
    );

    return (
        <div className="h-[100dvh] w-full flex flex-col bg-slate-50 dark:bg-[#0d1117] overflow-hidden">
            {/* ── Header ─────────────────────────────────────── */}
            <header className="shrink-0 flex items-center gap-2 px-2 h-14
                               bg-white dark:bg-[#0d1117]
                               border-b border-slate-200/70 dark:border-white/[0.06]
                               z-30 safe-top">
                <button
                    onClick={handleBack}
                    aria-label="Go back"
                    className="h-10 w-10 rounded-full flex items-center justify-center
                               text-slate-700 dark:text-slate-200
                               active:bg-slate-100 dark:active:bg-white/5"
                    style={{ touchAction: 'manipulation' }}
                >
                    <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
                </button>
                <div className="flex-1 min-w-0">
                    <h1 className="text-base font-bold leading-tight truncate
                                   text-slate-900 dark:text-white">
                        New group
                    </h1>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate">
                        Split premium with your study mates
                    </p>
                </div>
            </header>

            {/* ── Scrolling body ─────────────────────────────── */}
            <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar overscroll-contain">
                <div className="w-full max-w-2xl mx-auto px-4 py-4 space-y-3 pb-28 safe-bottom">

                    {/* Duration card */}
                    <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg
                                            bg-emerald-400/10
                                            flex items-center justify-center shrink-0">
                                <Calendar className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-bold uppercase tracking-wider
                                              text-emerald-600 dark:text-emerald-400 leading-none mb-1">
                                    Step 1
                                </p>
                                <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                                    Choose plan duration
                                </h2>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            {(
                                [
                                    {
                                        key: '1-month' as GroupDuration,
                                        label: '1 month',
                                        price: GROUPPAY_CONFIG.PRICE_PER_MEMBER_1_MONTH,
                                        solo: GROUPPAY_CONFIG.INDIVIDUAL_PRICE_1_MONTH,
                                        badge: null,
                                    },
                                    {
                                        key: '2-months' as GroupDuration,
                                        label: '2 months',
                                        price: GROUPPAY_CONFIG.PRICE_PER_MEMBER_2_MONTHS,
                                        solo: GROUPPAY_CONFIG.INDIVIDUAL_PRICE_2_MONTHS,
                                        badge: 'Save',
                                    },
                                ] as const
                            ).map((opt) => {
                                const active = selectedDuration === opt.key;
                                return (
                                    <button
                                        key={opt.key}
                                        type="button"
                                        onClick={() => {
                                            tap();
                                            setSelectedDuration(opt.key);
                                        }}
                                        className={`relative p-3 rounded-xl text-left
                                                    active:scale-[0.97] transition-transform
                                                    ${active
                                                ? 'bg-emerald-50 dark:bg-emerald-400/10'
                                                : 'bg-slate-50 dark:bg-[#0d1117]'
                                            }`}
                                        style={{ touchAction: 'manipulation' }}
                                    >
                                        {opt.badge && (
                                            <span className="absolute -top-1.5 -right-1.5
                                                             bg-emerald-600 text-white
                                                             text-[9px] font-bold uppercase tracking-wider
                                                             px-1.5 py-0.5 rounded-full">
                                                {opt.badge}
                                            </span>
                                        )}
                                        <div className="flex items-center justify-between mb-1">
                                            <span
                                                className={`text-[11px] font-bold uppercase tracking-wider ${active
                                                    ? 'text-emerald-700 dark:text-emerald-400'
                                                    : 'text-slate-600 dark:text-slate-300'
                                                    }`}
                                            >
                                                {opt.label}
                                            </span>
                                            {active && (
                                                <CheckCircle className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                            )}
                                        </div>
                                        <div className="flex items-baseline gap-1">
                                            <span
                                                className={`text-base font-bold tabular-nums ${active
                                                    ? 'text-emerald-700 dark:text-emerald-400'
                                                    : 'text-slate-900 dark:text-white'
                                                    }`}
                                            >
                                                {GROUPPAY_CONFIG.CURRENCY}{' '}
                                                {opt.price}
                                            </span>
                                            <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                                /person
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-slate-400 dark:text-slate-500 line-through mt-0.5 tabular-nums">
                                            {GROUPPAY_CONFIG.CURRENCY} {opt.solo} solo
                                        </p>
                                    </button>
                                );
                            })}
                        </div>

                        <p className="flex items-start gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                            <Info className="h-3 w-3 shrink-0 mt-0.5" />
                            <span>
                                {durationLabel} · save {GROUPPAY_CONFIG.CURRENCY}{' '}
                                {savingsPerMember}/person · {GROUPPAY_CONFIG.CURRENCY}{' '}
                                {monthlyRate}/mo
                            </span>
                        </p>
                    </section>

                    {/* Info callout — leader responsibility */}
                    <InfoCallout
                        tone="amber"
                        icon={<AlertTriangle className="h-4 w-4" />}
                        title="Group leader responsibilities"
                        body="As the group leader, you will collect contributions from members via M-Pesa. Only collect from members you know personally. Medrae is not responsible for disputes between members."
                    />

                    {/* Form fields */}
                    <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-4">
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg
                                            bg-blue-400/10
                                            flex items-center justify-center shrink-0">
                                <Users2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-bold uppercase tracking-wider
                                              text-blue-600 dark:text-blue-400 leading-none mb-1">
                                    Step 2
                                </p>
                                <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                                    Group details
                                </h2>
                            </div>
                        </div>

                        <FieldRow
                            id="name"
                            label="Group name"
                            icon={<Users className="h-4 w-4" />}
                            required
                            hint="Choose a descriptive name for your study group"
                        >
                            <Input
                                id="name"
                                placeholder="e.g., KMTC Embu Revision Group"
                                value={formData.name}
                                onChange={handleInputChange}
                                className="text-base h-11 rounded-xl border-0
                                           bg-slate-50 dark:bg-[#0d1117]
                                           focus-visible:ring-2 focus-visible:ring-blue-500/40"
                                required
                            />
                        </FieldRow>

                        <FieldRow
                            id="school"
                            label="School / institution"
                            icon={<School className="h-4 w-4" />}
                            required
                            hint="Enter your school or institution name"
                        >
                            <Input
                                id="school"
                                placeholder="e.g., KMTC Embu, University of Nairobi"
                                value={formData.school}
                                onChange={handleInputChange}
                                className="text-base h-11 rounded-xl border-0
                                           bg-slate-50 dark:bg-[#0d1117]
                                           focus-visible:ring-2 focus-visible:ring-blue-500/40"
                                required
                            />
                        </FieldRow>

                        <FieldRow
                            id="max_members"
                            label="Group size"
                            icon={<Users className="h-4 w-4" />}
                            required
                            hint={`Smaller groups activate faster. Max ${GROUPPAY_CONFIG.MAX_MEMBERS_LIMIT} members.`}
                        >
                            <div className="relative">
                                <Input
                                    id="max_members"
                                    type="number"
                                    min={GROUPPAY_CONFIG.MIN_MEMBERS_LIMIT}
                                    max={GROUPPAY_CONFIG.MAX_MEMBERS_LIMIT}
                                    placeholder={`${GROUPPAY_CONFIG.DEFAULT_MAX_MEMBERS} recommended`}
                                    value={formData.max_members}
                                    onChange={handleInputChange}
                                    className={`text-base h-11 rounded-xl border-0 pr-20
                                                bg-slate-50 dark:bg-[#0d1117]
                                                focus-visible:ring-2 ${!isMaxMembersValid &&
                                            formData.max_members
                                            ? 'focus-visible:ring-rose-500/40'
                                            : 'focus-visible:ring-blue-500/40'
                                        }`}
                                    required
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2
                                                 text-[11px] font-bold uppercase tracking-wider
                                                 text-slate-500 dark:text-slate-400 pointer-events-none">
                                    members
                                </span>
                            </div>
                        </FieldRow>

                        {maxMembers >= GROUPPAY_CONFIG.MIN_MEMBERS_LIMIT && (
                            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-400/10 p-2.5
                                            flex items-start gap-2">
                                <CheckCircle className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                                <p className="text-[11px] text-emerald-700 dark:text-emerald-300 leading-snug">
                                    Your group activates once all{' '}
                                    <strong>{maxMembers}</strong> slots are filled.
                                </p>
                            </div>
                        )}
                    </section>

                    {/* Pricing summary */}
                    <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg
                                            bg-amber-400/10
                                            flex items-center justify-center shrink-0">
                                <DollarSign className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-bold uppercase tracking-wider
                                              text-amber-600 dark:text-amber-400 leading-none mb-1">
                                    Step 3
                                </p>
                                <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                                    Pricing
                                </h2>
                            </div>
                        </div>

                        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-400/10 p-3
                                        flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <Lock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 leading-none mb-1">
                                        Per member
                                    </p>
                                    <p className="text-base font-bold text-slate-900 dark:text-white tabular-nums">
                                        {GROUPPAY_CONFIG.CURRENCY} {pricePerMember}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 line-through tabular-nums">
                                    {GROUPPAY_CONFIG.CURRENCY} {individualPrice}
                                </p>
                                <span className="inline-flex items-center gap-1 mt-1
                                                 text-[10px] font-bold uppercase tracking-wider
                                                 bg-white/70 dark:bg-white/[0.06]
                                                 text-emerald-700 dark:text-emerald-400
                                                 px-1.5 py-0.5 rounded-full">
                                    Save {savingsPerMember}
                                </span>
                            </div>
                        </div>

                        {maxMembers >= GROUPPAY_CONFIG.MIN_MEMBERS_LIMIT && (
                            <div className="rounded-xl bg-slate-50 dark:bg-[#0d1117] p-3 space-y-1.5">
                                <Row label="Plan" value={durationLabel} />
                                <Row label="Group size" value={`${maxMembers} members`} />
                                <Row
                                    label="Per member"
                                    value={`${GROUPPAY_CONFIG.CURRENCY} ${pricePerMember}`}
                                />
                                <div className="h-px bg-slate-200/60 dark:bg-white/[0.06] my-1" />
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                                        Total group cost
                                    </span>
                                    <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                        {GROUPPAY_CONFIG.CURRENCY}{' '}
                                        {totalGroupCost.toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5 text-[11px]
                                                text-emerald-600 dark:text-emerald-400 pt-1">
                                    <TrendingUp className="h-3 w-3 shrink-0" />
                                    <span>
                                        Save {GROUPPAY_CONFIG.CURRENCY}{' '}
                                        {totalSavings.toLocaleString()} vs solo plans
                                    </span>
                                </div>
                            </div>
                        )}
                    </section>

                    {/* Contact */}
                    <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-4">
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg
                                            bg-violet-400/10
                                            flex items-center justify-center shrink-0">
                                <Phone className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-bold uppercase tracking-wider
                                              text-violet-600 dark:text-violet-400 leading-none mb-1">
                                    Step 4
                                </p>
                                <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                                    Contact information
                                </h2>
                            </div>
                            <span className="text-[9px] font-bold uppercase tracking-wider
                                             bg-slate-100 dark:bg-white/[0.06]
                                             text-slate-500 dark:text-slate-400
                                             px-1.5 py-0.5 rounded-full">
                                Required
                            </span>
                        </div>

                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug -mt-1">
                            Share your contact details so members can send contributions
                            via M-Pesa.
                        </p>

                        <FieldRow
                            id="leader_phone"
                            label="Phone (M-Pesa)"
                            icon={<Phone className="h-4 w-4" />}
                            required
                            hint="Members send contributions to this number via M-Pesa"
                            error={
                                !isPhoneValid && formData.leader_phone
                                    ? 'Enter a valid phone number'
                                    : undefined
                            }
                        >
                            <Input
                                id="leader_phone"
                                type="tel"
                                inputMode="numeric"
                                placeholder="0712345678"
                                value={formData.leader_phone}
                                onChange={handlePhoneChange}
                                className={`text-base h-11 rounded-xl border-0
                                            bg-slate-50 dark:bg-[#0d1117]
                                            focus-visible:ring-2 ${!isPhoneValid &&
                                        formData.leader_phone
                                        ? 'focus-visible:ring-rose-500/40'
                                        : 'focus-visible:ring-violet-500/40'
                                    }`}
                                maxLength={12}
                                required
                            />
                        </FieldRow>

                        <FieldRow
                            id="leader_whatsapp"
                            label="WhatsApp"
                            icon={<MessageCircle className="h-4 w-4" />}
                            hint="Optional — for group communication"
                            error={
                                !isWhatsappValid && formData.leader_whatsapp
                                    ? 'Enter a valid WhatsApp number'
                                    : undefined
                            }
                        >
                            <Input
                                id="leader_whatsapp"
                                type="tel"
                                inputMode="numeric"
                                placeholder="0712345678"
                                value={formData.leader_whatsapp}
                                onChange={handlePhoneChange}
                                className={`text-base h-11 rounded-xl border-0
                                            bg-slate-50 dark:bg-[#0d1117]
                                            focus-visible:ring-2 ${!isWhatsappValid &&
                                        formData.leader_whatsapp
                                        ? 'focus-visible:ring-rose-500/40'
                                        : 'focus-visible:ring-violet-500/40'
                                    }`}
                                maxLength={12}
                            />
                        </FieldRow>

                        <FieldRow
                            id="leader_email"
                            label="Email"
                            icon={<Mail className="h-4 w-4" />}
                            hint="Optional — for official communications"
                        >
                            <Input
                                id="leader_email"
                                type="email"
                                inputMode="email"
                                placeholder="your.email@example.com"
                                value={formData.leader_email}
                                onChange={handleInputChange}
                                className="text-base h-11 rounded-xl border-0
                                           bg-slate-50 dark:bg-[#0d1117]
                                           focus-visible:ring-2 focus-visible:ring-violet-500/40"
                            />
                        </FieldRow>
                    </section>

                    {/* Description */}
                    <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
                        <FieldRow
                            id="description"
                            label="Description"
                            icon={<FileText className="h-4 w-4" />}
                            hint="Optional — describe the purpose of your study group"
                        >
                            <Textarea
                                id="description"
                                placeholder="e.g., Weekly revision group for Block 2 med-surg..."
                                value={formData.description}
                                onChange={handleInputChange}
                                rows={3}
                                className="text-base resize-none rounded-xl border-0
                                           bg-slate-50 dark:bg-[#0d1117]
                                           focus-visible:ring-2 focus-visible:ring-blue-500/40"
                            />
                        </FieldRow>
                    </section>

                    {/* Trust & safety */}
                    <InfoCallout
                        tone="rose"
                        icon={<Shield className="h-4 w-4" />}
                        title="Trust & safety"
                        body={
                            <ul className="space-y-0.5">
                                <li>• Only collect contributions from members you know personally</li>
                                <li>• Medrae does not handle individual contributions</li>
                                <li>• Resolve disputes directly between members</li>
                                <li>• Report suspicious activity to Medrae support</li>
                            </ul>
                        }
                    />

                    {/* How it works */}
                    <InfoCallout
                        tone="blue"
                        icon={<Info className="h-4 w-4" />}
                        title="How GroupPay works"
                        body={
                            <ol className="space-y-0.5 list-none">
                                <li>1. Create a group with your classmates</li>
                                <li>2. Share your phone number for contributions</li>
                                <li>
                                    3. Members send their {GROUPPAY_CONFIG.CURRENCY}{' '}
                                    {pricePerMember} contribution to you
                                </li>
                                <li>
                                    4. Once all {maxMembers || 'group'} slots are
                                    filled, you activate with one payment
                                </li>
                                <li>5. Everyone gets {durationLabel} access instantly</li>
                            </ol>
                        }
                    />

                    {/* Pro tips */}
                    <InfoCallout
                        tone="amber"
                        icon={<UserCheck className="h-4 w-4" />}
                        title="Pro tips for leaders"
                        body={
                            <ul className="space-y-0.5">
                                <li>• Only collect money from members you trust</li>
                                <li>• Keep a record of who has paid</li>
                                <li>• Share your number clearly with members</li>
                                <li>• Activate the group once all slots are filled</li>
                                <li>• Smaller groups activate faster</li>
                            </ul>
                        }
                    />
                </div>
            </main>

            {/* ── Pinned footer CTA ──────────────────────────── */}
            <footer className="shrink-0 px-4 py-3
                               bg-white dark:bg-[#0d1117]
                               border-t border-slate-200/70 dark:border-white/[0.06]
                               safe-bottom">
                <form onSubmit={handleSubmit}>
                    <button
                        type="submit"
                        disabled={loading || !isFormValid}
                        className={`w-full h-11 rounded-xl text-white
                                    text-sm font-bold
                                    flex items-center justify-center gap-2
                                    transition-transform
                                    ${loading || !isFormValid
                                ? 'bg-slate-200 dark:bg-white/[0.08] text-slate-400 dark:text-slate-500 cursor-not-allowed'
                                : 'bg-emerald-600 active:scale-[0.97]'
                            }`}
                        style={{ touchAction: 'manipulation' }}
                    >
                        {loading ? (
                            <>
                                <svg
                                    className="animate-spin h-4 w-4"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                    />
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    />
                                </svg>
                                Creating…
                            </>
                        ) : (
                            <>
                                <Users2 className="h-4 w-4" />
                                Create {durationLabel} group
                            </>
                        )}
                    </button>
                </form>
            </footer>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Subcomponents                                                     */
/* ------------------------------------------------------------------ */

function FieldRow({
    id,
    label,
    icon,
    hint,
    error,
    required,
    children,
}: {
    id: string;
    label: string;
    icon?: React.ReactNode;
    hint?: string;
    error?: string;
    required?: boolean;
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-2">
            <Label
                htmlFor={id}
                className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider
                           text-slate-500 dark:text-slate-400"
            >
                {icon && (
                    <span className="text-slate-400 dark:text-slate-500 shrink-0">
                        {icon}
                    </span>
                )}
                {label}
                {required && (
                    <span className="text-rose-500 dark:text-rose-400 normal-case tracking-normal">
                        *
                    </span>
                )}
            </Label>
            {children}
            {error ? (
                <p className="text-[11px] text-rose-600 dark:text-rose-400 leading-snug">
                    {error}
                </p>
            ) : hint ? (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                    {hint}
                </p>
            ) : null}
        </div>
    );
}

type Tone = 'amber' | 'rose' | 'blue' | 'emerald';

function InfoCallout({
    tone,
    icon,
    title,
    body,
}: {
    tone: Tone;
    icon: React.ReactNode;
    title: string;
    body: React.ReactNode;
}) {
    const styles: Record<Tone, { bg: string; text: string; body: string }> = {
        amber: {
            bg: 'bg-amber-50 dark:bg-amber-400/10',
            text: 'text-amber-700 dark:text-amber-400',
            body: 'text-amber-700/80 dark:text-amber-300/80',
        },
        rose: {
            bg: 'bg-rose-50 dark:bg-rose-400/10',
            text: 'text-rose-700 dark:text-rose-400',
            body: 'text-rose-700/80 dark:text-rose-300/80',
        },
        blue: {
            bg: 'bg-blue-50 dark:bg-blue-400/10',
            text: 'text-blue-700 dark:text-blue-400',
            body: 'text-blue-700/80 dark:text-blue-300/80',
        },
        emerald: {
            bg: 'bg-emerald-50 dark:bg-emerald-400/10',
            text: 'text-emerald-700 dark:text-emerald-400',
            body: 'text-emerald-700/80 dark:text-emerald-300/80',
        },
    };
    const s = styles[tone];
    return (
        <section className={`rounded-2xl p-3.5 ${s.bg}`}>
            <div className="flex items-start gap-2.5">
                <span className={`shrink-0 mt-0.5 ${s.text}`}>{icon}</span>
                <div className="min-w-0">
                    <p className={`text-[11px] font-bold uppercase tracking-wider ${s.text}`}>
                        {title}
                    </p>
                    <div className={`text-[11px] leading-relaxed mt-1 ${s.body}`}>
                        {body}
                    </div>
                </div>
            </div>
        </section>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {label}
            </span>
            <span className="text-[11px] font-bold text-slate-900 dark:text-white tabular-nums">
                {value}
            </span>
        </div>
    );
}