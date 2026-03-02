import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { GraduationCap, UserCheck, Stethoscope, Eye, EyeOff } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { useEffect } from "react";
import sha256 from "crypto-js/sha256";
export function Register() {
  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);
  const [usernameEdited, setUsernameEdited] = useState(false); // NEW

  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const courseOptions = [
    // DEGREE LEVEL
    { value: "bsc-nursing", label: "Bachelor of Science in Nursing (BScN) ★★★★★" },
    // DIPLOMA / CORE NURSING
    { value: "krchn", label: "Kenya Registered Community Health Nursing (KRCHN)  ★★★★" },
    // POST-BASIC NURSING SPECIALIZATIONS
    { value: "midwifery", label: "Midwifery ★★★" },
    { value: "critical-care-nursing", label: "Critical Care Nursing ★★★" },
    { value: "mental-health-nursing", label: "Mental Health & Psychiatry Nursing  ★★★" },
    { value: "pediatric-nursing", label: "Pediatric Nursing ★★★" },
    { value: "oncology-nursing", label: "Oncology Nursing ★★★" },
    { value: "palliative-care-nursing", label: "Palliative Care Nursing ★★★" },
    { value: "community-health-nursing", label: "Community Health Nursing ★★★" },
    // OTHER NURSING OPTIONS
    { value: "perioperative-nursing", label: "Perioperative (Theatre) Nursing  ★★★" },
    { value: "renal-nursing", label: "Renal Nursing  ★★★" },
    // FALLBACK
    { value: "other", label: "Other (Nursing Related) ★★" },


  ];

  const handleRegister = async (role, formData) => {
    if (formData.password !== formData.confirmPassword) {
      toast({ title: "Password Mismatch!", description: "Passwords must match.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: { data: { role } },
      });
      if (signUpError || !signUpData.user) throw new Error(signUpError?.message || "Sign-up failed.");

      const userId = signUpData.user.id;
      const courseFinal = formData.course === "other" ? formData.otherCourse : formData.course;

      // Insert into users table
      const userPayload =
        role === "tutor"
          ? {
            id: userId,
            full_name: formData.fullName,
            email: formData.email,
            phone: formData.phone,
            username: formData.username,
            role,
            institution: formData.institution,
            county: formData.county,
            bio: formData.bio,
            plan_type: "free",
          }
          : {
            id: userId,
            full_name: formData.fullName,
            email: formData.email,
            phone: formData.phone,
            username: formData.username,
            role,
            institution: formData.institution,
            county: formData.county,
            course: courseFinal,
            block_class: formData.block,
            bio: formData.bio,
            plan_type: "free",
          };

      const { error: userInsertError } = await supabase.from("users").insert(userPayload);
      if (userInsertError) throw new Error(userInsertError.message);

      // Insert into profiles table
      const profilePayload =
        role === "tutor"
          ? {
            user_id: userId,
            name: formData.fullName,
            email: formData.email,
            username: formData.username,
            phone: formData.phone,
            county: formData.county,
            institution: formData.institution,
            bio: formData.bio,
            role,
            subscription: "Free",
            joined_date: new Date().toISOString().split("T")[0],
          }
          : {
            user_id: userId,
            name: formData.fullName,
            email: formData.email,
            username: formData.username,
            phone: formData.phone,
            county: formData.county,
            institution: formData.institution,
            course: courseFinal,
            block: formData.block,
            reset_question: formData.resetQuestion,
            reset_answer: formData.resetAnswer,
            target_score: formData.targetScore,  // <-- save user target here
            bio: formData.bio,
            role,
            subscription: "Free",
            joined_date: new Date().toISOString().split("T")[0],
          };

      const { error: profileInsertError } = await supabase.from("profiles").insert(profilePayload);
      if (profileInsertError) throw new Error(profileInsertError.message);

      // Sign in the user to get a session
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (loginError || !loginData.user) throw new Error(loginError?.message || "Login after registration failed.");

      // Save session token in profiles table
      // Generate unique device ID (single device enforcement)
      let deviceId = localStorage.getItem("device_id");

      if (!deviceId) {
        deviceId = crypto.randomUUID();
        localStorage.setItem("device_id", deviceId);
      }

      // Save device ID in profiles table
      await supabase
        .from("profiles")
        .update({ active_session_id: deviceId })
        .eq("user_id", loginData.user.id);

      // Optional: Save credentials offline if you want offline login (like in Login component)

      const passwordHash = sha256(formData.password).toString();
      await saveLoginInfo(formData.email, deviceId, passwordHash);


      toast({ title: "Welcome!", description: `Account created and logged in as ${role}.` });
      localStorage.setItem("userRole", role);
      localStorage.setItem("hasLoggedInBefore", "true");

      navigate(`/dashboard/${role}`);

    } catch (err) {
      toast({ title: "Registration failed!", description: err.message || "Something went wrong.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

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

  function StudentForm() {
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
      <div className="space-y-3  ">
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Full Name *</Label><Input
            placeholder="John Doe"
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
          <div><Label>Username *</Label><Input
            placeholder="johndoe123"
            value={formData.username}
            onChange={e => {
              setUsernameEdited(true); // NEW: stop auto-fill after manual edit
              setFormData({ ...formData, username: e.target.value });
            }}
          />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Email *</Label>
            <Input
              type="email"
              placeholder="example@email.com"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div>
            <Label>Phone Number *</Label>
            <Input
              value={formData.phone}
              onChange={e => {
                let value = e.target.value;
                if (!value.startsWith("+254")) value = "+254";
                setFormData({ ...formData, phone: value });
              }}
            />
          </div>
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

        <Label>Security Question *</Label>
        <Select
          value={formData.resetQuestion}
          onValueChange={v => setFormData({ ...formData, resetQuestion: v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a security question" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mother_maiden">What is your mother’s maiden name?</SelectItem>
            <SelectItem value="first_pet">What was the name of your first pet?</SelectItem>
            <SelectItem value="birth_city">In which city were you born?</SelectItem>
            <SelectItem value="favorite_teacher">Who was your favorite teacher?</SelectItem>
          </SelectContent>
        </Select>

        <Label>Answer *</Label>
        <Input
          placeholder="Enter answer"
          value={formData.resetAnswer}
          onChange={e => setFormData({ ...formData, resetAnswer: e.target.value })}
        />
        <Label>Choose your Target Score (%) *</Label>
        <Input
          type="number"
          min={1}
          max={100}
          placeholder="Set your target score"
          value={formData.targetScore}
          onChange={e => setFormData({ ...formData, targetScore: Number(e.target.value) })}
        />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Institution *</Label>
            <Select value={formData.institution} onValueChange={v => setFormData({ ...formData, institution: v })}>
              <SelectTrigger><SelectValue placeholder="Choose institution" /></SelectTrigger>
              <SelectContent>
                {/* All KMTC campuses */}
                <SelectItem value="kmtc_amboseli">KMTC Amboseli</SelectItem>
                <SelectItem value="kmtc_bomet">KMTC Bomet</SelectItem>
                <SelectItem value="kmtc_busia">KMTC Busia</SelectItem>
                <SelectItem value="kmtc_eldoret">KMTC Eldoret</SelectItem>
                <SelectItem value="kmtc_embu">KMTC Embu</SelectItem>
                <SelectItem value="kmtc_garissa">KMTC Garissa</SelectItem>
                <SelectItem value="kmtc_homa_bay">KMTC Homa Bay</SelectItem>
                <SelectItem value="kmtc_kakamega">KMTC Kakamega</SelectItem>
                <SelectItem value="kmtc_kajiado">KMTC Kajiado</SelectItem>
                <SelectItem value="kmtc_kamulu">KMTC Kamulu</SelectItem>
                <SelectItem value="kmtc_kericho">KMTC Kericho</SelectItem>
                <SelectItem value="kmtc_kilifi">KMTC Kilifi</SelectItem>
                <SelectItem value="kmtc_kitui">KMTC Kitui</SelectItem>
                <SelectItem value="kmtc_kisii">KMTC Kisii</SelectItem>
                <SelectItem value="kmtc_kisumu">KMTC Kisumu</SelectItem>
                <SelectItem value="kmtc_kitale">KMTC Kitale</SelectItem>
                <SelectItem value="kmtc_koibatek">KMTC Koibatek</SelectItem>
                <SelectItem value="kmtc_kuresoi">KMTC Kuresoi</SelectItem>
                <SelectItem value="kmtc_lamu">KMTC Lamu</SelectItem>
                <SelectItem value="kmtc_malindi">KMTC Malindi</SelectItem>
                <SelectItem value="kmtc_marsabit">KMTC Marsabit</SelectItem>
                <SelectItem value="kmtc_meru">KMTC Meru</SelectItem>
                <SelectItem value="kmtc_migori">KMTC Migori</SelectItem>
                <SelectItem value="kmtc_mombasa">KMTC Mombasa</SelectItem>
                <SelectItem value="kmtc_murang'a">KMTC Murang'a</SelectItem>
                <SelectItem value="kmtc_nairobi">KMTC Nairobi</SelectItem>
                <SelectItem value="kmtc_nakuru">KMTC Nakuru</SelectItem>
                <SelectItem value="kmtc_nandi">KMTC Nandi</SelectItem>
                <SelectItem value="kmtc_narok">KMTC Narok</SelectItem>
                <SelectItem value="kmtc_nyandarua">KMTC Nyandarua</SelectItem>
                <SelectItem value="kmtc_nyeri">KMTC Nyeri</SelectItem>
                <SelectItem value="kmtc_samburu">KMTC Samburu</SelectItem>
                <SelectItem value="kmtc_sotik">KMTC Sotik</SelectItem>
                <SelectItem value="kmtc_thika">KMTC Thika</SelectItem>
                <SelectItem value="kmtc_trans_nzoia">KMTC Trans Nzoia</SelectItem>
                <SelectItem value="kmtc_ujiji">KMTC Ujiji</SelectItem>
                <SelectItem value="kmtc_uar">KMTC Uasin Gishu</SelectItem>

                {/* Fidenza School of Nursing Kyeni */}
                <SelectItem value="fidenza_kyeni">Fidenza School of Nursing Kyeni</SelectItem>

                {/* Other institutions */}
                <SelectItem value="kenyatta_university">Kenyatta University</SelectItem>
                <SelectItem value="mount_kenya_university">Mount Kenya University</SelectItem>
                <SelectItem value="university_of_nairobi">University of Nairobi</SelectItem>
                <SelectItem value="strathmore_university">Strathmore University</SelectItem>
                <SelectItem value="private_nursing_school">Private Nursing School</SelectItem>
                <SelectItem value="consolata_kyeni">Consolata Hospital Kyeni</SelectItem>

                {/* Other */}
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>

            </Select>
          </div>
          <div>
            <Label>County *</Label>
            <Select value={formData.county} onValueChange={v => setFormData({ ...formData, county: v })}>
              <SelectTrigger><SelectValue placeholder="Choose county" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mombasa">Mombasa</SelectItem>
                <SelectItem value="kwale">Kwale</SelectItem>
                <SelectItem value="kilifi">Kilifi</SelectItem>
                <SelectItem value="tsamaku">Tana River</SelectItem>
                <SelectItem value="lamu">Lamu</SelectItem>
                <SelectItem value="taita-taveta">Taita-Taveta</SelectItem>
                <SelectItem value="garissa">Garissa</SelectItem>
                <SelectItem value="wajir">Wajir</SelectItem>
                <SelectItem value="mandera">Mandera</SelectItem>
                <SelectItem value="marsabit">Marsabit</SelectItem>
                <SelectItem value="isiolo">Isiolo</SelectItem>
                <SelectItem value="meri">Meru</SelectItem>
                <SelectItem value="tharaka-nithi">Tharaka-Nithi</SelectItem>
                <SelectItem value="embu">Embu</SelectItem>
                <SelectItem value="kitui">Kitui</SelectItem>
                <SelectItem value="machakos">Machakos</SelectItem>
                <SelectItem value="mata">Makueni</SelectItem>
                <SelectItem value="nyandarua">Nyandarua</SelectItem>
                <SelectItem value="nyeri">Nyeri</SelectItem>
                <SelectItem value="kirinyaga">Kirinyaga</SelectItem>
                <SelectItem value="murang'a">Murang'a</SelectItem>
                <SelectItem value="kiambu">Kiambu</SelectItem>
                <SelectItem value="turkana">Turkana</SelectItem>
                <SelectItem value="west-pokot">West Pokot</SelectItem>
                <SelectItem value="samburu">Samburu</SelectItem>
                <SelectItem value="trans-nzoia">Trans Nzoia</SelectItem>
                <SelectItem value="ucegelo">Uasin Gishu</SelectItem>
                <SelectItem value="elgeyo-marakwet">Elgeyo Marakwet</SelectItem>
                <SelectItem value="nandi">Nandi</SelectItem>
                <SelectItem value="bomet">Bomet</SelectItem>
                <SelectItem value="kericho">Kericho</SelectItem>
                <SelectItem value="kakamega">Kakamega</SelectItem>
                <SelectItem value="vihiga">Vihiga</SelectItem>
                <SelectItem value="bungoma">Bungoma</SelectItem>
                <SelectItem value="busia">Busia</SelectItem>
                <SelectItem value="siaya">Siaya</SelectItem>
                <SelectItem value="kisumu">Kisumu</SelectItem>
                <SelectItem value="homabay">Homa Bay</SelectItem>
                <SelectItem value="migori">Migori</SelectItem>
                <SelectItem value="kisii">Kisii</SelectItem>
                <SelectItem value="nyamira">Nyamira</SelectItem>
                <SelectItem value="nairobi">Nairobi</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>

            </Select>
          </div>
        </div>

        <Label>Course *</Label>
        <Select value={formData.course} onValueChange={v => setFormData({ ...formData, course: v })}>
          <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
          <SelectContent>
            {courseOptions.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        {formData.course === "other" && (
          <Input placeholder="Enter your course" value={formData.otherCourse} onChange={e => setFormData({ ...formData, otherCourse: e.target.value })} />
        )}

        <Label>Block *</Label>
        <Select value={formData.block} onValueChange={v => setFormData({ ...formData, block: v })}>
          <SelectTrigger><SelectValue placeholder="Select block" /></SelectTrigger>
          <SelectContent>
            {/* Year and Semester */}
            <SelectItem value="year1_sem1">Year 1 Semester 1</SelectItem>
            <SelectItem value="year1_sem2">Year 1 Semester 2</SelectItem>
            <SelectItem value="year2_sem1">Year 2 Semester 1</SelectItem>
            <SelectItem value="year2_sem2">Year 2 Semester 2</SelectItem>
            <SelectItem value="year3_sem1">Year 3 Semester 1</SelectItem>
            <SelectItem value="year3_sem2">Year 3 Semester 2</SelectItem>
            <SelectItem value="year4_sem1">Year 4 Semester 1</SelectItem>
            <SelectItem value="year4_sem2">Year 4 Semester 2</SelectItem>

            {/* Blocks */}
            <SelectItem value="block1">Block 1</SelectItem>
            <SelectItem value="block2">Block 2</SelectItem>
            <SelectItem value="block3">Block 3</SelectItem>
            <SelectItem value="block4">Block 4</SelectItem>
            <SelectItem value="block5">Block 5</SelectItem>
            <SelectItem value="block6">Block 6</SelectItem>
          </SelectContent>

        </Select>

        <Label>Short Bio</Label>
        <Textarea placeholder="Tell us a bit about yourself..." value={formData.bio} onChange={e => setFormData({ ...formData, bio: e.target.value })} />

        <Button className="w-full" disabled={isLoading} onClick={() => handleRegister("student", formData)}>
          {isLoading ? "Registering..." : "Register as student"}
        </Button>
      </div>
    );
  }

  function TutorForm() {
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
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Full Name *</Label><Input
            placeholder="John Doe"
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
          <div><Label>Username *</Label><Input
            placeholder="johndoe123"
            value={formData.username}
            onChange={e => {
              setUsernameEdited(true); // NEW: stop auto-fill after manual edit
              setFormData({ ...formData, username: e.target.value });
            }}
          />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Email *</Label>
            <Input
              type="email"
              placeholder="example@email.com"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div>
            <Label>Phone Number *</Label>
            <Input
              value={formData.phone}
              onChange={e => {
                let value = e.target.value;
                if (!value.startsWith("+254")) value = "+254";
                setFormData({ ...formData, phone: value });
              }}
            />
          </div>
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

        <Label>Security Question *</Label>
        <Select
          value={formData.resetQuestion}
          onValueChange={v => setFormData({ ...formData, resetQuestion: v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a security question" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mother_maiden">What is your mother’s maiden name?</SelectItem>
            <SelectItem value="first_pet">What was the name of your first pet?</SelectItem>
            <SelectItem value="birth_city">In which city were you born?</SelectItem>
            <SelectItem value="favorite_teacher">Who was your favorite teacher?</SelectItem>
          </SelectContent>
        </Select>

        <Label>Answer *</Label>
        <Input
          placeholder="Enter answer"
          value={formData.resetAnswer}
          onChange={e => setFormData({ ...formData, resetAnswer: e.target.value })}
        />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Institution *</Label>
            <Select value={formData.institution} onValueChange={v => setFormData({ ...formData, institution: v })}>
              <SelectTrigger><SelectValue placeholder="Choose institution" /></SelectTrigger>
              <SelectContent>
                {/* All KMTC campuses */}
                <SelectItem value="kmtc_amboseli">KMTC Amboseli</SelectItem>
                <SelectItem value="kmtc_bomet">KMTC Bomet</SelectItem>
                <SelectItem value="kmtc_busia">KMTC Busia</SelectItem>
                <SelectItem value="kmtc_eldoret">KMTC Eldoret</SelectItem>
                <SelectItem value="kmtc_embu">KMTC Embu</SelectItem>
                <SelectItem value="kmtc_garissa">KMTC Garissa</SelectItem>
                <SelectItem value="kmtc_homa_bay">KMTC Homa Bay</SelectItem>
                <SelectItem value="kmtc_kakamega">KMTC Kakamega</SelectItem>
                <SelectItem value="kmtc_kajiado">KMTC Kajiado</SelectItem>
                <SelectItem value="kmtc_kamulu">KMTC Kamulu</SelectItem>
                <SelectItem value="kmtc_kericho">KMTC Kericho</SelectItem>
                <SelectItem value="kmtc_kilifi">KMTC Kilifi</SelectItem>
                <SelectItem value="kmtc_kitui">KMTC Kitui</SelectItem>
                <SelectItem value="kmtc_kisii">KMTC Kisii</SelectItem>
                <SelectItem value="kmtc_kisumu">KMTC Kisumu</SelectItem>
                <SelectItem value="kmtc_kitale">KMTC Kitale</SelectItem>
                <SelectItem value="kmtc_koibatek">KMTC Koibatek</SelectItem>
                <SelectItem value="kmtc_kuresoi">KMTC Kuresoi</SelectItem>
                <SelectItem value="kmtc_lamu">KMTC Lamu</SelectItem>
                <SelectItem value="kmtc_malindi">KMTC Malindi</SelectItem>
                <SelectItem value="kmtc_marsabit">KMTC Marsabit</SelectItem>
                <SelectItem value="kmtc_meru">KMTC Meru</SelectItem>
                <SelectItem value="kmtc_migori">KMTC Migori</SelectItem>
                <SelectItem value="kmtc_mombasa">KMTC Mombasa</SelectItem>
                <SelectItem value="kmtc_murang'a">KMTC Murang'a</SelectItem>
                <SelectItem value="kmtc_nairobi">KMTC Nairobi</SelectItem>
                <SelectItem value="kmtc_nakuru">KMTC Nakuru</SelectItem>
                <SelectItem value="kmtc_nandi">KMTC Nandi</SelectItem>
                <SelectItem value="kmtc_narok">KMTC Narok</SelectItem>
                <SelectItem value="kmtc_nyandarua">KMTC Nyandarua</SelectItem>
                <SelectItem value="kmtc_nyeri">KMTC Nyeri</SelectItem>
                <SelectItem value="kmtc_samburu">KMTC Samburu</SelectItem>
                <SelectItem value="kmtc_sotik">KMTC Sotik</SelectItem>
                <SelectItem value="kmtc_thika">KMTC Thika</SelectItem>
                <SelectItem value="kmtc_trans_nzoia">KMTC Trans Nzoia</SelectItem>
                <SelectItem value="kmtc_ujiji">KMTC Ujiji</SelectItem>
                <SelectItem value="kmtc_uar">KMTC Uasin Gishu</SelectItem>
                <SelectItem value="kmtc_Bungoma ">KMTC Bungoma </SelectItem>
                <SelectItem value="kmtc_Webuye">KMTC Webuye</SelectItem>
                <SelectItem value="Mp Shah Hospital Nursing School">Mp Shah Hospital Nursing School</SelectItem>


                {/* Fidenza School of Nursing Kyeni */}
                <SelectItem value="fidenza_kyeni">Fidenza School of Nursing Kyeni</SelectItem>

                {/* Other institutions */}
                <SelectItem value="kenyatta_university">Kenyatta University</SelectItem>
                <SelectItem value="mount_kenya_university">Mount Kenya University</SelectItem>
                <SelectItem value="university_of_nairobi">University of Nairobi</SelectItem>
                <SelectItem value="strathmore_university">Strathmore University</SelectItem>
                <SelectItem value="private_nursing_school">Private Nursing School</SelectItem>
                <SelectItem value="consolata_kyeni">Consolata Hospital Kyeni</SelectItem>

                {/* Other */}
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>

            </Select>
          </div>
          <div>
            <Label>County *</Label>
            <Select value={formData.county} onValueChange={v => setFormData({ ...formData, county: v })}>
              <SelectTrigger><SelectValue placeholder="Choose county" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mombasa">Mombasa</SelectItem>
                <SelectItem value="kwale">Kwale</SelectItem>
                <SelectItem value="kilifi">Kilifi</SelectItem>
                <SelectItem value="tsamaku">Tana River</SelectItem>
                <SelectItem value="lamu">Lamu</SelectItem>
                <SelectItem value="taita-taveta">Taita-Taveta</SelectItem>
                <SelectItem value="garissa">Garissa</SelectItem>
                <SelectItem value="wajir">Wajir</SelectItem>
                <SelectItem value="mandera">Mandera</SelectItem>
                <SelectItem value="marsabit">Marsabit</SelectItem>
                <SelectItem value="isiolo">Isiolo</SelectItem>
                <SelectItem value="meri">Meru</SelectItem>
                <SelectItem value="tharaka-nithi">Tharaka-Nithi</SelectItem>
                <SelectItem value="embu">Embu</SelectItem>
                <SelectItem value="kitui">Kitui</SelectItem>
                <SelectItem value="machakos">Machakos</SelectItem>
                <SelectItem value="mata">Makueni</SelectItem>
                <SelectItem value="nyandarua">Nyandarua</SelectItem>
                <SelectItem value="nyeri">Nyeri</SelectItem>
                <SelectItem value="kirinyaga">Kirinyaga</SelectItem>
                <SelectItem value="murang'a">Murang'a</SelectItem>
                <SelectItem value="kiambu">Kiambu</SelectItem>
                <SelectItem value="turkana">Turkana</SelectItem>
                <SelectItem value="west-pokot">West Pokot</SelectItem>
                <SelectItem value="samburu">Samburu</SelectItem>
                <SelectItem value="trans-nzoia">Trans Nzoia</SelectItem>
                <SelectItem value="ucegelo">Uasin Gishu</SelectItem>
                <SelectItem value="elgeyo-marakwet">Elgeyo Marakwet</SelectItem>
                <SelectItem value="nandi">Nandi</SelectItem>
                <SelectItem value="bomet">Bomet</SelectItem>
                <SelectItem value="kericho">Kericho</SelectItem>
                <SelectItem value="kakamega">Kakamega</SelectItem>
                <SelectItem value="vihiga">Vihiga</SelectItem>
                <SelectItem value="bungoma">Bungoma</SelectItem>
                <SelectItem value="busia">Busia</SelectItem>
                <SelectItem value="siaya">Siaya</SelectItem>
                <SelectItem value="kisumu">Kisumu</SelectItem>
                <SelectItem value="homabay">Homa Bay</SelectItem>
                <SelectItem value="migori">Migori</SelectItem>
                <SelectItem value="kisii">Kisii</SelectItem>
                <SelectItem value="nyamira">Nyamira</SelectItem>
                <SelectItem value="nairobi">Nairobi</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>

            </Select>
          </div>
        </div>

        <Label>Short Bio</Label>
        <Textarea placeholder="Your professional background..." value={formData.bio} onChange={e => setFormData({ ...formData, bio: e.target.value })} />


        <Button className="w-full" disabled={isLoading} onClick={() => handleRegister("tutor", formData)}>
          {isLoading ? "Registering..." : "Register as tutor"}
        </Button>

      </div>


    );
  }

  return (
    <div className="flex justify-center items-center min-h-screen w-full bg-blue-500 font-sans overflow-x-hidden">

      <Card className="w-full max-w-4xl bg-white rounded-2xl shadow-lg">
        <CardHeader className="flex justify-between items-center">
          <CardTitle className="text-2xl font-bold">Create Your Account</CardTitle>
          <Link
            to="/login"
            className="text-blue-600 hover:underline font-medium text-sm"
          >
            I have an account, login in
          </Link>
        </CardHeader>
        <CardDescription className="p-4 ">Register as a Student, Tutor or Staff</CardDescription>

        <CardContent className="pb-8 md:pb-6">
          <Tabs defaultValue="student">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="student"><GraduationCap className="mr-2" /> Student</TabsTrigger>
              <TabsTrigger value="tutor"><UserCheck className="mr-2" /> Tutor</TabsTrigger>
              <TabsTrigger value="staff"><Stethoscope className="mr-2" /> Staff</TabsTrigger>
            </TabsList>

            <TabsContent value="student"><StudentForm /></TabsContent>
            <TabsContent value="tutor">
              <div className="p-0 text-left text-lg font-semibold text-gray-700 space-y-4">
                <p>
                  Our Tutor registration portal is currently under development as we work to provide a comprehensive and seamless experience for educators.
                </p>
                <p>
                  While we finalize these features, you are welcome to register as a Student to explore our platform, participate in surveys, and gain insight into the learning journey your students will encounter.
                </p>
                <p>
                  We highly value your expertise and interest, and we look forward to supporting your teaching endeavors very soon.
                </p>
              </div>
            </TabsContent>
            <TabsContent value="staff">
              <div className="p-0 text-left text-lg font-semibold text-gray-700 space-y-4">
                <p>
                  Our Staff registration portal is currently under development as we work to create a seamless and robust experience for our administrative and support team.
                </p>
                <p>
                  In the meantime, you can explore the platform to familiarize yourself with its features, review content, and get an overview of the student experience. This will help you prepare for your role once staff access is available.
                </p>
                <p>
                  Your contribution is highly valued, and we look forward to providing you with full access to staff features very soon.
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <div className="mt-6 mb-4 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="text-blue-600 hover:underline font-medium">Log in here</Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default Register;
