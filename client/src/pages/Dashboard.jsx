import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../api/axios.js";
import { Navbar } from "../components/Navbar.jsx";
import { AddMeasurementModal } from "../components/AddMeasurementModal.jsx";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Plus, Trash2, Pencil, Activity, Scale, Ruler, Download, TrendingDown, TrendingUp, Target } from "lucide-react";

export function Dashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [graphTimeRange, setGraphTimeRange] = useState("all");

  // Personal Goal Weight State (Persisted per user in localStorage)
  const [goalWeight, setGoalWeight] = useState(() => {
    return localStorage.getItem(`bmi_goal_${user?._id}`) || "";
  });
  const [goalWeightUnit, setGoalWeightUnit] = useState(() => {
    return localStorage.getItem(`bmi_goal_unit_${user?._id}`) || "kg";
  });
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [tempGoal, setTempGoal] = useState("");

  const handleSaveGoal = (e) => { 
    e.preventDefault();
    if (!tempGoal) return;
    setGoalWeight(tempGoal);
    localStorage.setItem(`bmi_goal_${user?._id}`, tempGoal);
    localStorage.setItem(`bmi_goal_unit_${user?._id}`, goalWeightUnit);
    setIsGoalModalOpen(false);
  };

  const ITEMS_PER_PAGE = 10;

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

  // Helper to format height nicely (e.g., 5' 9" (69 in) or 175 cm)
  const formatHeight = (m) => {
    if (!m) return "--";
    const val = m.rawHeight ?? m.height;
    const unit = m.heightUnit || (m.unit === "imperial" ? "in" : "cm");
    if (unit === "in" && val) {
      const ft = Math.floor(val / 12);
      const inch = Number((val % 12).toFixed(1));
      return `${ft}' ${inch}" (${val} in)`;
    }
    return `${val} ${unit}`;
  };

  // Calculate Ideal Weight Range for User's Height (WHO 18.5 - 24.9 BMI)
  const getIdealWeightRange = () => {
    const rawH = latest?.height || user?.height;
    if (!rawH) return "--";
    const heightInMeters = rawH > 3 ? rawH / 100 : rawH;
    const minKg = (18.5 * heightInMeters * heightInMeters).toFixed(1);
    const maxKg = (24.9 * heightInMeters * heightInMeters).toFixed(1);

    if (latest?.weightUnit === "lbs") {
      const minLbs = (minKg / 0.45359237).toFixed(0);
      const maxLbs = (maxKg / 0.45359237).toFixed(0);
      return `${minLbs} - ${maxLbs} lbs`;
    }
    return `${minKg} - ${maxKg} kg`;
  };

  // Helper to calculate progress toward Personal Goal Weight
  const getGoalProgress = () => {
    if (!goalWeight || !latest) return null;
    const currVal = Number(latest.rawWeight ?? latest.weight);
    const targetVal = Number(goalWeight);
    const unit = goalWeightUnit || latest.weightUnit || "kg";
    const diff = Number((currVal - targetVal).toFixed(1));

    if (diff === 0) {
      return { status: "Goal Achieved! 🎉", text: "You hit your target weight!", color: "text-emerald-400" };
    } else if (diff > 0) {
      return { status: "Weight Loss Goal", text: `${diff} ${unit} to lose`, color: "text-indigo-400" };
    } else {
      return { status: "Weight Gain Goal", text: `${Math.abs(diff)} ${unit} to gain`, color: "text-amber-400" };
    }
  };

  // Pagination slice (auto-clamped to totalPages)
  const totalPages = Math.ceil(measurements.length / ITEMS_PER_PAGE) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const paginatedMeasurements = measurements.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  // 3. Format Data for Graph (Oldest -> Newest)
  const hasMultipleSameDay = measurements.some((m, idx) => {
    if (idx === 0) return false;
    const d1 = new Date(m.createdAt).toDateString();
    const d2 = new Date(measurements[idx - 1].createdAt).toDateString();
    return d1 === d2;
  });

  const chartData = [...measurements].reverse().map((m, idx) => {
    const dateObj = new Date(m.createdAt);
    const dateStr = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const timeStr = dateObj.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" });

    // Guaranteed 100% unique key per point even if 2 entries are created in the exact same second
    const uniqueKey = hasMultipleSameDay ? `${dateStr}, ${timeStr} (#${idx + 1})` : dateStr;

    return {
      date: uniqueKey,
      displayDate: `${dateStr}, ${timeStr}`,
      bmi: m.bmi,
      weightDisplay: `${m.rawWeight ?? m.weight} ${m.weightUnit || (m.unit === "imperial" ? "lbs" : "kg")}`,
      category: m.category
    };
  });

  // Filter graph data according to selected time range filter tab
  const filteredChartData = chartData.filter((item, idx, arr) => {
    if (graphTimeRange === "7d") return idx >= arr.length - 7;
    if (graphTimeRange === "30d") return idx >= arr.length - 30;
    if (graphTimeRange === "90d") return idx >= arr.length - 90;
    return true;
  });

  // Helper to calculate weight change delta (+ / - kg/lbs) compared to preceding entry
  const getWeightDelta = (current) => {
    const idx = measurements.findIndex((item) => item._id === current._id);
    if (idx === -1 || idx === measurements.length - 1) return null;
    const prev = measurements[idx + 1];

    const currVal = Number(current.rawWeight ?? current.weight);
    const prevVal = Number(prev.rawWeight ?? prev.weight);
    const diff = Number((currVal - prevVal).toFixed(1));
    const unit = current.weightUnit || (current.unit === "imperial" ? "lbs" : "kg");

    if (diff > 0) {
      return { text: `+${diff} ${unit}`, isIncrease: true, isZero: false };
    } else if (diff < 0) {
      return { text: `${diff} ${unit}`, isIncrease: false, isZero: false };
    }
    return { text: `0.0 ${unit}`, isIncrease: false, isZero: true };
  };

  // Helper to export history logs as CSV file
  const handleExportCSV = () => {
    if (!measurements.length) return;
    const headers = ["Date", "Weight", "Weight Unit", "Height", "Height Unit", "BMI", "Category"];
    const rows = measurements.map((m) => [
      new Date(m.createdAt).toLocaleString("en-US"),
      m.rawWeight ?? m.weight,
      m.weightUnit || (m.unit === "imperial" ? "lbs" : "kg"),
      m.rawHeight ?? m.height,
      m.heightUnit || (m.unit === "imperial" ? "in" : "cm"),
      m.bmi,
      m.category
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `bmi_measurements_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Category Badge Colors with Status Dot
  const getBadgeColor = (category) => {
    switch (category) {
      case "Underweight":
        return "bg-sky-500/10 text-sky-300 border-sky-500/30";
      case "Normal weight":
      case "Normal Weight":
        return "bg-emerald-500/10 text-emerald-300 border-emerald-500/30";
      case "Overweight":
        return "bg-amber-500/10 text-amber-300 border-amber-500/30";
      case "Obese":
        return "bg-rose-500/10 text-rose-300 border-rose-500/30";
      default:
        return "bg-slate-800 text-slate-300 border-slate-700";
    }
  };

  // Custom Chart Tooltip
  const CustomChartTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-slate-700/80 p-3 rounded-2xl shadow-xl text-xs space-y-1 z-50">
          <p className="font-bold text-slate-300">{data.date}</p>
          <p className="text-indigo-400 font-extrabold text-sm">BMI: {data.bmi}</p>
          <p className="text-slate-200">Weight: {data.weightDisplay}</p>
          <span className={`px-2.5 py-0.5 text-[10px] font-semibold rounded-full border inline-block ${getBadgeColor(data.category)}`}>
            {data.category}
          </span>
        </div>
      );
    }
    return null;
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
            onClick={() => { setEditingEntry(null); setIsModalOpen(true); }}
            className="flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold px-5 py-3 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-600/25 active:scale-[0.98]"
          >
            <Plus className="w-5 h-5" />
            <span>Log Measurement</span>
          </button>
        </div>

        {/* Top Summary Metric Cards (4 Grid) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
              {latest ? `${latest.rawWeight ?? latest.weight} ${latest.weightUnit || (latest.unit === "imperial" ? "lbs" : "kg")}` : "--"}
            </span>
          </div>

          {/* Personal Goal Weight Card */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 shadow-xl shadow-black/20 hover:border-slate-700/80 transition-all duration-300 group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Personal Goal Weight</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    setTempGoal(goalWeight);
                    setIsGoalModalOpen(true);
                  }}
                  className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"
                  title="Edit Target Goal Weight"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 group-hover:scale-110 transition-transform">
                  <Target className="w-5 h-5" />
                </div>
              </div>
            </div>
            {goalWeight ? (
              <>
                <span className="text-4xl font-extrabold text-amber-300 tracking-tight">
                  {goalWeight} {goalWeightUnit}
                </span>
                {getGoalProgress() && (
                  <span className={`text-[11px] font-semibold mt-1 block ${getGoalProgress().color}`}>
                    {getGoalProgress().text}
                  </span>
                )}
              </>
            ) : (
              <button
                onClick={() => {
                  setTempGoal("");
                  setIsGoalModalOpen(true);
                }}
                className="mt-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 underline underline-offset-4"
              >
                + Set Goal Weight
              </button>
            )}
          </div>

          {/* WHO Target Weight Range Card */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 shadow-xl shadow-black/20 hover:border-slate-700/80 transition-all duration-300 group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">WHO Healthy Range</span>
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform">
                <Ruler className="w-5 h-5" />
              </div>
            </div>
            <span className="text-2xl font-bold text-emerald-400 tracking-tight block mt-1">
              {getIdealWeightRange()}
            </span>
            <span className="text-[10px] text-slate-400 mt-1 block">WHO 18.5 - 24.9 BMI range</span>
          </div>
        </div>

        {/* Progress Graph */}
        {chartData.length > 0 && (
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 md:p-8 shadow-xl shadow-black/20 mb-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
              <div>
                <h3 className="text-xl font-bold text-white tracking-tight">BMI Progress Trend</h3>
                <p className="text-slate-400 text-xs mt-1">Visualizing your Body Mass Index over time</p>
              </div>

              {/* Time Range Filter Tabs */}
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 self-stretch sm:self-auto justify-center">
                {[
                  { label: "7 Days", value: "7d" },
                  { label: "30 Days", value: "30d" },
                  { label: "90 Days", value: "90d" },
                  { label: "All Time", value: "all" },
                ].map((tab) => (
                  <button
                    key={tab.value}
                    onClick={() => setGraphTimeRange(tab.value)}
                    className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all ${graphTimeRange === tab.value
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                        : "text-slate-400 hover:text-slate-200"
                      }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={filteredChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="date" stroke="#64748b" tickLine={false} tick={{ fontSize: 12 }} />
                  <YAxis domain={["dataMin - 1", "dataMax + 1"]} stroke="#64748b" tickLine={false} tick={{ fontSize: 12 }} />
                  <Tooltip content={<CustomChartTooltip />} />
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

        {/* Official WHO BMI Category Scale Reference Card */}
        <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl p-6 rounded-3xl shadow-xl mb-8">
          <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-3">WHO BMI Category Reference Scale</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-center">
              <span className="block text-xs font-bold text-sky-300">Underweight</span>
              <span className="text-[11px] text-slate-400">&lt; 18.5</span>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
              <span className="block text-xs font-bold text-emerald-300">Normal Weight</span>
              <span className="text-[11px] text-slate-400">18.5 - 24.9</span>
            </div>
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
              <span className="block text-xs font-bold text-amber-300">Overweight</span>
              <span className="text-[11px] text-slate-400">25.0 - 29.9</span>
            </div>
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center">
              <span className="block text-xs font-bold text-rose-300">Obese</span>
              <span className="text-[11px] text-slate-400">&ge; 30.0</span>
            </div>
          </div>
        </div>

        {/* History Table */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 md:p-8 shadow-xl shadow-black/20">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">Measurement Logs</h3>
              <p className="text-slate-400 text-xs mt-1">History of all recorded height & weight entries</p>
            </div>
            {measurements.length > 0 && (
              <button
                onClick={handleExportCSV}
                className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-4 py-2.5 rounded-xl border border-slate-700/60 transition-all text-xs font-medium"
              >
                <Download className="w-4 h-4 text-indigo-400" />
                <span>Export CSV</span>
              </button>
            )}
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
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider font-semibold">
                      <th className="py-3.5 px-4">Date</th>
                      <th className="py-3.5 px-4">Weight</th>
                      <th className="py-3.5 px-4">Change</th>
                      <th className="py-3.5 px-4">Height</th>
                      <th className="py-3.5 px-4">BMI</th>
                      <th className="py-3.5 px-4">Category</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-200 text-sm">
                    {paginatedMeasurements.map((m) => {
                      const delta = getWeightDelta(m);
                      return (
                        <tr key={m._id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-4 px-4 text-slate-300 font-medium">
                            {new Date(m.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                          </td>
                          <td className="py-4 px-4 font-semibold text-white">
                            {m.rawWeight ?? m.weight} {m.weightUnit || (m.unit === "imperial" ? "lbs" : "kg")}
                          </td>
                          <td className="py-4 px-4 font-medium text-xs">
                            {delta ? (
                              <span className={`inline-flex items-center gap-1 ${delta.isIncrease ? "text-amber-400" : delta.isZero ? "text-slate-500" : "text-emerald-400"
                                }`}>
                                {delta.isIncrease ? <TrendingUp className="w-3.5 h-3.5" /> : delta.isZero ? null : <TrendingDown className="w-3.5 h-3.5" />}
                                {delta.text}
                              </span>
                            ) : (
                              <span className="text-slate-500">--</span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-slate-300 font-medium">
                            {formatHeight(m)}
                          </td>
                          <td className="py-4 px-4 font-bold text-indigo-300">{m.bmi}</td>
                          <td className="py-4 px-4">
                            <span className={`px-3 py-1 text-xs font-semibold rounded-full border inline-flex items-center gap-1.5 ${getBadgeColor(m.category)}`}>
                              {m.category}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setEditingEntry(m);
                                  setIsModalOpen(true);
                                }}
                                className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 border border-transparent hover:border-indigo-500/30 rounded-xl transition-all duration-200"
                                title="Edit entry"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeletingId(m._id)}
                                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 rounded-xl transition-all duration-200"
                                title="Delete entry"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Table Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-800/80">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={safePage === 1}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium disabled:opacity-40 disabled:pointer-events-none transition-colors"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-slate-400 font-medium">
                    Page {safePage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    disabled={safePage === totalPages}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium disabled:opacity-40 disabled:pointer-events-none transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <AddMeasurementModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingEntry(null); }}
        editingEntry={editingEntry}
        latestMeasurement={latest}
        initialHeight={editingEntry ? (editingEntry.rawHeight ?? editingEntry.height) : user?.height}
        initialWeight={editingEntry ? (editingEntry.rawWeight ?? editingEntry.weight) : user?.weight}
      />

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-3xl shadow-2xl shadow-black/80 max-w-sm w-full text-center text-slate-100">
            <h4 className="text-xl font-bold text-white mb-2">Delete Log Entry?</h4>
            <p className="text-slate-400 text-xs mb-6">
              Are you sure you want to delete this measurement log? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setDeletingId(null)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium border border-slate-700/60 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteMutation.mutate(deletingId);
                  setDeletingId(null);
                }}
                disabled={deleteMutation.isPending}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-rose-600/25 active:scale-[0.98] transition-all duration-200"
              >
                {deleteMutation.isPending ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Personal Goal Weight Modal */}
      {isGoalModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/80 p-6 md:p-8 rounded-3xl shadow-2xl shadow-black/80 max-w-sm w-full text-slate-100">
            <h4 className="text-xl font-bold text-white mb-1">Set Goal Weight</h4>
            <p className="text-slate-400 text-xs mb-5">Define your personal target weight goal</p>

            <form onSubmit={handleSaveGoal} className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Goal Weight ({goalWeightUnit})
                  </label>
                  <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setGoalWeightUnit("kg")}
                      className={`px-3 py-1 text-[10px] font-bold uppercase rounded-lg transition-all ${goalWeightUnit === "kg" ? "bg-amber-500 text-slate-950 shadow" : "text-slate-400 hover:text-slate-200"
                        }`}
                    >
                      kg
                    </button>
                    <button
                      type="button"
                      onClick={() => setGoalWeightUnit("lbs")}
                      className={`px-3 py-1 text-[10px] font-bold uppercase rounded-lg transition-all ${goalWeightUnit === "lbs" ? "bg-amber-500 text-slate-950 shadow" : "text-slate-400 hover:text-slate-200"
                        }`}
                    >
                      lbs
                    </button>
                  </div>
                </div>
                <input
                  type="number"
                  step="any"
                  min="1"
                  value={tempGoal}
                  onChange={(e) => setTempGoal(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all duration-200 text-sm"
                  placeholder={goalWeightUnit === "lbs" ? "145" : "65"}
                  required
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsGoalModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium border border-slate-700/60 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-amber-500/25 active:scale-[0.98] transition-all"
                >
                  Save Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

