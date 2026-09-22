import { useAuth } from "../context/AuthContext.jsx";
import { useNavigate, Link } from "react-router-dom";
import { Activity, LogOut, User } from "lucide-react";

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 shadow-lg shadow-black/20">
      <div className="container mx-auto px-6 py-3.5 max-w-7xl">
        <div className="flex items-center justify-between">
          {/* Logo & Brand */}
          <Link 
            to="/" 
            className="flex items-center space-x-3 group text-xl font-bold text-white tracking-tight"
          >
            <div className="bg-gradient-to-tr from-indigo-500 to-violet-500 p-2 rounded-xl shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform duration-200">
              <Activity className="text-white w-5 h-5" />
            </div>
            <span className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              BMI Tracker
            </span>
          </Link>

          {/* User Controls & Navigation */}
          <div className="flex items-center space-x-4">
            <Link
              to="/dashboard"
              className="flex items-center space-x-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-800/40 hover:bg-slate-800 px-3.5 py-2 rounded-xl border border-slate-700/50 transition-all duration-200"
            >
              <Activity className="w-4 h-4 text-indigo-400" />
              <span>Dashboard</span>
            </Link>

            {/* User Profile Pill */}
            <div className="hidden sm:flex items-center space-x-2.5 bg-slate-800/60 border border-slate-700/60 px-3.5 py-2 rounded-xl text-slate-200 text-sm font-medium">
              <div className="w-6 h-6 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300">
                <User className="w-3.5 h-3.5" />
              </div>
              <span className="text-slate-200 max-w-[140px] truncate">
                {user?.name || user?.email}
              </span>
            </div>

            {/* Logout Action Button */}
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 text-sm font-medium text-slate-400 hover:text-rose-400 bg-slate-800/30 hover:bg-rose-500/10 border border-slate-700/40 hover:border-rose-500/30 px-3.5 py-2 rounded-xl transition-all duration-200"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}