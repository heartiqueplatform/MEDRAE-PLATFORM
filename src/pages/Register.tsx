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
import sha256 from "crypto-js/sha256";
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
  const [usernameEdited, setUsernameEdited] = useState(false); // NEW

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
      // 1️⃣ Sign up user with Supabase Auth
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

      const userId = signUpData.user.id;
      const courseFinal = formData.course === "other" ? formData.otherCourse : formData.course;

      // 2️⃣ Update the profile created by the trigger
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

      const { data, error } = await supabase
        .from("profiles")
        .update(profileUpdatePayload)
        .eq("user_id", userId)
        .select();

      if (error) throw error;
      // 3️⃣ Sign in the user automatically
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });

      if (loginError || !loginData.user) throw new Error(loginError?.message || "Login after registration failed.");

      // 4️⃣ Save device/session info
      // 4️⃣ Handle session in new user_sessions table
      let deviceId = localStorage.getItem("device_id");
      if (!deviceId) {
        deviceId = crypto.randomUUID();
        localStorage.setItem("device_id", deviceId);
      }

      // Fetch current active sessions
      const { data: activeSessions = [], error: sessionError } = await supabase
        .from("user_sessions")
        .select("*")
        .eq("user_id", loginData.user.id);

      if (sessionError) throw sessionError;

      // Block if already 3 active sessions
      if (activeSessions.length >= 3) {
        toast({
          title: "Device limit reached",
          description: "You already have 3 active devices. Cannot login on a new device.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Insert new session
      await supabase.from("user_sessions").insert({
        user_id: loginData.user.id,
        session_id: deviceId,
        device_info: navigator.userAgent,
        created_at: new Date().toISOString(),
      });
      // 5️⃣ Toast and redirect
      toast({ title: "Welcome!", description: `Account created and logged in as ${role}.` });
      localStorage.setItem("userRole", role);
      localStorage.setItem("hasLoggedInBefore", "true");

      navigate(`/dashboard/${role}`);

    } catch (err) {
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
    const confirmed = window.confirm("Are you sure you want to exit the Medrae Nursing?");
    if (confirmed) {
      // Check if we are running as a laptop app
      if ((window as any).electronAPI) {
        (window as any).electronAPI.quitApp();
      } else {
        // If we are just in a browser, just alert
        alert("Exit command sent (This only works in the Desktop App)");
      }
    }
  };
  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row transition-all duration-1000 bg-white text-gray-900">
      {/* FLOATING EXIT BUTTON */}
      <button
        onClick={handleExitApp}
        className="fixed top-4 left-4 z-[9999] bg-red-600 hover:bg-red-700 text-white p-3 rounded-2xl shadow-2xl transition-all active:scale-95 flex items-center gap-2 font-black text-[10px] border-2 border-white"
      >
        <LogOut className="h-4 w-4" />
        EXIT MEDRAE
      </button>
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

        {/* Improved Overlay: Gradient for better readability */}
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

      {/* RIGHT FORM SIDE */}
      <div className="w-full md:w-1/2 flex justify-center items-center p-4 md:p-8 lg:p-12 overflow-y-auto">
        <div className="w-full max-w-2xl animate-in fade-in slide-in-from-right-4 duration-700">

          <Card className="w-full bg-white text-gray-900 border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem] overflow-hidden flex flex-col">

            <CardHeader className="space-y-6 pt-10 px-8 pb-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 p-2 shadow-lg shadow-blue-200">
                    <img
                      src="/pwa-192x192.jpeg"
                      alt="Logo"
                      className="w-full h-full object-contain invert"
                    />
                  </div>
                  <CardTitle className="text-2xl font-black tracking-tight text-slate-800">
                    Get Started
                  </CardTitle>
                </div>
                <Link
                  to="/login"
                  className="text-blue-600 hover:text-blue-700 font-bold text-sm bg-blue-50 px-4 py-2 rounded-full transition-colors"
                >
                  Log In
                </Link>
              </div>

              <div className="space-y-1">
                <h2 className="text-xl font-bold text-slate-700">Create your account</h2>
                <CardDescription className="text-slate-500 font-medium">
                  Select your role to personalize your experience.
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="px-8 pb-10">
              <Tabs defaultValue="student" className="w-full">

                <TabsList className="grid w-full grid-cols-3 mb-8 bg-slate-100/80 p-1.5 rounded-2xl h-14">
                  <TabsTrigger
                    value="student"
                    className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 font-bold transition-all"
                  >
                    <GraduationCap className="w-4 h-4 mr-2" /> Student
                  </TabsTrigger>

                  <TabsTrigger
                    value="tutor"
                    className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 font-bold transition-all"
                  >
                    <UserCheck className="w-4 h-4 mr-2" /> Tutor
                  </TabsTrigger>

                  <TabsTrigger
                    value="staff"
                    className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 font-bold transition-all"
                  >
                    <Stethoscope className="w-4 h-4 mr-2" /> Staff
                  </TabsTrigger>
                </TabsList>

                {/* Content Areas */}
                <div className="min-h-[400px]">
                  <TabsContent value="student" className="mt-0 focus-visible:outline-none animate-in fade-in-50 duration-500">
                    <StudentForm
                      handleRegister={handleRegister}
                      isLoading={isLoading}
                      usernameEdited={usernameEdited}
                      setUsernameEdited={setUsernameEdited}
                      courseOptions={courseOptions}
                    />
                  </TabsContent>

                  <TabsContent value="tutor" className="mt-0 focus-visible:outline-none animate-in fade-in-50 duration-500">
                    <TutorForm
                      handleRegister={handleRegister}
                      isLoading={isLoading}
                      usernameEdited={usernameEdited}
                      setUsernameEdited={setUsernameEdited}
                    />
                  </TabsContent>

                  <TabsContent value="staff" className="mt-0 focus-visible:outline-none">
                    <div className="bg-slate-50 rounded-[2rem] p-8 border border-slate-100 relative overflow-hidden">
                      {/* Abstract Background Icon */}
                      <Stethoscope className="absolute -right-8 -bottom-8 w-40 h-40 text-slate-200/50 -rotate-12" />

                      <div className="relative z-10 space-y-6">
                        <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center border border-slate-100">
                          <Info className="w-6 h-6 text-blue-500" />
                        </div>

                        <div className="space-y-3">
                          <h3 className="text-xl font-bold text-slate-800">Staff Portal Coming Soon</h3>
                          <div className="space-y-4 text-slate-600 leading-relaxed font-medium text-sm">
                            <p>
                              Our Staff registration portal is currently under development to ensure a robust experience for our administrative team.
                            </p>
                            <p>
                              In the meantime, feel free to explore the student dashboard to familiarize yourself with the platform features.
                            </p>
                          </div>
                        </div>

                        <div className="pt-2 flex flex-wrap gap-3">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-100">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Administrative Tools
                          </div>
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-100">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" /> User Management
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </div>
              </Tabs>

              {/* Bottom Footer Section */}
              <div className="mt-10 pt-8 border-t border-slate-100">
                <div className="flex flex-col items-center justify-center space-y-4">
                  <p className="text-sm text-slate-500 font-medium">
                    Already have an account?{" "}
                    <Link to="/login" className="text-blue-600 hover:text-blue-700 font-bold inline-flex items-center gap-1 group">
                      Sign in here <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </p>

                  <div className="flex gap-6">
                    <span
                      className="mx-1 underline decoration-blue-200 decoration-2 underline-offset-4 cursor-pointer text-blue-600 hover:text-blue-800 transition-colors font-bold"
                      onClick={() => navigate("/privacy")}
                    >
                      Privacy & Policy
                    </span>.
                    <span
                      className="mx-1 underline decoration-blue-200 decoration-2 underline-offset-4 cursor-pointer text-blue-600 hover:text-blue-800 transition-colors font-bold"
                      onClick={() => navigate("/terms")}
                    >
                      Terms & Conditions
                    </span>.
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
    <div className="space-y-2 relative">
      <Label>{label}</Label>
      <Input type={show ? "text" : "password"} value={value} onChange={onChange} placeholder="Enter password" className="pr-10" />
      <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-9 text-gray-500 hover:text-gray-700">
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
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
    resetQuestion: "",   // keep existing
    resetAnswer: "",     // keep existing
    targetScore: 50,     // <-- add default target
  });

  return (

    <div className="max-w-2xl mx-auto bg-white">
      <div className="space-y-8">

        {/* --- SECTION 1: ACCOUNT DETAILS --- */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-1">
            <User className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-800">Account Information</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-gray-500 font-bold">Full Name *</Label>
              <Input
                placeholder="Jackline Mildred "
                className="bg-gray-50/50 border-gray-200 focus:bg-white transition-all"
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
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-gray-500 font-bold">Username *</Label>
              <div className="relative">
                <Input
                  placeholder="JacklineMildred21"
                  className="bg-gray-50/50 border-gray-200 focus:bg-white transition-all pl-8"
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-gray-500 font-bold">Email Address *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  type="email"
                  placeholder="example@email.com"
                  className="pl-10 bg-gray-50/50 border-gray-200 focus:bg-white transition-all"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-gray-500 font-bold">Phone Number *</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  className="pl-10 bg-gray-50/50 border-gray-200 focus:bg-white transition-all font-mono"
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
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-1">
            <Lock className="w-5 h-5 text-amber-600" />
            <h3 className="font-semibold text-gray-800">Security</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-gray-500 font-bold flex items-center gap-1">
                <ShieldQuestion className="w-3 h-3" /> Security Question *
              </Label>
              <Select
                value={formData.resetQuestion}
                onValueChange={v => setFormData({ ...formData, resetQuestion: v })}
              >
                <SelectTrigger className="bg-gray-50/50 border-gray-200">
                  <SelectValue placeholder="Select a question" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mother_maiden">What is your mother’s maiden name?</SelectItem>
                  <SelectItem value="first_pet">What was the name of your first pet?</SelectItem>
                  <SelectItem value="birth_city">In which city were you born?</SelectItem>
                  <SelectItem value="favorite_teacher">Who was your favorite teacher?</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-gray-500 font-bold">Your Answer *</Label>
              <Input
                placeholder="Enter answer"
                className="bg-gray-50/50 border-gray-200 focus:bg-white transition-all"
                value={formData.resetAnswer}
                onChange={e => setFormData({ ...formData, resetAnswer: e.target.value })}
              />
            </div>
          </div>
        </div>

        <Separator className="opacity-50" />

        {/* --- SECTION 3: ACADEMIC PROFILE --- */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-1">
            <School className="w-5 h-5 text-emerald-600" />
            <h3 className="font-semibold text-gray-800">Academic Profile</h3>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-gray-500 font-bold flex items-center gap-1">
              <Target className="w-3 h-3" /> Target Score (%) *
            </Label>
            <div className="relative max-w-[200px]">
              <Input
                type="number"
                min={1}
                max={100}
                className="bg-gray-50/50 border-gray-200 focus:bg-white transition-all pr-8 font-bold text-emerald-700"
                value={formData.targetScore}
                onChange={e => setFormData({ ...formData, targetScore: Number(e.target.value) })}
              />
              <span className="absolute right-3 top-2.5 text-gray-400 text-sm">%</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-gray-500 font-bold flex items-center gap-1">
                <School className="w-3 h-3" /> Institution *
              </Label>
              <Select value={formData.institution} onValueChange={v => setFormData({ ...formData, institution: v })}>
                <SelectTrigger className="bg-gray-50/50 border-gray-200">
                  <SelectValue placeholder="Choose institution" />
                </SelectTrigger>
                <SelectContent>
                  {institutions.map((inst) => (
                    <SelectItem key={inst.value} value={inst.value}>{inst.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-gray-500 font-bold flex items-center gap-1">
                <MapPin className="w-3 h-3" /> County *
              </Label>
              <Select value={formData.county} onValueChange={v => setFormData({ ...formData, county: v })}>
                <SelectTrigger className="bg-gray-50/50 border-gray-200">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-gray-500 font-bold flex items-center gap-1">
                <BookOpen className="w-3 h-3" /> Course *
              </Label>
              <Select value={formData.course} onValueChange={v => setFormData({ ...formData, course: v })}>
                <SelectTrigger className="bg-gray-50/50 border-gray-200">
                  <SelectValue placeholder="Select course" />
                </SelectTrigger>
                <SelectContent>
                  {courseOptions.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
              {formData.course === "other" && (
                <Input
                  placeholder="Type your course name"
                  className="mt-2 animate-in slide-in-from-top-1"
                  value={formData.otherCourse}
                  onChange={e => setFormData({ ...formData, otherCourse: e.target.value })}
                />
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-gray-500 font-bold flex items-center gap-1">
                <Layers className="w-3 h-3" /> Level / Block *
              </Label>
              <Select value={formData.block} onValueChange={v => setFormData({ ...formData, block: v })}>
                <SelectTrigger className="bg-gray-50/50 border-gray-200">
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

          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-gray-500 font-bold flex items-center gap-1">
              <FileText className="w-3 h-3" /> Short Bio
            </Label>
            <Textarea
              placeholder="Tell us a bit about your academic goals..."
              className="bg-gray-50/50 border-gray-200 min-h-[100px] resize-none"
              value={formData.bio}
              onChange={e => setFormData({ ...formData, bio: e.target.value })}
            />
          </div>
        </div>

        {/* --- SUBMIT BUTTON --- */}
        <div className="pt-2">
          <Button
            className="w-full h-12 text-md font-bold transition-all shadow-md hover:shadow-lg bg-blue-600 hover:bg-blue-700 active:scale-[0.99]"
            disabled={isLoading}
            onClick={() => handleRegister("student", formData)}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                Create Student Account
                <ChevronRight className="w-4 h-4 ml-1 opacity-50" />
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
    resetQuestion: "",  // <-- new
    resetAnswer: "",    // <-- new
  });

  return (
    <div className="max-w-2xl mx-auto p-1">
      <Card className="border-none shadow-none bg-transparent">
        <CardContent className="p-0 space-y-8">

          {/* Section 1: Personal Identity */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-blue-50 rounded-lg">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800">Personal Identity</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Full Name <span className="text-destructive">*</span></Label>
                <Input
                  className="bg-white/50 focus-visible:ring-blue-500"
                  placeholder="Jackline Mildred "
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
              <div className="space-y-2">
                <Label className="text-sm font-medium">Username <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <Input
                    className="bg-white/50 focus-visible:ring-blue-500 pl-8"
                    placeholder="JacklineMildred21"
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Email Address <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <Input
                    type="email"
                    className="bg-white/50 focus-visible:ring-blue-500 pl-9"
                    placeholder="example@email.com"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                  />
                  <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Phone Number <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <Input
                    className="bg-white/50 focus-visible:ring-blue-500 pl-9"
                    value={formData.phone}
                    onChange={e => {
                      let value = e.target.value;
                      if (!value.startsWith("+254")) value = "+254";
                      setFormData({ ...formData, phone: value });
                    }}
                  />
                  <Phone className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                </div>
              </div>
            </div>
          </section>

          <MoreHorizontal className="bg-slate-100" />

          {/* Section 2: Account Security */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-amber-50 rounded-lg">
                <Lock className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800">Security</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <ShieldQuestion className="w-3.5 h-3.5" /> Security Question *
                </Label>
                <Select
                  value={formData.resetQuestion}
                  onValueChange={v => setFormData({ ...formData, resetQuestion: v })}
                >
                  <SelectTrigger className="bg-white/50 focus:ring-amber-500">
                    <SelectValue placeholder="Select question" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mother_maiden">Mother’s maiden name?</SelectItem>
                    <SelectItem value="first_pet">First pet's name?</SelectItem>
                    <SelectItem value="birth_city">City of birth?</SelectItem>
                    <SelectItem value="favorite_teacher">Favorite teacher?</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Security Answer *</Label>
                <Input
                  className="bg-white/50 focus-visible:ring-amber-500"
                  placeholder="Your answer"
                  value={formData.resetAnswer}
                  onChange={e => setFormData({ ...formData, resetAnswer: e.target.value })}
                />
              </div>
            </div>
          </section>

          <MoreHorizontal className="bg-slate-100" />

          {/* Section 3: Professional Details */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <School className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800">Professional Profile</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <School className="w-3.5 h-3.5" /> Institution *
                </Label>
                <Select value={formData.institution} onValueChange={v => setFormData({ ...formData, institution: v })}>
                  <SelectTrigger className="bg-white/50 focus:ring-emerald-500">
                    <SelectValue placeholder="Choose institution" />
                  </SelectTrigger>
                  <SelectContent>
                    {institutions.map((inst) => (
                      <SelectItem key={inst.value} value={inst.value}>{inst.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5" /> County *
                </Label>
                <Select value={formData.county} onValueChange={v => setFormData({ ...formData, county: v })}>
                  <SelectTrigger className="bg-white/50 focus:ring-emerald-500">
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

            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <FileText className="w-3.5 h-3.5" /> Short Professional Bio
              </Label>
              <Textarea
                className="min-h-[100px] bg-white/50 focus-visible:ring-emerald-500 resize-none"
                placeholder="Tell us about your teaching experience and expertise..."
                value={formData.bio}
                onChange={e => setFormData({ ...formData, bio: e.target.value })}
              />
            </div>
          </section>

          {/* Action Button */}
          <div className="pt-4">
            <Button
              className="w-full h-12 text-base font-bold shadow-lg shadow-blue-200 transition-all active:scale-[0.98] bg-blue-600 hover:bg-blue-700"
              disabled={isLoading}
              onClick={() => handleRegister("tutor", formData)}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating Account...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Complete Registration <ChevronRight className="w-5 h-5" />
                </span>
              )}
            </Button>
            <p className="text-center text-xs text-slate-500 mt-4">
              By registering, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>

        </CardContent>
      </Card>
    </div>


  );
}