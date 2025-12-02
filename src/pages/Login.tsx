import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { GraduationCap, UserCheck, Heart } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { useEffect } from "react";

export function Login() {
  useEffect(() => {
  document.documentElement.classList.remove("dark");
}, []);

  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

const handleForgotPassword = async (email: string) => {
  if (!email) {
    toast({
      title: "Email required",
      description: "Please enter your email to reset your password.",
      variant: "destructive",
    });
    return;
  }

  // Navigate to ResetPassword page with email pre-filled
  navigate(`/reset-password?email=${encodeURIComponent(email)}`);
};



  const handleLogin = async (
    role: "student" | "tutor" | "staff",
    email: string,
    password: string
  ) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.user) {
        throw new Error(error?.message || "Login failed.");
      }

      const userId = data.user.id;

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("role")
        .eq("id", userId)
        .single();

      if (userError || !userData) {
        throw new Error("Profile not found.");
      }

      if (userData.role !== role) {
        throw new Error("Access denied: role mismatch.");
      }

      toast({
        title: "Login successful!",
        description: `Welcome back, ${userData.role}`,
      });



      // Save role in localStorage (Supabase saves session automatically)
localStorage.setItem("userRole", userData.role);

localStorage.setItem("hasLoggedInBefore", "true");


// Navigate to role-based dashboard
navigate(`/dashboard/${userData.role}`, { replace: true });

    } catch (err: any) {
      console.error("Login error:", err);
      toast({
        title: "Login failed",
        description: err.message || "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const LoginForm = ({ role }: { role: "student" | "tutor" | "staff" }) => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    return (
      <div className="space-y-4">
        <Label>Email</Label>
        <Input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />

        <Label>Password</Label>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Your secure password"
        />

        <Button disabled={isLoading} onClick={() => handleLogin(role, email, password)}>
          {isLoading ? "Logging in..." : `Login as ${role}`}
        </Button>

        {/*Forgot Password link*/}
{email && (
  <p
    className="text-sm text-blue-600 hover:underline cursor-pointer mt-2"
    onClick={() => handleForgotPassword(email)}
  >
    Forgot Password?
  </p>
)}

      </div>
      
    );
  };

return (
<div className="flex justify-center items-center min-h-screen w-full bg-blue-500 font-sans overflow-x-hidden">

    <Card className="w-full max-w-xl bg-white shadow-lg rounded-2xl">

        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>Select your role and login</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="student">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="student">
                <GraduationCap className="mr-2" /> Student
              </TabsTrigger>
              <TabsTrigger value="tutor">
                <UserCheck className="mr-2" /> Tutor
              </TabsTrigger>
              <TabsTrigger value="staff">
                <Heart className="mr-2" /> Staff
              </TabsTrigger>
            </TabsList>

            <TabsContent value="student">
              <LoginForm role="student" />
            </TabsContent>
            <TabsContent value="tutor">
              <LoginForm role="tutor" />
            </TabsContent>
            <TabsContent value="staff">
              <LoginForm role="staff" />
            </TabsContent>
          </Tabs>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Don’t have an account?{" "}
              <Link to="/register" className="text-blue-600 hover:underline font-medium">
                Register here
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
