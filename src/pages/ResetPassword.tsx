import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { ArrowLeft, ArrowRight } from "lucide-react";

export default function ResetPassword() {
  const [email, setEmail] = useState("");
  const [resetQuestion, setResetQuestion] = useState("");
  const [resetAnswer, setResetAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"request" | "answer" | "newPassword">("request");

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Pre-fill email if it comes from query string
  useEffect(() => {
    const emailFromQuery = searchParams.get("email");
    if (emailFromQuery) {
      setEmail(emailFromQuery);
      setStep("answer"); // skip request step if email is provided
      fetchResetQuestion(emailFromQuery);
    }
  }, [searchParams]);

  // Fetch the security question for a given email
  const fetchResetQuestion = async (email: string) => {
    const { data: userProfile, error } = await supabase
      .from("profiles")
      .select("reset_question")
      .eq("email", email.trim())
      .single();

    if (error || !userProfile) {
      const whatsappNumber = "254717517371";
      const prefilledMessage = encodeURIComponent(
        `Hello, I attempted to reset my password for ${email.trim()} but my email is not recognized. Please assist me.`
      );
      const whatsappLink = `https://wa.me/${whatsappNumber}?text=${prefilledMessage}`;

      toast({
        title: "Email not found",
        description: (
          <span>
            To reset your password, you must answer the security question associated with your account.
            If you are unable to provide an answer or need assistance, you can reach our support team directly.
            <br />
            Contact us via{" "}
            <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="underline">
              WhatsApp
            </a>
          </span>
        ),
        variant: "destructive",
      });
      return;
    }

    setResetQuestion(userProfile.reset_question || "");
  };


  // Step 1: Request reset
  const handleRequestReset = async () => {
    if (!email.trim()) {
      const whatsappNumber = "254717517371";
      const prefilledMessage = encodeURIComponent(
        `Hello, I attempted to reset my password but didn't enter my email. Please assist me.`
      );
      const whatsappLink = `https://wa.me/${whatsappNumber}?text=${prefilledMessage}`;

      toast({
        title: "Email required",
        description: (
          <span>
            To reset your password, you must answer the security question associated with your account.
            If you are unable to provide an answer or need assistance, you can reach our support team directly.
            <br />
            Contact us via{" "}
            <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="underline">
              WhatsApp
            </a>
          </span>
        ),
        variant: "destructive",
      });
      return;
    }

    await fetchResetQuestion(email.trim());
    setStep("answer");
  };

  // Step 2: Answer security question
  const handleCheckAnswer = async () => {
    if (!resetAnswer.trim()) {
      const whatsappNumber = "254717517371";
      const prefilledMessage = encodeURIComponent(
        `Hello, I attempted to reset my password but didn't provide an answer to the security question. Please assist me.`
      );
      const whatsappLink = `https://wa.me/${whatsappNumber}?text=${prefilledMessage}`;

      toast({
        title: "Answer required",
        description: (
          <span>
            To reset your password, you must answer the security question associated with your account.
            If you are unable to provide an answer or need assistance, you can reach our support team directly.
            <br />
            Contact us via{" "}
            <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="underline">
              WhatsApp
            </a>.
          </span>
        ),
        variant: "destructive",
      });
      return;
    }

    const { data: userProfile, error } = await supabase
      .from("profiles")
      .select("user_id, reset_answer")
      .eq("email", email.trim())
      .single();

    if (!userProfile) {
      toast({ title: "Email not found", variant: "destructive" });
      return;
    }

    if ((userProfile.reset_answer || "").trim() !== resetAnswer.trim()) {
      const whatsappNumber = "254717517371";
      const prefilledMessage = encodeURIComponent(
        `Hello, I attempted to reset my password for ${email.trim()} but answered the security question incorrectly. Please assist me.`
      );
      const whatsappLink = `https://wa.me/${whatsappNumber}?text=${prefilledMessage}`;

      toast({
        title: "Incorrect answer",
        description: (
          <span className="text-white">
            The answer you provided is incorrect. Please{" "}
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-yellow-200"
            >
              contact us on WhatsApp
            </a>{" "}
            for assistance.
          </span>
        ),
        variant: "destructive", // keeps the red background
      });

      return;
    }

    setStep("newPassword");
  };

  // Step 3: Update password via Supabase Edge Function
  const handleResetPassword = async () => {
    if (!newPassword.trim()) {
      toast({ title: "Password required", variant: "destructive" });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: "Weak password",
        description: "Password must be at least 8 characters.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        "https://ypgkpecnfziptpmwsdud.supabase.co/functions/v1/reset-password",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.trim(),
            resetAnswer: resetAnswer.trim(),
            newPassword: newPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to reset password");
      }

      toast({
        title: "Password updated",
        description: "You can now log in with your new password.",
      });

      navigate("/login");
    } catch (err: any) {
      toast({
        title: "Reset failed",
        description: err.message || "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-blue-500 px-4">
      <div className="bg-white p-8 rounded-2xl w-full max-w-md shadow-lg">
        {step === "request" && (
          <>
            <h1 className="text-2xl mb-4 text-center font-semibold">
              Reset Password
            </h1>
            <Label>Email</Label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="mb-4"
            />
            <Button onClick={handleRequestReset} className="w-full">
              Next
            </Button>


            <div
              className="flex items-center gap-1 text-blue-600 hover:underline cursor-pointer mt-2"
              onClick={() => navigate("/login")}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Login</span>
            </div>

          </>
        )}

        {step === "answer" && (
          <>
            <h1 className="text-2xl mb-4 text-center font-semibold">
              Answer Security Question
            </h1>
            <Label>Security Question</Label>
            <Input value={resetQuestion} disabled className="mb-2" />
            <Input
              value={resetAnswer}
              onChange={(e) => setResetAnswer(e.target.value)}
              placeholder="Enter your answer"
              className="mb-4"
            />
            <div
              className="flex items-center gap-1 text-blue-600 hover:underline cursor-pointer"
              onClick={handleCheckAnswer}
            >
              <ArrowRight className="w-4 h-4" />
              <span>Next</span>
            </div>


            <div
              className="flex items-center gap-1 text-blue-600 hover:underline cursor-pointer mt-2"
              onClick={() => navigate("/login")}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Login</span>
            </div>

          </>
        )}

        {step === "newPassword" && (
          <>
            <h1 className="text-2xl mb-4 text-center font-semibold">
              Set New Password
            </h1>
            <Label>New Password</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              className="mb-4"
            />
            <Button
              onClick={handleResetPassword}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? "Resetting..." : "Reset Password"}
            </Button>

            <div
              className="flex items-center gap-1 text-blue-600 hover:underline cursor-pointer mt-2"
              onClick={() => navigate("/login")}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Login</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
