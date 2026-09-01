import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { GraduationCap, UserCheck, Stethoscope, Eye, EyeOff, User, Mail, Phone, Lock, MoreHorizontal, ShieldQuestion, School, MapPin, FileText, ChevronRight, Target, BookOpen, Layers, CheckCircle2, Info, ArrowRight, LogOut } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { institutions } from "@/components/forms/institutions.data";
import { counties } from "@/components/forms/institutions.data";
import { Separator } from "@/components/ui/separator";
import { useEffect } from "react";
import ExitOverlay from "@/components/ExitOverlay";
import sha256 from "crypto-js/sha256";
import GoogleAuthButton from "@/components/google/GoogleAuthButton";
const backgroundImages = [
  "high1.png",
  "high2.png",
  "high3.png",
  "high4.png",
  "high5.png",
  "high6.png",
];

export function Register() {
  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);
  const [usernameEdited, setUsernameEdited] = useState(false);
  const [showExitOverlay, setShowExitOverlay] = useState(false);

  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [bgIndex, setBgIndex] = useState(0);

  const courseOptions = [
    { value: "bsc-nursing", label: "BScN ★★★★★" },
    { value: "krchn", label: "KRCHN  ★★★★" },
    { value: "midwifery", label: "Midwifery ★★★★" },
    { value: "critical-care-nursing", label: "Critical Care Nursing ★★★★" },
    { value: "mental-health-nursing", label: "Mental Health & Psychiatry Nursing  ★★★★" },
    { value: "pediatric-nursing", label: "Pediatric Nursing ★★★★" },
    { value: "oncology-nursing", label: "Oncology Nursing ★★★★" },
    { value: "palliative-care-nursing", label: "Palliative Care Nursing ★★★★" },
    { value: "community-health-nursing", label: "Community Health Nursing ★★★★" },
    { value: "perioperative-nursing", label: "Perioperative (Theatre) Nursing  ★★★★" },
    { value: "renal-nursing", label: "Renal Nursing  ★★★★" },
    { value: "other", label: "Other (Nursing Related) ★★★" },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setBgIndex(prev => {
        if (prev + 1 >= backgroundImages.length) return 0;
        return prev + 1;
      });
    }, 6000);

    return () => clearInterval(interval);
  }, []);
  const handleRegister = async (role, formData) => {
    if (formData.password !== formData.confirmPassword) {
      toast({ title: "Password Mismatch!", description: "Passwords must match.", variant: "destructive" });
      return;
    }
    setIsLoading(true);

    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        options: {
          data: {
            role: role,
            name: formData.fullName
          }
        }
      });

      if (signUpError || !signUpData.user) throw new Error(signUpError?.message || "Sign-up failed.");

      // First declaration of userId
      const userId = signUpData.user.id;
      const courseFinal = formData.course === "other" ? formData.otherCourse : formData.course;

      const profileUpdatePayload =
        role === "tutor"
          ? {
            name: formData.fullName,
            username: formData.username,
            phone: formData.phone,
            county: formData.county,
            institution: formData.institution,
            bio: formData.bio,
            role,
            subscription: "Free",
            joined_date: new Date().toISOString().split("T")[0],
            reset_question: formData.resetQuestion,
            reset_answer: formData.resetAnswer,
            target_score: formData.targetScore,
          }
          : {
            name: formData.fullName,
            username: formData.username,
            phone: formData.phone,
            county: formData.county,
            institution: formData.institution,
            course: courseFinal,
            block: formData.block,
            bio: formData.bio,
            role,
            subscription: "Free",
            joined_date: new Date().toISOString().split("T")[0],
            reset_question: formData.resetQuestion,
            reset_answer: formData.resetAnswer,
            target_score: formData.targetScore,
          };

      const { error: updateError } = await supabase
        .from("profiles")
        .update(profileUpdatePayload)
        .eq("user_id", userId);

      if (updateError) throw updateError;

      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });

      if (loginError || !loginData.user) throw new Error(loginError?.message || "Login after registration failed.");

      let deviceId = localStorage.getItem("device_id");
      if (!deviceId) {
        deviceId = crypto.randomUUID();
        localStorage.setItem("device_id", deviceId);
      }

      const { count: sessionCount } = await supabase
        .from("user_sessions")
        .select("*", { count: 'exact', head: true })
        .eq("user_id", loginData.user.id);

      if ((sessionCount || 0) >= 3) {
        throw new Error("Maximum devices reached. Log out from another device first.");
      }

      await supabase.rpc('handle_user_heartbeat', {
        p_user_id: loginData.user.id,
        p_device_id: deviceId
      });

      // ✅ FIXED: Renamed this variable to avoid the "already declared" error
      const loggedInUserId = loginData.user.id;
      localStorage.setItem(`userRole_${loggedInUserId}`, role);
      localStorage.setItem("last_known_role", role);
      localStorage.setItem("hasLoggedInBefore", "true");
      toast({ title: "Welcome!", description: `Account created and logged in as ${role}.` });
      navigate(`/dashboard/${role}`, { replace: true });
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Registration issue",
        description: err?.message || "Check your connection or try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  const handleExitApp = () => {
    setShowExitOverlay(true);
  };
  const finalExitAction = () => {
    if ((window as any).electronAPI) {
      (window as any).electronAPI.quitApp();
    } else {
      alert("Exit successful. Please close the tab.");
      window.location.href = "https://google.com";
    }
  };
  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row transition-all duration-1000 bg-white text-gray-900">
      {/* FLOATING EXIT BUTTON */}
      <button
        onClick={handleExitApp}
        className="hidden md:flex fixed top-6 left-6 z-[9999]
             bg-white/10 backdrop-blur-md
             hover:bg-white/20 border border-white/20
             text-white/80 hover:text-white
             py-2 px-4 rounded-xl
             transition-all duration-300 active:scale-95
             items-center gap-2.5 group"
      >
        <LogOut className="h-3.5 w-3.5 opacity-70 group-hover:opacity-100 group-hover:text-red-400 transition-all" />
        <span className="text-[11px] font-medium tracking-widest uppercase">
          Exit System
        </span>
      </button>
      <ExitOverlay
        isOpen={showExitOverlay}
        onExit={finalExitAction}
      />
      {/* LEFT IMAGE SIDE (DESKTOP) */}
      <div className="hidden md:block md:w-1/2 relative overflow-hidden h-screen sticky top-0">
        {backgroundImages.map((img, index) => (
          <div
            key={index}
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out ${index === bgIndex ? "opacity-100 scale-105" : "opacity-0 scale-100"
              }`}
            style={{
              backgroundImage: `url(${img})`,
              transition: 'opacity 1s ease-in-out, transform 10s linear'
            }}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40">
          <div className="absolute bottom-16 left-12 right-12 text-white space-y-4">
            <div className="inline-flex items-center gap-2 bg-blue-600/30 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 text-xs font-semibold tracking-wider uppercase">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              Join our growing community
            </div>
            <h1 className="text-5xl font-bold leading-tight">
              Empowering the next <br />
              <span className="text-blue-400">generation of experts.</span>
            </h1>
            <p className="text-gray-300 text-lg max-w-md">
              Access premium learning resources and connect with professional tutors from across the country.
            </p>
          </div>
        </div>
      </div>
      {/* RIGHT FORM SIDE - full width on mobile */}
      <div className="w-full md:w-1/2 flex justify-center items-center p-0 md:p-8 lg:p-12 overflow-y-auto">
        <div className="w-full md:max-w-2xl md:animate-in md:fade-in md:slide-in-from-right-4 md:duration-700">

          <Card className="w-full bg-white text-gray-900 md:border md:shadow-[0_8px_30px_rgb(0,0,0,0.04)] md:rounded-[2rem] border-none shadow-none rounded-none overflow-hidden flex flex-col">

            <CardHeader className="space-y-4 md:space-y-6 pt-6 md:pt-10 px-4 md:px-8 pb-3 md:pb-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2 md:space-x-3">
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-blue-600 p-1.5 md:p-2 shadow-lg shadow-blue-200">
                    <img
                      src="/pwa-192x192.jpeg"
                      alt="Logo"
                      className="w-full h-full object-contain invert"
                    />
                  </div>
                  <CardTitle className="text-lg md:text-2xl font-black tracking-tight text-slate-800">
                    Hello! Love seeing you get started
                  </CardTitle>
                </div>
              </div>
              <Link
                to="/login"
                className="text-blue-600 hover:text-blue-700 font-bold text-xs md:text-sm bg-blue-50 px-2 md:px-1 py-1.5 md:py-2 rounded-full transition-colors inline-block text-center"
              >
                Already have an account? Log In here
              </Link>
              <div className="mb-4">
                <GoogleAuthButton />
              </div>
              <div className="space-y-0.5 md:space-y-1">
                <h2 className="text-lg md:text-xl font-bold text-slate-700">Create your account</h2>
                <CardDescription className="text-slate-500 font-medium text-xs md:text-sm">
                  Select your role to personalize your experience.
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="px-4 md:px-8 pb-8 md:pb-10">
              <Tabs defaultValue="student" className="w-full">

                <TabsList className="grid w-full grid-cols-3 mb-6 md:mb-8 bg-slate-100/80 p-1 md:p-1.5 rounded-xl md:rounded-2xl h-12 md:h-14">
                  <TabsTrigger
                    value="student"
                    className="rounded-lg md:rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 font-bold transition-all text-[10px] md:text-sm"
                  >
                    <GraduationCap className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" /> Student
                  </TabsTrigger>

                  <TabsTrigger
                    value="tutor"
                    className="rounded-lg md:rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 font-bold transition-all text-[10px] md:text-sm"
                  >
                    <UserCheck className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" /> Tutor
                  </TabsTrigger>

                  <TabsTrigger
                    value="staff"
                    className="rounded-lg md:rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 font-bold transition-all text-[10px] md:text-sm"
                  >
                    <Stethoscope className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" /> Staff
                  </TabsTrigger>
                </TabsList>

                {/* Content Areas */}
                <div className="min-h-[400px]">
                  <TabsContent value="student" className="mt-0 focus-visible:outline-none md:animate-in md:fade-in-50 md:duration-500">
                    <StudentForm
                      handleRegister={handleRegister}
                      isLoading={isLoading}
                      usernameEdited={usernameEdited}
                      setUsernameEdited={setUsernameEdited}
                      courseOptions={courseOptions}
                    />
                  </TabsContent>

                  <TabsContent value="tutor" className="mt-0 focus-visible:outline-none md:animate-in md:fade-in-50 md:duration-500">
                    <TutorForm
                      handleRegister={handleRegister}
                      isLoading={isLoading}
                      usernameEdited={usernameEdited}
                      setUsernameEdited={setUsernameEdited}
                    />
                  </TabsContent>

                  <TabsContent value="staff" className="mt-0 focus-visible:outline-none">
                    <div className="bg-slate-50 md:rounded-[2rem] p-6 md:p-8 md:border md:border-slate-100 relative overflow-hidden rounded-2xl border border-slate-100">
                      <Stethoscope className="absolute -right-8 -bottom-8 w-32 md:w-40 h-32 md:h-40 text-slate-200/50 -rotate-12" />

                      <div className="relative z-10 space-y-4 md:space-y-6">
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-xl md:rounded-2xl shadow-sm flex items-center justify-center border border-slate-100">
                          <Info className="w-5 h-5 md:w-6 md:h-6 text-blue-500" />
                        </div>

                        <div className="space-y-2 md:space-y-3">
                          <h3 className="text-lg md:text-xl font-bold text-slate-800">Staff Portal Coming Soon</h3>
                          <div className="space-y-3 md:space-y-4 text-slate-600 leading-relaxed font-medium text-xs md:text-sm">
                            <p>
                              Our Staff registration portal is currently under development to ensure a robust experience for our administrative team.
                            </p>
                            <p>
                              In the meantime, feel free to explore the student dashboard to familiarize yourself with the platform features.
                            </p>
                          </div>
                        </div>

                        <div className="pt-1 md:pt-2 flex flex-wrap gap-2 md:gap-3">
                          <div className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs font-bold text-slate-500 bg-white px-2 md:px-3 py-1 md:py-1.5 rounded-lg border border-slate-100">
                            <CheckCircle2 className="w-2.5 h-2.5 md:w-3 md:h-3 text-emerald-500" /> Administrative Tools
                          </div>
                          <div className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs font-bold text-slate-500 bg-white px-2 md:px-3 py-1 md:py-1.5 rounded-lg border border-slate-100">
                            <CheckCircle2 className="w-2.5 h-2.5 md:w-3 md:h-3 text-emerald-500" /> User Management
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </div>
              </Tabs>

              {/* Bottom Footer Section */}
              <div className="mt-8 md:mt-10 pt-6 md:pt-8 border-t border-slate-100">
                <div className="flex flex-col items-center justify-center space-y-3 md:space-y-4">
                  <p className="text-xs md:text-sm text-slate-500 font-medium">
                    Already have an account?{" "}
                    <Link to="/login" className="text-blue-600 hover:text-blue-700 font-bold inline-flex items-center gap-1 group">
                      Sign in here <ArrowRight className="w-3.5 h-3.5 md:w-4 md:h-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </p>

                  <div className="flex justify-center gap-3">
                    <span
                      className="text-[10px] uppercase tracking-wider text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer transition-colors"
                      onClick={() => navigate("/privacy")}
                    >
                      Privacy & Policy
                    </span>
                    <span className="text-[10px] text-slate-300 dark:text-slate-600">•</span>
                    <span
                      className="text-[10px] uppercase tracking-wider text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer transition-colors"
                      onClick={() => navigate("/terms")}
                    >
                      Terms & Conditions
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
export default Register;

const PasswordField = ({ label, value, onChange }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5 md:space-y-2 relative">
      <Label className="text-xs md:text-sm">{label}</Label>
      <Input type={show ? "text" : "password"} value={value} onChange={onChange} placeholder="Enter password" className="pr-10 text-sm" />
      <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-8 md:top-9 text-gray-500 hover:text-gray-700">
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
};

function StudentForm({ handleRegister, isLoading, usernameEdited, setUsernameEdited, courseOptions }) {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "+254",
    username: "",
    institution: "",
    county: "",
    course: "",
    otherCourse: "",
    block: "",
    bio: "",
    password: "",
    confirmPassword: "",
    resetQuestion: "",
    resetAnswer: "",
    targetScore: 50,
  });

  return (
    <div className="max-w-2xl mx-auto bg-white">
      <div className="space-y-6 md:space-y-8">

        {/* --- SECTION 1: ACCOUNT DETAILS --- */}
        <div className="space-y-3 md:space-y-4">
          <div className="flex items-center gap-1.5 md:gap-2 pb-1">
            <User className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-800 text-sm md:text-base">Account Information</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div className="space-y-1 md:space-y-1.5">
              <Label className="text-[10px] md:text-xs uppercase tracking-wider text-gray-500 font-bold">Full Name *</Label>
              <Input
                placeholder="SN Jacqueline Nk"
                className="bg-gray-50/50 border-gray-200 focus:bg-white transition-all text-sm"
                value={formData.fullName}
                onChange={e => {
                  const fullName = e.target.value;
                  setFormData({
                    ...formData,
                    fullName,
                    username: usernameEdited ? formData.username : fullName.toLowerCase().replace(/\s+/g, "")
                  });
                }}
              />
            </div>
            <div className="space-y-1 md:space-y-1.5">
              <Label className="text-[10px] md:text-xs uppercase tracking-wider text-gray-500 font-bold">Username *</Label>
              <div className="relative">
                <Input
                  placeholder="snJacquelineNk"
                  className="bg-gray-50/50 border-gray-200 focus:bg-white transition-all pl-8 text-sm"
                  value={formData.username}
                  onChange={e => {
                    setUsernameEdited(true);
                    setFormData({ ...formData, username: e.target.value });
                  }}
                />
                <span className="absolute left-3 top-2.5 text-gray-400 text-sm">@</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div className="space-y-1 md:space-y-1.5">
              <Label className="text-[10px] md:text-xs uppercase tracking-wider text-gray-500 font-bold">Email Address *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-3.5 h-3.5 md:w-4 md:h-4 text-gray-400" />
                <Input
                  type="email"
                  placeholder="examplesnJacquelinenk@gmail.com"
                  className="pl-9 md:pl-10 bg-gray-50/50 border-gray-200 focus:bg-white transition-all text-sm"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1 md:space-y-1.5">
              <Label className="text-[10px] md:text-xs uppercase tracking-wider text-gray-500 font-bold">Phone Number *</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 w-3.5 h-3.5 md:w-4 md:h-4 text-gray-400" />
                <Input
                  className="pl-9 md:pl-10 bg-gray-50/50 border-gray-200 focus:bg-white transition-all font-mono text-sm"
                  value={formData.phone}
                  onChange={e => {
                    let value = e.target.value;
                    if (!value.startsWith("+254")) value = "+254";
                    setFormData({ ...formData, phone: value });
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <Separator className="opacity-50" />

        {/* --- SECTION 2: SECURITY --- */}
        <div className="space-y-3 md:space-y-4">
          <div className="flex items-center gap-1.5 md:gap-2 pb-1">
            <Lock className="w-4 h-4 md:w-5 md:h-5 text-amber-600" />
            <h3 className="font-semibold text-gray-800 text-sm md:text-base">Security</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <PasswordField
              label="Password *"
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
            />
            <PasswordField
              label="Confirm Password *"
              value={formData.confirmPassword}
              onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 pt-1 md:pt-2">
            <div className="space-y-1 md:space-y-1.5">
              <Label className="text-[10px] md:text-xs uppercase tracking-wider text-gray-500 font-bold flex items-center gap-1">
                <ShieldQuestion className="w-2.5 h-2.5 md:w-3 md:h-3" /> Security Question *
              </Label>
              <Select
                value={formData.resetQuestion}
                onValueChange={v => setFormData({ ...formData, resetQuestion: v })}
              >
                <SelectTrigger className="bg-gray-50/50 border-gray-200 text-sm">
                  <SelectValue placeholder="Select a question" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mother_maiden">What is your mother's maiden name?</SelectItem>
                  <SelectItem value="first_pet">What was the name of your first pet?</SelectItem>
                  <SelectItem value="birth_city">In which city were you born?</SelectItem>
                  <SelectItem value="favorite_teacher">Who was your favorite teacher?</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 md:space-y-1.5">
              <Label className="text-[10px] md:text-xs uppercase tracking-wider text-gray-500 font-bold">Your Answer *</Label>
              <Input
                placeholder="Enter answer"
                className="bg-gray-50/50 border-gray-200 focus:bg-white transition-all text-sm"
                value={formData.resetAnswer}
                onChange={e => setFormData({ ...formData, resetAnswer: e.target.value })}
              />
            </div>
          </div>
        </div>

        <Separator className="opacity-50" />

        {/* --- SECTION 3: ACADEMIC PROFILE --- */}
        <div className="space-y-3 md:space-y-4">
          <div className="flex items-center gap-1.5 md:gap-2 pb-1">
            <School className="w-4 h-4 md:w-5 md:h-5 text-emerald-600" />
            <h3 className="font-semibold text-gray-800 text-sm md:text-base">Academic Profile</h3>
          </div>

          <div className="space-y-1 md:space-y-1.5">
            <Label className="text-[10px] md:text-xs uppercase tracking-wider text-gray-500 font-bold flex items-center gap-1">
              <Target className="w-2.5 h-2.5 md:w-3 md:h-3" /> Target Score (%) *
            </Label>
            <div className="relative max-w-[200px]">
              <Input
                type="number"
                min={1}
                max={100}
                className="bg-gray-50/50 border-gray-200 focus:bg-white transition-all pr-8 font-bold text-emerald-700 text-sm"
                value={formData.targetScore}
                onChange={e => setFormData({ ...formData, targetScore: Number(e.target.value) })}
              />
              <span className="absolute right-3 top-2.5 text-gray-400 text-sm">%</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div className="space-y-1 md:space-y-1.5">
              <Label className="text-[10px] md:text-xs uppercase tracking-wider text-gray-500 font-bold flex items-center gap-1">
                <School className="w-2.5 h-2.5 md:w-3 md:h-3" /> Institution *
              </Label>
              <Select value={formData.institution} onValueChange={v => setFormData({ ...formData, institution: v })}>
                <SelectTrigger className="bg-gray-50/50 border-gray-200 text-sm">
                  <SelectValue placeholder="Choose institution" />
                </SelectTrigger>
                <SelectContent>
                  {institutions.map((inst) => (
                    <SelectItem key={inst.value} value={inst.value}>{inst.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 md:space-y-1.5">
              <Label className="text-[10px] md:text-xs uppercase tracking-wider text-gray-500 font-bold flex items-center gap-1">
                <MapPin className="w-2.5 h-2.5 md:w-3 md:h-3" /> County *
              </Label>
              <Select value={formData.county} onValueChange={v => setFormData({ ...formData, county: v })}>
                <SelectTrigger className="bg-gray-50/50 border-gray-200 text-sm">
                  <SelectValue placeholder="Choose county" />
                </SelectTrigger>
                <SelectContent>
                  {counties.map((county) => (
                    <SelectItem key={county.value} value={county.value}>{county.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div className="space-y-1 md:space-y-1.5">
              <Label className="text-[10px] md:text-xs uppercase tracking-wider text-gray-500 font-bold flex items-center gap-1">
                <BookOpen className="w-2.5 h-2.5 md:w-3 md:h-3" /> Course *
              </Label>
              <Select value={formData.course} onValueChange={v => setFormData({ ...formData, course: v })}>
                <SelectTrigger className="bg-gray-50/50 border-gray-200 text-sm">
                  <SelectValue placeholder="Select course" />
                </SelectTrigger>
                <SelectContent>
                  {courseOptions.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
              {formData.course === "other" && (
                <Input
                  placeholder="Type your course name"
                  className="mt-2 text-sm"
                  value={formData.otherCourse}
                  onChange={e => setFormData({ ...formData, otherCourse: e.target.value })}
                />
              )}
            </div>
            <div className="space-y-1 md:space-y-1.5">
              <Label className="text-[10px] md:text-xs uppercase tracking-wider text-gray-500 font-bold flex items-center gap-1">
                <Layers className="w-2.5 h-2.5 md:w-3 md:h-3" /> Level / Block *
              </Label>
              <Select value={formData.block} onValueChange={v => setFormData({ ...formData, block: v })}>
                <SelectTrigger className="bg-gray-50/50 border-gray-200 text-sm">
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  <div className="px-2 py-1.5 text-xs font-bold text-gray-400 uppercase">Semesters</div>
                  <SelectItem value="year1_sem1">Year 1 Sem 1</SelectItem>
                  <SelectItem value="year1_sem2">Year 1 Sem 2</SelectItem>
                  <SelectItem value="year2_sem1">Year 2 Sem 1</SelectItem>
                  <SelectItem value="year2_sem2">Year 2 Sem 2</SelectItem>
                  <SelectItem value="year3_sem1">Year 3 Sem 1</SelectItem>
                  <SelectItem value="year3_sem2">Year 3 Sem 2</SelectItem>
                  <Separator className="my-1" />
                  <div className="px-2 py-1.5 text-xs font-bold text-gray-400 uppercase">Blocks</div>
                  <SelectItem value="block1">Block 1</SelectItem>
                  <SelectItem value="block2">Block 2</SelectItem>
                  <SelectItem value="block3">Block 3</SelectItem>
                  <SelectItem value="block4">Block 4</SelectItem>
                  <SelectItem value="block5">Block 5</SelectItem>
                  <SelectItem value="block6">Block 6</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1 md:space-y-1.5">
            <Label className="text-[10px] md:text-xs uppercase tracking-wider text-gray-500 font-bold flex items-center gap-1">
              <FileText className="w-2.5 h-2.5 md:w-3 md:h-3" /> Short Bio
            </Label>
            <Textarea
              placeholder="Tell us a bit about your academic goals..."
              className="bg-gray-50/50 border-gray-200 min-h-[100px] resize-none text-sm"
              value={formData.bio}
              onChange={e => setFormData({ ...formData, bio: e.target.value })}
            />
          </div>
        </div>

        {/* --- SUBMIT BUTTON --- */}
        <div className="pt-1 md:pt-2">
          <Button
            className="w-full h-11 md:h-12 text-sm md:text-md font-bold transition-all shadow-md hover:shadow-lg bg-blue-600 hover:bg-blue-700 active:scale-[0.99]"
            disabled={isLoading}
            onClick={() => handleRegister("student", formData)}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </div>
            ) : (
              <div className="flex items-center gap-1.5 md:gap-2">
                <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5" />
                Create Student Account
                <ChevronRight className="w-3.5 h-3.5 md:w-4 md:h-4 ml-0.5 md:ml-1 opacity-50" />
              </div>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function TutorForm({ handleRegister, isLoading, usernameEdited, setUsernameEdited }) {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "+254",
    username: "",
    institution: "",
    county: "",
    bio: "",
    password: "",
    confirmPassword: "",
    resetQuestion: "",
    resetAnswer: "",
  });

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="border-none shadow-none bg-transparent">
        <CardContent className="p-0 space-y-6 md:space-y-8">

          {/* Section 1: Personal Identity */}
          <section className="space-y-3 md:space-y-4">
            <div className="flex items-center gap-1.5 md:gap-2 mb-1 md:mb-2">
              <div className="p-1.5 md:p-2 bg-blue-50 rounded-lg">
                <User className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
              </div>
              <h3 className="text-sm md:text-lg font-semibold text-slate-800">Personal Identity</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-5">
              <div className="space-y-1.5 md:space-y-2">
                <Label className="text-xs md:text-sm font-medium">Full Name <span className="text-destructive">*</span></Label>
                <Input
                  className="bg-white/50 focus-visible:ring-blue-500 text-sm"
                  placeholder="Tutor Jacqueline Nk"
                  value={formData.fullName}
                  onChange={e => {
                    const fullName = e.target.value;
                    setFormData({
                      ...formData,
                      fullName,
                      username: usernameEdited ? formData.username : fullName.toLowerCase().replace(/\s+/g, "")
                    });
                  }}
                />
              </div>
              <div className="space-y-1.5 md:space-y-2">
                <Label className="text-xs md:text-sm font-medium">Username <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <Input
                    className="bg-white/50 focus-visible:ring-blue-500 pl-8 text-sm"
                    placeholder="tutorJacquelinenk"
                    value={formData.username}
                    onChange={e => {
                      setUsernameEdited(true);
                      setFormData({ ...formData, username: e.target.value });
                    }}
                  />
                  <span className="absolute left-2.5 top-2.5 text-slate-400 text-sm">@</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-5">
              <div className="space-y-1.5 md:space-y-2">
                <Label className="text-xs md:text-sm font-medium">Email Address <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <Input
                    type="email"
                    className="bg-white/50 focus-visible:ring-blue-500 pl-9 text-sm"
                    placeholder="exampleJacquelinenk@gmail.com"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                  />
                  <Mail className="absolute left-3 top-2.5 w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400" />
                </div>
              </div>
              <div className="space-y-1.5 md:space-y-2">
                <Label className="text-xs md:text-sm font-medium">Phone Number <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <Input
                    className="bg-white/50 focus-visible:ring-blue-500 pl-9 text-sm"
                    value={formData.phone}
                    onChange={e => {
                      let value = e.target.value;
                      if (!value.startsWith("+254")) value = "+254";
                      setFormData({ ...formData, phone: value });
                    }}
                  />
                  <Phone className="absolute left-3 top-2.5 w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400" />
                </div>
              </div>
            </div>
          </section>

          <Separator className="opacity-50" />

          {/* Section 2: Account Security */}
          <section className="space-y-3 md:space-y-4">
            <div className="flex items-center gap-1.5 md:gap-2 mb-1 md:mb-2">
              <div className="p-1.5 md:p-2 bg-amber-50 rounded-lg">
                <Lock className="w-4 h-4 md:w-5 md:h-5 text-amber-600" />
              </div>
              <h3 className="text-sm md:text-lg font-semibold text-slate-800">Security</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-5">
              <PasswordField
                label="Password *"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
              />
              <PasswordField
                label="Confirm Password *"
                value={formData.confirmPassword}
                onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-5 pt-1 md:pt-2">
              <div className="space-y-1.5 md:space-y-2">
                <Label className="text-xs md:text-sm font-medium flex items-center gap-1.5 md:gap-2">
                  <ShieldQuestion className="w-3 h-3 md:w-3.5 md:h-3.5" /> Security Question *
                </Label>
                <Select
                  value={formData.resetQuestion}
                  onValueChange={v => setFormData({ ...formData, resetQuestion: v })}
                >
                  <SelectTrigger className="bg-white/50 focus:ring-amber-500 text-sm">
                    <SelectValue placeholder="Select question" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mother_maiden">Mother's maiden name?</SelectItem>
                    <SelectItem value="first_pet">First pet's name?</SelectItem>
                    <SelectItem value="birth_city">City of birth?</SelectItem>
                    <SelectItem value="favorite_teacher">Favorite teacher?</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 md:space-y-2">
                <Label className="text-xs md:text-sm font-medium">Security Answer *</Label>
                <Input
                  className="bg-white/50 focus-visible:ring-amber-500 text-sm"
                  placeholder="Your answer"
                  value={formData.resetAnswer}
                  onChange={e => setFormData({ ...formData, resetAnswer: e.target.value })}
                />
              </div>
            </div>
          </section>

          <Separator className="opacity-50" />

          {/* Section 3: Professional Details */}
          <section className="space-y-3 md:space-y-4">
            <div className="flex items-center gap-1.5 md:gap-2 mb-1 md:mb-2">
              <div className="p-1.5 md:p-2 bg-emerald-50 rounded-lg">
                <School className="w-4 h-4 md:w-5 md:h-5 text-emerald-600" />
              </div>
              <h3 className="text-sm md:text-lg font-semibold text-slate-800">Professional Profile</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-5">
              <div className="space-y-1.5 md:space-y-2">
                <Label className="text-xs md:text-sm font-medium flex items-center gap-1.5 md:gap-2">
                  <School className="w-3 h-3 md:w-3.5 md:h-3.5" /> Institution *
                </Label>
                <Select value={formData.institution} onValueChange={v => setFormData({ ...formData, institution: v })}>
                  <SelectTrigger className="bg-white/50 focus:ring-emerald-500 text-sm">
                    <SelectValue placeholder="Choose institution" />
                  </SelectTrigger>
                  <SelectContent>
                    {institutions.map((inst) => (
                      <SelectItem key={inst.value} value={inst.value}>{inst.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 md:space-y-2">
                <Label className="text-xs md:text-sm font-medium flex items-center gap-1.5 md:gap-2">
                  <MapPin className="w-3 h-3 md:w-3.5 md:h-3.5" /> County *
                </Label>
                <Select value={formData.county} onValueChange={v => setFormData({ ...formData, county: v })}>
                  <SelectTrigger className="bg-white/50 focus:ring-emerald-500 text-sm">
                    <SelectValue placeholder="Choose county" />
                  </SelectTrigger>
                  <SelectContent>
                    {counties.map((county) => (
                      <SelectItem key={county.value} value={county.value}>{county.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5 md:space-y-2">
              <Label className="text-xs md:text-sm font-medium flex items-center gap-1.5 md:gap-2">
                <FileText className="w-3 h-3 md:w-3.5 md:h-3.5" /> Short Professional Bio
              </Label>
              <Textarea
                className="min-h-[100px] bg-white/50 focus-visible:ring-emerald-500 resize-none text-sm"
                placeholder="Tell us about your teaching experience and expertise..."
                value={formData.bio}
                onChange={e => setFormData({ ...formData, bio: e.target.value })}
              />
            </div>
          </section>

          {/* Action Button */}
          <div className="pt-2 md:pt-4">
            <Button
              className="w-full h-11 md:h-12 text-sm md:text-base font-bold shadow-lg shadow-blue-200 transition-all active:scale-[0.98] bg-blue-600 hover:bg-blue-700"
              disabled={isLoading}
              onClick={() => handleRegister("tutor", formData)}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating Account...
                </span>
              ) : (
                <span className="flex items-center gap-1.5 md:gap-2">
                  Complete Registration <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
                </span>
              )}
            </Button>
            <p className="text-center text-[10px] md:text-xs text-slate-500 mt-3 md:mt-4">
              By registering, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}