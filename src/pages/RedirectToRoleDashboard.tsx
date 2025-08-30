import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export function RedirectToRoleDashboard() {
  const navigate = useNavigate();

  useEffect(() => {
    const role = localStorage.getItem("userRole") || "student";
    navigate(`/dashboard/${role}`);
  }, [navigate]);

  return <p className="text-center mt-10">Redirecting to your dashboard...</p>;
}
