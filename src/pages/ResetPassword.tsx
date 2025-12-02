import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Get the access token from URL
  const accessToken = searchParams.get("access_token");

  const handleResetPassword = async () => {
    if (!newPassword) {
      toast({
        title: "Password required",
        description: "Please enter your new password.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: "Weak password",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }

    if (!accessToken) {
      toast({
        title: "Invalid link",
        description: "No reset token found. Please request a new password reset.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser(
        { password: newPassword },
        { token: accessToken }
      );

      if (error) throw error;

      toast({
        title: "Password updated",
        description: "You can now login with your new password.",
      });

      navigate("/login");
    } catch (err: any) {
      console.error("Reset password error:", err);
      toast({
        title: "Reset failed",
        description: err.message || "Something went wrong. Try requesting a new reset link.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Optional: handle pressing Enter in input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleResetPassword();
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-blue-500">
      <div className="bg-white p-8 rounded-2xl w-full max-w-md shadow-lg">
        <h1 className="text-2xl mb-4 text-center">Reset Password</h1>

        <Label>New Password</Label>
        <Input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Enter new password"
          className="mb-4"
          onKeyDown={handleKeyDown}
        />

        <Button
          onClick={handleResetPassword}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? "Resetting..." : "Reset Password"}
        </Button>
      </div>
    </div>
  );
}
