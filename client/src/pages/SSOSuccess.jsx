import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../api/axios.js";

export function SSOSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [statusText, setStatusText] = useState("Completing social sign-in...");
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleSSO = async () => {
      const token = searchParams.get("token");

      if (!token) {
        setError("No authentication token provided.");
        setTimeout(() => navigate("/login?error=sso_failed"), 2000);
        return;
      }

      try {
        localStorage.setItem("accessToken", token);
        const res = await api.get("/user/me");
        if (res.data && res.data.user) {
          login(res.data.user, token);
          setStatusText("Success! Redirecting to your dashboard...");
          setTimeout(() => navigate("/dashboard"), 500);
        } else {
          throw new Error("Failed to fetch user profile");
        }
      } catch (err) {
        console.error("SSO completion error:", err);
        setError("Failed to verify social login. Please try again.");
        setTimeout(() => navigate("/login?error=sso_failed"), 2500);
      }
    };

    handleSSO();
  }, [searchParams, login, navigate]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4 relative overflow-hidden">
      <div className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl" />

      <div className="w-full max-w-md p-8 rounded-3xl bg-slate-900/70 backdrop-blur-xl border border-slate-800 text-center relative z-10 shadow-2xl">
        {error ? (
          <div className="space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center text-xl font-bold">
              ✕
            </div>
            <h3 className="text-xl font-bold text-white">Authentication Failed</h3>
            <p className="text-slate-400 text-sm">{error}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
            <h3 className="text-xl font-bold text-white">Authenticating...</h3>
            <p className="text-slate-400 text-sm">{statusText}</p>
          </div>
        )}
      </div>
    </div>
  );
}
