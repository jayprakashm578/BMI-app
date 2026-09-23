import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../api/axios.js";
import { Navbar } from "../components/Navbar.jsx";
import { AddMeasurementModal } from "../components/AddMeasurementModal.jsx";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Plus, Trash2, Activity, Scale, Ruler } from "lucide-react";

export function Dashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 1. Fetch Measurements
  const { data: measurements = [], isLoading } = useQuery({
    queryKey: ["measurements"],
    queryFn: async () => {
      const res = await api.get("/measurement");
      return res.data.data;
    },
  });

  // 2. Delete Measurement Mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/measurement/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["measurements"] }),
  });

  const latest = measurements[0];

  // 3. Format Data for Graph (Oldest -> Newest)
  const chartData = [...measurements].reverse().map((m) => ({
    date: new Date(m.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    bmi: m.bmi,
    weight: m.weight,
  }));

  // Category Badge Colors with Status Dot
  const getBadgeColor = (category) => {
    switch (category) {
      case "Underweight":
        return "bg-sky-500/10 text-sky-300 border-sky-500/30";
      case "Normal weight":
        return "bg-emerald-500/10 text-emerald-300 border-emerald-500/30";
      case "Overweight":
        return "bg-amber-500/10 text-amber-300 border-amber-500/30";
      case "Obese":
        return "bg-rose-500/10 text-rose-300 border-rose-500/30";
      default:
        return "bg-slate-800 text-slate-300 border-slate-700";
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative overflow-x-hidden selection:bg-indigo-500 selection:text-white">
      {/* Background Ambient Lights */}
      <div className="pointer-events-none absolute top-0 left-1/4 w-[36rem] h-[36rem] bg-indigo-600/10 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 right-10 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />

      <Navbar />

      <main className="flex-1 container mx-auto px-4 md:px-8 py-8 max-w-7xl relative z-10">
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl p-6 rounded-3xl shadow-xl">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Welcome back, <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">{user?.name || "Friend"}</span>!
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Monitor your body mass index, weight trends, and wellness journey.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold px-5 py-3 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-600/25 active:scale-[0.98]"
          >
            <Plus className="w-5 h-5" />
            <span>Log Measurement</span>
          </button>
        </div>

        {/* Top Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 shadow-xl shadow-black/20 hover:border-slate-700/80 transition-all duration-300 group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Current BMI</span>
              <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 group-hover:scale-110 transition-transform">
                <Activity className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-baseline space-x-3">
              <span className="text-4xl font-extrabold text-white tracking-tight">{latest?.bmi ?? "--"}</span>
              {latest?.category && (
                <span className={`px-3 py-1 text-xs font-semibold rounded-full border inline-flex items-center gap-1.5 ${getBadgeColor(latest.category)}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                  {latest.category}
                </span>
              )}
            </div>
          </div>

          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 shadow-xl shadow-black/20 hover:border-slate-700/80 transition-all duration-300 group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Latest Weight</span>
              <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 group-hover:scale-110 transition-transform">
                <Scale className="w-5 h-5" />
              </div>
            </div>
            <span className="text-4xl font-extrabold text-white tracking-tight">
              {latest?.weight ? `${latest.weight} ${latest.unit === "imperial" ? "lbs" : "kg"}` : "--"}
            </span>
          </div>

          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 shadow-xl shadow-black/20 hover:border-slate-700/80 transition-all duration-300 group sm:col-span-2 md:col-span-1">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Entries</span>
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform">
                <Ruler className="w-5 h-5" />
              </div>
            </div>
            <span className="text-4xl font-extrabold text-white tracking-tight">{measurements.length}</span>
          </div>
        </div>

        {/* Progress Graph */}
        {chartData.length > 0 && (
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 md:p-8 shadow-xl shadow-black/20 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-white tracking-tight">BMI Progress Trend</h3>
                <p className="text-slate-400 text-xs mt-1">Visualizing your Body Mass Index over time</p>
              </div>
            </div>
            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="date" stroke="#64748b" tickLine={false} tick={{ fontSize: 12 }} />
                  <YAxis domain={["dataMin - 1", "dataMax + 1"]} stroke="#64748b" tickLine={false} tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", color: "#f8fafc", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.5)" }} 
                    itemStyle={{ color: "#818cf8" }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="bmi" 
                    stroke="#818cf8" 
                    strokeWidth={3} 
                    dot={{ r: 4, fill: "#818cf8", stroke: "#1e1b4b", strokeWidth: 2 }} 
                    activeDot={{ r: 7, fill: "#c084fc", stroke: "#fff", strokeWidth: 2 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* History Table */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 md:p-8 shadow-xl shadow-black/20">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-white tracking-tight">Measurement Logs</h3>
            <p className="text-slate-400 text-xs mt-1">History of all recorded height & weight entries</p>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-slate-400">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Loading history...
            </div>
          ) : measurements.length === 0 ? (
            <div className="py-12 text-center text-slate-400 bg-slate-950/40 rounded-2xl border border-slate-800/60 p-8">
              <Activity className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-300 font-medium">No measurements logged yet</p>
              <p className="text-slate-500 text-xs mt-1">Click "Log Measurement" above to record your first entry!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider font-semibold">
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Weight</th>
                    <th className="py-3.5 px-4">Height</th>
                    <th className="py-3.5 px-4">BMI</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200 text-sm">
                  {measurements.map((m) => (
                    <tr key={m._id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-4 px-4 text-slate-300 font-medium">
                        {new Date(m.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                      </td>
                      <td className="py-4 px-4 font-semibold text-white">
                        {m.weight} {m.unit === "imperial" ? "lbs" : "kg"}
                      </td>
                      <td className="py-4 px-4 text-slate-300">
                        {m.height} {m.unit === "imperial" ? "in" : "cm"}
                      </td>
                      <td className="py-4 px-4 font-bold text-indigo-300">{m.bmi}</td>
                      <td className="py-4 px-4">
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full border inline-flex items-center gap-1.5 ${getBadgeColor(m.category)}`}>
                          {m.category}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button
                          onClick={() => deleteMutation.mutate(m._id)}
                          disabled={deleteMutation.isPending}
                          className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 rounded-xl transition-all duration-200"
                          title="Delete entry"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      <AddMeasurementModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialHeight={user?.height}
        initialWeight={user?.weight}
      />
    </div>
  );
}

