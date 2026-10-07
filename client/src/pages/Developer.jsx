import { useState, useEffect } from "react";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";

export function Developer() {
  const { user } = useAuth();

  // State
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Billing Cycle State: "1_month", "3_months", "6_months", "1_year"
  const [billingCycle, setBillingCycle] = useState("1_month");
  const [submittingPlan, setSubmittingPlan] = useState(false);

  // Key Creation Modal & State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUpgradePromptOpen, setIsUpgradePromptOpen] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [creatingKey, setCreatingKey] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState(null);
  const [copied, setCopied] = useState(false);

  // Live API Tester Sandbox State
  const [selectedEndpoint, setSelectedEndpoint] = useState("/calculate-bmi");
  const [sandboxApiKey, setSandboxApiKey] = useState("");
  const [sandboxHeight, setSandboxHeight] = useState("175");
  const [sandboxWeight, setSandboxWeight] = useState("70");
  const [sandboxHeightUnit, setSandboxHeightUnit] = useState("cm"); // "cm", "m", "ft_in", "in"
  const [sandboxWeightUnit, setSandboxWeightUnit] = useState("kg"); // "kg", "lbs"
  const [sandboxFeet, setSandboxFeet] = useState("5");
  const [sandboxInches, setSandboxInches] = useState("9");
  const [sandboxGender, setSandboxGender] = useState("male");
  const [sandboxResponse, setSandboxResponse] = useState(null);
  const [testingApi, setTestingApi] = useState(false);

  // Active Code Snippet & Documentation Endpoint Tabs
  const [codeLang, setCodeLang] = useState("js");
  const [docEndpoint, setDocEndpoint] = useState("/calculate-bmi");
  const [copiedKeyId, setCopiedKeyId] = useState(null);
  const [fullSecretKeys, setFullSecretKeys] = useState({});
  const [isSandboxKeyFocused, setIsSandboxKeyFocused] = useState(false);

  const STORAGE_KEY = "bmi_dev_api_key_secrets";

  useEffect(() => {
    fetchOverview();
  }, []);

  const saveFullSecret = (keyId, rawSecret) => {
    if (!keyId || !rawSecret) return;
    const strId = String(keyId);
    setFullSecretKeys((prev) => {
      const updated = { ...prev, [strId]: rawSecret };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to store secret key:", e);
      }
      return updated;
    });
  };

  const removeFullSecret = (keyId) => {
    if (!keyId) return;
    const strId = String(keyId);
    setFullSecretKeys((prev) => {
      const updated = { ...prev };
      delete updated[strId];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to remove secret key:", e);
      }
      return updated;
    });
  };

  const fetchOverview = async () => {
    try {
      setLoading(true);

      let secretsMap = {};
      try {
        const storedSecrets = localStorage.getItem(STORAGE_KEY);
        if (storedSecrets) {
          secretsMap = JSON.parse(storedSecrets);
          setFullSecretKeys(secretsMap);
        }
      } catch (e) {
        console.error("Error parsing stored secrets:", e);
      }

      const res = await api.get("/developer/overview");
      setOverview(res.data);

      if (res.data?.keys && res.data.keys.length > 0) {
        const activeKey = res.data.keys.find((k) => k.status === "active") || res.data.keys[0];
        const activeKeyId = String(activeKey?.id || activeKey?._id);
        const cachedFullSecret = secretsMap[activeKeyId];
        setSandboxApiKey(cachedFullSecret || activeKey.keyPrefix);
      }
    } catch (err) {
      console.error("Failed to load developer overview:", err);
      setError("Failed to load developer dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPrefix = (keyId, prefix) => {
    navigator.clipboard.writeText(prefix);
    setCopiedKeyId(keyId);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  const getDisplayPrefix = (keyStr) => {
    if (!keyStr) return "bmi_live_sk_sample_prefix...";
    if (keyStr.length > 20) {
      return keyStr.substring(0, 16) + "...";
    }
    return keyStr;
  };

  const renderDocCodeSnippet = (endpoint, lang, displayKey) => {
    let rawBase = (import.meta.env.VITE_API_BASE_URL || "https://bmi-app-backend-3ivo.onrender.com/api").replace(/\/+$/, "");
    if (!rawBase.endsWith("/api") && !rawBase.includes("/api/")) {
      rawBase = `${rawBase}/api`;
    }
    const baseUrl = `${rawBase}/v1`;
    if (endpoint === "/calculate-bmi") {
      if (lang === "curl") {
        return `curl -X POST "${baseUrl}/calculate-bmi" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${displayKey}" \\
  -d '{"height": 175, "weight": 70, "unitSystem": "metric"}'`;
      }
      if (lang === "js") {
        return `fetch("${baseUrl}/calculate-bmi", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": "${displayKey}"
  },
  body: JSON.stringify({ height: 175, weight: 70, unitSystem: "metric" })
}).then(res => res.json()).then(console.log);`;
      }
      if (lang === "python") {
        return `import requests

response = requests.post(
    "${baseUrl}/calculate-bmi",
    headers={"x-api-key": "${displayKey}"},
    json={"height": 175, "weight": 70, "unitSystem": "metric"}
)
print(response.json())`;
      }
      if (lang === "node") {
        return `const axios = require("axios");

axios.post("${baseUrl}/calculate-bmi", 
  { height: 175, weight: 70, unitSystem: "metric" },
  { headers: { "x-api-key": "${displayKey}" } }
).then(res => console.log(res.data));`;
      }
    }

    if (endpoint === "/ideal-weight") {
      if (lang === "curl") {
        return `curl -X POST "${baseUrl}/ideal-weight" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${displayKey}" \\
  -d '{"heightCm": 175, "gender": "male"}'`;
      }
      if (lang === "js") {
        return `fetch("${baseUrl}/ideal-weight", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": "${displayKey}"
  },
  body: JSON.stringify({ heightCm: 175, gender: "male" })
}).then(res => res.json()).then(console.log);`;
      }
      if (lang === "python") {
        return `import requests

response = requests.post(
    "${baseUrl}/ideal-weight",
    headers={"x-api-key": "${displayKey}"},
    json={"heightCm": 175, "gender": "male"}
)
print(response.json())`;
      }
      if (lang === "node") {
        return `const axios = require("axios");

axios.post("${baseUrl}/ideal-weight", 
  { heightCm: 175, gender: "male" },
  { headers: { "x-api-key": "${displayKey}" } }
).then(res => console.log(res.data));`;
      }
    }

    if (endpoint === "/analyze-progress") {
      if (lang === "curl") {
        return `curl -X POST "${baseUrl}/analyze-progress" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${displayKey}" \\
  -d '{"history": [{"date": "2026-01-01", "weight": 75}, {"date": "2026-02-01", "weight": 70}]}'`;
      }
      if (lang === "js") {
        return `fetch("${baseUrl}/analyze-progress", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": "${displayKey}"
  },
  body: JSON.stringify({
    history: [
      { date: "2026-01-01", weight: 75 },
      { date: "2026-02-01", weight: 70 }
    ]
  })
}).then(res => res.json()).then(console.log);`;
      }
      if (lang === "python") {
        return `import requests

response = requests.post(
    "${baseUrl}/analyze-progress",
    headers={"x-api-key": "${displayKey}"},
    json={
        "history": [
            {"date": "2026-01-01", "weight": 75},
            {"date": "2026-02-01", "weight": 70}
        ]
    }
)
print(response.json())`;
      }
      if (lang === "node") {
        return `const axios = require("axios");

axios.post("${baseUrl}/analyze-progress", 
  {
    history: [
      { date: "2026-01-01", weight: 75 },
      { date: "2026-02-01", weight: 70 }
    ]
  },
  { headers: { "x-api-key": "${displayKey}" } }
).then(res => console.log(res.data));`;
      }
    }
  };

  const handleCreateKey = async (e) => {
    e.preventDefault();
    if (!keyName.trim()) return;

    try {
      setCreatingKey(true);
      setError("");
      const res = await api.post("/developer/keys", { name: keyName });
      const rawSecret = res.data.apiKey;
      const keyId = res.data.keyRecord?.id;
      setNewlyCreatedKey(rawSecret);
      setSandboxApiKey(rawSecret);
      if (keyId) {
        saveFullSecret(keyId, rawSecret);
      }
      setKeyName("");
      setIsCreateModalOpen(false);
      setSuccessMsg("API key generated successfully!");
      fetchOverview();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create API key.");
    } finally {
      setCreatingKey(false);
    }
  };

  const handleRevokeKey = async (keyId) => {
    if (!window.confirm("Are you sure you want to revoke this API key? Applications using it will immediately lose access.")) {
      return;
    }
    try {
      await api.patch(`/developer/keys/${keyId}/revoke`);
      removeFullSecret(keyId);
      setSuccessMsg("API key revoked.");
      fetchOverview();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to revoke key.");
    }
  };

  const handleRotateKey = async (keyId) => {
    if (!window.confirm("Are you sure you want to rotate this API key secret? Any applications using the old secret key will immediately lose access.")) {
      return;
    }
    try {
      setError("");
      const res = await api.patch(`/developer/keys/${keyId}/rotate`);
      const rawSecret = res.data.apiKey;
      setNewlyCreatedKey(rawSecret);
      setSandboxApiKey(rawSecret);
      saveFullSecret(keyId, rawSecret);
      setSuccessMsg("API key secret rotated successfully! Save your new key secret now.");
      fetchOverview();
    } catch (err) {
      console.error("Rotate API key error:", err);
      setError(err.response?.data?.error || err.message || "Failed to rotate API key secret.");
    }
  };

  // Payment Modal State
  const [pendingPayment, setPendingPayment] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(false);

  const handleSubscribe = async (tier, paymentConfirmed = false) => {
    // If attempting to upgrade to paid plan without payment confirmation, open Payment Modal
    if ((tier === "pro" || tier === "enterprise") && !paymentConfirmed) {
      const pricing = getPlanPrice(tier);
      setPendingPayment({
        tier,
        billingCycle,
        price: pricing.price,
        period: pricing.period,
        note: pricing.note,
      });
      return;
    }

    try {
      if (paymentConfirmed) setProcessingPayment(true);
      else setSubmittingPlan(true);

      setError("");
      const res = await api.post("/developer/subscribe", {
        tier,
        billingCycle,
        paymentConfirmed,
      });

      setSuccessMsg(res.data.message);
      setPendingPayment(null);
      fetchOverview();
    } catch (err) {
      if (err.response?.status === 402) {
        const pricing = getPlanPrice(tier);
        setPendingPayment({
          tier,
          billingCycle,
          price: pricing.price,
          period: pricing.period,
          note: pricing.note,
        });
      } else {
        setError(err.response?.data?.error || "Subscription update failed.");
      }
    } finally {
      setSubmittingPlan(false);
      setProcessingPayment(false);
    }
  };

  const handleCopyKey = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSandboxHeightUnitChange = (newUnit) => {
    if (newUnit === sandboxHeightUnit) return;

    if (newUnit === "ft_in" && sandboxHeight) {
      const val = Number(sandboxHeight);
      if (!isNaN(val) && val > 0) {
        const totalInches = val / 2.54;
        const ft = Math.floor(totalInches / 12);
        const inchRaw = totalInches % 12;
        const inchRounded = Math.round(inchRaw);
        const finalInch = Math.abs(inchRaw - inchRounded) < 0.1 ? inchRounded : Number(inchRaw.toFixed(1));
        setSandboxFeet(String(ft));
        setSandboxInches(String(finalInch));
      }
    } else if (newUnit === "cm" && (sandboxFeet !== "" || sandboxInches !== "")) {
      const ft = Number(sandboxFeet || 0);
      const inch = Number(sandboxInches || 0);
      const totalInches = (ft * 12) + inch;
      if (totalInches > 0) {
        const rawCm = totalInches * 2.54;
        const roundedInt = Math.round(rawCm);
        const finalCm = Math.abs(rawCm - roundedInt) < 0.1 ? roundedInt : Number(rawCm.toFixed(1));
        setSandboxHeight(String(finalCm));
      }
    }
    setSandboxHeightUnit(newUnit);
  };

  const handleSandboxWeightUnitChange = (newUnit) => {
    if (newUnit === sandboxWeightUnit) return;

    if (sandboxWeight && !isNaN(Number(sandboxWeight))) {
      const val = Number(sandboxWeight);
      if (newUnit === "lbs" && sandboxWeightUnit === "kg") {
        const rawLbs = val / 0.45359237;
        const roundedInt = Math.round(rawLbs);
        const finalLbs = Math.abs(rawLbs - roundedInt) < 0.1 ? roundedInt : Number(rawLbs.toFixed(1));
        setSandboxWeight(String(finalLbs));
      } else if (newUnit === "kg" && sandboxWeightUnit === "lbs") {
        const rawKg = val * 0.45359237;
        const roundedInt = Math.round(rawKg);
        const finalKg = Math.abs(rawKg - roundedInt) < 0.1 ? roundedInt : Number(rawKg.toFixed(1));
        setSandboxWeight(String(finalKg));
      }
    }
    setSandboxWeightUnit(newUnit);
  };

  const handleRunSandbox = async () => {
    try {
      setTestingApi(true);
      setSandboxResponse(null);

      let base = (import.meta.env.VITE_API_BASE_URL || "https://bmi-app-backend-3ivo.onrender.com/api").replace(/\/+$/, "");
      if (!base.endsWith("/api") && !base.includes("/api/")) {
        base = `${base}/api`;
      }
      const fullUrl = `${base}/v1${selectedEndpoint}`;

      let bodyPayload = {};
      if (selectedEndpoint === "/calculate-bmi") {
        if (sandboxHeightUnit === "ft_in") {
          bodyPayload = {
            feet: Number(sandboxFeet),
            inches: Number(sandboxInches),
            heightUnit: "ft",
            weight: Number(sandboxWeight),
            weightUnit: sandboxWeightUnit,
          };
        } else {
          bodyPayload = {
            height: Number(sandboxHeight),
            heightUnit: sandboxHeightUnit,
            weight: Number(sandboxWeight),
            weightUnit: sandboxWeightUnit,
          };
        }
      } else if (selectedEndpoint === "/ideal-weight") {
        let hCm = Number(sandboxHeight);
        if (sandboxHeightUnit === "ft_in") {
          hCm = ((Number(sandboxFeet) * 12) + Number(sandboxInches)) * 2.54;
        }
        bodyPayload = {
          heightCm: Number(hCm.toFixed(2)),
          gender: sandboxGender,
        };
      } else if (selectedEndpoint === "/analyze-progress") {
        let wKg = Number(sandboxWeight);
        if (sandboxWeightUnit === "lbs") {
          wKg = Number((sandboxWeight * 0.45359237).toFixed(2));
        }
        bodyPayload = {
          history: [
            { date: "2026-01-01", weight: Number((wKg + 2).toFixed(1)) },
            { date: "2026-02-01", weight: Number(wKg.toFixed(1)) },
          ],
        };
      }

      const response = await fetch(fullUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": sandboxApiKey || "bmi_live_sk_sample_demo_key",
        },
        body: JSON.stringify(bodyPayload),
      });

      const contentType = response.headers.get("content-type");
      let data;
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = { error: text || `HTTP ${response.status} ${response.statusText}` };
      }

      setSandboxResponse({
        status: response.status,
        statusText: response.statusText,
        data,
      });

      // Refresh overview stats to reflect newly updated usage counts in real time
      if (response.status === 200) {
        fetchOverview();
      }
    } catch (err) {
      setSandboxResponse({
        status: 500,
        error: err.message || "Request failed",
      });
    } finally {
      setTestingApi(false);
    }
  };

  // Price calculations based on duration
  const getPlanPrice = (tier) => {
    if (tier === "free") return { price: "$0", note: "Forever free" };

    if (tier === "pro") {
      switch (billingCycle) {
        case "3_months":
          return { price: "$78", period: "/ 3 months", note: "$26/mo (10% off)" };
        case "6_months":
          return { price: "$139", period: "/ 6 months", note: "$23.16/mo (20% off)" };
        case "1_year":
          return { price: "$243", period: "/ 1 year", note: "$20.25/mo (30% off)" };
        case "1_month":
        default:
          return { price: "$29", period: "/ month", note: "Standard monthly" };
      }
    }

    if (tier === "enterprise") {
      switch (billingCycle) {
        case "3_months":
          return { price: "$267", period: "/ 3 months", note: "$89/mo (10% off)" };
        case "6_months":
          return { price: "$475", period: "/ 6 months", note: "$79.16/mo (20% off)" };
        case "1_year":
          return { price: "$831", period: "/ 1 year", note: "$69.25/mo (30% off)" };
        case "1_month":
        default:
          return { price: "$99", period: "/ month", note: "Standard monthly" };
      }
    }
  };

  const currentTier = overview?.subscription?.tier || "free";
  const daysRemaining = overview?.subscription?.daysRemaining;
  const expiryDate = overview?.subscription?.expiryDate
    ? new Date(overview.subscription.expiryDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const handleOpenCreateKeyModal = () => {
    const activeKeyCount = overview?.keys?.filter((k) => k.status === "active").length || 0;
    if (currentTier === "free" && activeKeyCount >= 1) {
      setIsUpgradePromptOpen(true);
      return;
    }
    if (currentTier === "pro" && activeKeyCount >= 5) {
      setIsUpgradePromptOpen(true);
      return;
    }
    setIsCreateModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 md:px-8 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="pointer-events-none absolute top-10 left-1/3 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 right-10 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />

      <div className="max-w-6xl mx-auto space-y-8 relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-extrabold text-white tracking-tight">Developer SaaS Portal</h1>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                API v1 Live
              </span>
            </div>
            <p className="text-slate-400 text-sm mt-1">
              Monetize, integrate, and query BMI health analytics via commercial API keys.
            </p>
          </div>

          <button
            onClick={handleOpenCreateKeyModal}
            className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/25 active:scale-[0.98] transition-all flex items-center gap-2 self-start md:self-auto"
          >
            <span>+ Create API Key</span>
          </button>
        </div>

        {/* Notifications */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError("")} className="text-rose-400 font-bold hover:text-white">✕</button>
          </div>
        )}
        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center justify-between">
            <span>{successMsg}</span>
            <button onClick={() => setSuccessMsg("")} className="text-emerald-400 font-bold hover:text-white">✕</button>
          </div>
        )}

        {/* Active Subscription & Expiry Banner */}
        <div className="p-6 md:p-8 rounded-3xl bg-slate-900/70 backdrop-blur-xl border border-slate-800 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Active Plan</span>
                <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase ${
                  currentTier === "enterprise"
                    ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                    : currentTier === "pro"
                    ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40"
                    : "bg-slate-800 text-slate-300 border border-slate-700"
                }`}>
                  {currentTier.toUpperCase()} TIER
                </span>
                <span className="text-xs text-slate-400 font-medium capitalize">
                  ({overview?.subscription?.billingCycle?.replace("_", " ") || "1 month"})
                </span>
              </div>

              <h2 className="text-2xl font-bold text-white">
                {currentTier === "free"
                  ? "Developer Free Account"
                  : `${currentTier.charAt(0).toUpperCase() + currentTier.slice(1)} Commercial Subscription`}
              </h2>

              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-300 pt-1">
                {expiryDate && currentTier !== "free" && (
                  <div className="flex items-center gap-2 bg-slate-950/60 px-3.5 py-1.5 rounded-lg border border-slate-800">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Expires on <strong className="text-white">{expiryDate}</strong></span>
                    {daysRemaining !== null && (
                      <span className="text-xs text-indigo-400 font-semibold">({daysRemaining} days left)</span>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-2 bg-slate-950/60 px-3.5 py-1.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400">Monthly Quota:</span>
                  <strong className="text-white">
                    {(overview?.stats?.totalQuota || 1000).toLocaleString()} calls / month
                  </strong>
                </div>
              </div>
            </div>

            {/* Quota Gauge */}
            {(() => {
              const usage = overview?.stats?.totalUsage || 0;
              const quota = overview?.stats?.totalQuota || 1000;
              const rawPercent = (usage / quota) * 100;
              const fillPercent = usage > 0 ? Math.max(2.5, Math.min(100, rawPercent)) : 0;
              const formattedPercent = rawPercent < 1 && rawPercent > 0 ? rawPercent.toFixed(1) : Math.round(rawPercent);

              return (
                <div className="w-full lg:w-72 p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-3">
                  <div className="flex justify-between text-xs text-slate-400 font-medium">
                    <span>Usage This Month</span>
                    <span>{usage.toLocaleString()} / {quota.toLocaleString()} ({formattedPercent}%)</span>
                  </div>
                  <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500 shadow-sm shadow-indigo-500/50"
                      style={{ width: `${fillPercent}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 text-right">Quotas reset every 30 days</p>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Multi-Duration Billing Selector & Pricing Grid */}
        <div id="pricing-section" className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-white">Subscription & Pricing Plans</h3>
              <p className="text-slate-400 text-xs mt-1">Select a billing duration to unlock discounted rate tiers.</p>
            </div>

            {/* Billing Cycle Duration Selector Tabs */}
            <div className="bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 flex items-center gap-1 self-start md:self-auto overflow-x-auto max-w-full">
              {[
                { id: "1_month", label: "1 Month" },
                { id: "3_months", label: "3 Months (-10%)" },
                { id: "6_months", label: "6 Months (-20%)" },
                { id: "1_year", label: "1 Year (-30% Best)" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setBillingCycle(tab.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                    billingCycle === tab.id
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Free Tier */}
            <div className={`p-6 rounded-3xl bg-slate-900/60 border ${
              currentTier === "free" ? "border-indigo-500/60 ring-2 ring-indigo-500/20" : "border-slate-800"
            } flex flex-col justify-between space-y-6 relative`}>
              {currentTier === "free" && (
                <span className="absolute top-4 right-4 text-[10px] uppercase font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-2.5 py-0.5 rounded-full">
                  Current Plan
                </span>
              )}
              <div className="space-y-4">
                <h4 className="text-lg font-bold text-white">Free / Developer</h4>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-white">$0</span>
                  <span className="text-slate-400 text-xs">/ forever</span>
                </div>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Ideal for testing, hackathons, and small side projects.
                </p>
                <ul className="space-y-2.5 text-xs text-slate-300 pt-2">
                  <li className="flex items-center gap-2">✓ 1,000 API Calls / Month</li>
                  <li className="flex items-center gap-2">✓ Rate Limit: 10 req / min</li>
                  <li className="flex items-center gap-2">✓ Basic BMI Calculation</li>
                  <li className="flex items-center gap-2 text-slate-500">✕ Progress Velocity Analytics</li>
                </ul>
              </div>
              <button
                disabled={currentTier === "free" || submittingPlan}
                onClick={() => handleSubscribe("free")}
                className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-semibold rounded-xl transition-all"
              >
                {currentTier === "free" ? "Active Plan" : "Downgrade to Free"}
              </button>
            </div>

            {/* Pro Tier (Popular) */}
            <div className={`p-6 rounded-3xl bg-slate-900/90 border ${
              currentTier === "pro" ? "border-indigo-500 ring-2 ring-indigo-500/30" : "border-indigo-500/40"
            } flex flex-col justify-between space-y-6 relative shadow-xl shadow-indigo-950/40`}>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-[10px] font-extrabold uppercase px-3 py-0.5 rounded-full shadow-md">
                MOST POPULAR
              </div>
              <div className="space-y-4 pt-2">
                <h4 className="text-lg font-bold text-white">Pro SaaS Tier</h4>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-white">{getPlanPrice("pro").price}</span>
                  <span className="text-slate-400 text-xs">{getPlanPrice("pro").period}</span>
                </div>
                <p className="text-xs text-indigo-400 font-medium">{getPlanPrice("pro").note}</p>
                <ul className="space-y-2.5 text-xs text-slate-200 pt-2">
                  <li className="flex items-center gap-2">✓ <strong>50,000 API Calls</strong> / Month</li>
                  <li className="flex items-center gap-2">✓ Rate Limit: 100 req / min</li>
                  <li className="flex items-center gap-2">✓ BMI + Weight Ranges + Advice</li>
                  <li className="flex items-center gap-2">✓ Historical Progress Velocity</li>
                  <li className="flex items-center gap-2">✓ Ideal Weight Multi-Formulas</li>
                </ul>
              </div>
              <button
                disabled={currentTier === "pro" || submittingPlan}
                onClick={() => handleSubscribe("pro")}
                className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition-all active:scale-[0.98]"
              >
                {currentTier === "pro" ? "Active Plan" : `Upgrade to Pro (${getPlanPrice("pro").price})`}
              </button>
            </div>

            {/* Enterprise Tier */}
            <div className={`p-6 rounded-3xl bg-slate-900/60 border ${
              currentTier === "enterprise" ? "border-purple-500 ring-2 ring-purple-500/30" : "border-slate-800"
            } flex flex-col justify-between space-y-6 relative`}>
              <div className="space-y-4">
                <h4 className="text-lg font-bold text-white">Enterprise Tier</h4>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-white">{getPlanPrice("enterprise").price}</span>
                  <span className="text-slate-400 text-xs">{getPlanPrice("enterprise").period}</span>
                </div>
                <p className="text-xs text-purple-400 font-medium">{getPlanPrice("enterprise").note}</p>
                <ul className="space-y-2.5 text-xs text-slate-300 pt-2">
                  <li className="flex items-center gap-2">✓ <strong>500,000 API Calls</strong> / Month</li>
                  <li className="flex items-center gap-2">✓ Rate Limit: 1,000 req / min</li>
                  <li className="flex items-center gap-2">✓ All Pro Endpoints & Features</li>
                  <li className="flex items-center gap-2">✓ Priority High-Speed SLA</li>
                  <li className="flex items-center gap-2">✓ Webhooks & Custom Support</li>
                </ul>
              </div>
              <button
                disabled={currentTier === "enterprise" || submittingPlan}
                onClick={() => handleSubscribe("enterprise")}
                className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-lg shadow-purple-600/25 transition-all active:scale-[0.98]"
              >
                {currentTier === "enterprise" ? "Active Plan" : `Upgrade to Enterprise`}
              </button>
            </div>
          </div>
        </div>

        {/* API Key Management Table */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-white">API Keys</h3>
              <p className="text-slate-400 text-xs mt-0.5">Manage secret API keys to authenticate third-party apps.</p>
            </div>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            {overview?.keys && overview.keys.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 bg-slate-950/40">
                      <th className="py-4 px-6">Name</th>
                      <th className="py-4 px-6">Key Prefix</th>
                      <th className="py-4 px-6">Tier</th>
                      <th className="py-4 px-6">Key Usage (Shared Account Limit)</th>
                      <th className="py-4 px-6">Status</th>
                      <th className="py-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-xs text-slate-200">
                    {overview.keys.map((k) => (
                      <tr key={k.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-4 px-6 font-semibold text-white">{k.name}</td>
                        <td className="py-4 px-6 font-mono text-slate-300">
                          <div className="flex items-center gap-2">
                            <span>{k.keyPrefix}</span>
                            <button
                              onClick={() => {
                                const keyIdStr = String(k.id || k._id);
                                const secretToCopy = fullSecretKeys[keyIdStr] || k.keyPrefix;
                                handleCopyPrefix(k.id, secretToCopy);
                              }}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white border border-slate-700/60 rounded text-[10px] font-semibold transition-colors"
                              title="Copy Secret Key"
                            >
                              {copiedKeyId === k.id ? "Copied! ✓" : "Copy"}
                            </button>
                          </div>
                        </td>
                        <td className="py-4 px-6 uppercase text-[10px] font-bold text-indigo-400">{k.tier}</td>
                        <td className="py-4 px-6">
                          <div className="space-y-1">
                            <span className="font-semibold text-white block">{k.usageCount.toLocaleString()} calls</span>
                            <div className="w-28 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                                style={{
                                  width: `${k.usageCount > 0 ? Math.max(4, Math.min(100, (k.usageCount / (overview?.stats?.totalQuota || 1000)) * 100)) : 0}%`,
                                }}
                              />
                            </div>
                            <span className="text-[10px] text-slate-500 block">Shared Cap: {(overview?.stats?.totalQuota || 1000).toLocaleString()}/mo</span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            k.status === "active"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                          }`}>
                            {k.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          {k.status === "active" && (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleRotateKey(k.id)}
                                className="px-3 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs transition-colors"
                                title="Regenerate key secret"
                              >
                                Rotate Secret
                              </button>
                              <button
                                onClick={() => handleRevokeKey(k.id)}
                                className="px-3 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-lg text-xs transition-colors"
                              >
                                Revoke
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-10 text-center space-y-3">
                <p className="text-slate-400 text-sm">No API keys created yet.</p>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl"
                >
                  Create Your First API Key
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Code Snippets & Interactive API Sandbox */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
          {/* Documentation Snippets */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white">API Documentation</h3>
            <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 space-y-4">
              {/* Endpoint Selector Tabs */}
              <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800 gap-1 overflow-x-auto">
                {[
                  { id: "/calculate-bmi", label: "POST /calculate-bmi" },
                  { id: "/ideal-weight", label: "POST /ideal-weight" },
                  { id: "/analyze-progress", label: "POST /analyze-progress" },
                ].map((ep) => (
                  <button
                    key={ep.id}
                    onClick={() => {
                      setDocEndpoint(ep.id);
                      setSelectedEndpoint(ep.id);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                      docEndpoint === ep.id
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {ep.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    POST
                  </span>
                  <span className="text-xs font-mono text-slate-200">/api/v1{docEndpoint}</span>
                </div>
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  {["curl", "js", "python", "node"].map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setCodeLang(lang)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                        codeLang === lang ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 font-mono text-xs text-indigo-300 overflow-x-auto">
                <pre>
                  {renderDocCodeSnippet(docEndpoint, codeLang, getDisplayPrefix(sandboxApiKey))}
                </pre>
              </div>
            </div>
          </div>

          {/* Live API Tester Sandbox */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white">Live API Sandbox ("Try It Out")</h3>
            <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    API Secret Key (<code className="text-indigo-400">x-api-key</code>)
                  </label>
                  <input
                    type="text"
                    value={getDisplayPrefix(sandboxApiKey)}
                    onChange={(e) => setSandboxApiKey(e.target.value.trim())}
                    placeholder="Paste full API secret key (e.g. bmi_live_sk_...)"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Display Prefix: <code className="text-indigo-400">{getDisplayPrefix(sandboxApiKey)}</code>
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Select Endpoint</label>
                  <select
                    value={selectedEndpoint}
                    onChange={(e) => setSelectedEndpoint(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                  >
                    <option value="/calculate-bmi">POST /api/v1/calculate-bmi</option>
                    <option value="/ideal-weight">POST /api/v1/ideal-weight</option>
                    <option value="/analyze-progress">POST /api/v1/analyze-progress</option>
                  </select>
                </div>

                {/* Height Unit & Input Selector */}
                <div className="space-y-2 bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-slate-300">Height Unit</label>
                    <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                      {[
                        { id: "cm", label: "cm" },
                        { id: "ft_in", label: "ft & in" },
                      ].map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => handleSandboxHeightUnitChange(u.id)}
                          className={`px-3 py-0.5 text-[10px] font-bold rounded-lg transition-all ${
                            sandboxHeightUnit === u.id
                              ? "bg-indigo-600 text-white shadow"
                              : "text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          {u.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {sandboxHeightUnit === "ft_in" ? (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="block text-[10px] font-medium text-slate-400 mb-1">Feet (ft)</label>
                        <input
                          type="number"
                          value={sandboxFeet}
                          onChange={(e) => setSandboxFeet(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                          placeholder="5"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-slate-400 mb-1">Inches (in)</label>
                        <input
                          type="number"
                          value={sandboxInches}
                          onChange={(e) => setSandboxInches(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                          placeholder="9"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="pt-1">
                      <label className="block text-[10px] font-medium text-slate-400 mb-1">
                        Height (cm)
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={sandboxHeight}
                        onChange={(e) => setSandboxHeight(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                        placeholder="175"
                      />
                    </div>
                  )}
                </div>

                {/* Weight Unit & Input Selector */}
                <div className="space-y-2 bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-slate-300">Weight Unit</label>
                    <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                      {[
                        { id: "kg", label: "kg" },
                        { id: "lbs", label: "lbs" },
                      ].map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => handleSandboxWeightUnitChange(u.id)}
                          className={`px-2.5 py-0.5 text-[10px] font-bold rounded-lg transition-all ${
                            sandboxWeightUnit === u.id
                              ? "bg-indigo-600 text-white shadow"
                              : "text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          {u.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="pt-1">
                    <label className="block text-[10px] font-medium text-slate-400 mb-1">
                      Weight ({sandboxWeightUnit})
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={sandboxWeight}
                      onChange={(e) => setSandboxWeight(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                      placeholder={sandboxWeightUnit === "lbs" ? "154" : "70"}
                    />
                  </div>
                </div>

                {/* Gender Selector for Ideal Weight */}
                {selectedEndpoint === "/ideal-weight" && (
                  <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80 flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-slate-300">Gender</label>
                    <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                      <button
                        type="button"
                        onClick={() => setSandboxGender("male")}
                        className={`px-3 py-0.5 text-[10px] font-bold rounded-lg transition-all ${
                          sandboxGender === "male" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        Male
                      </button>
                      <button
                        type="button"
                        onClick={() => setSandboxGender("female")}
                        className={`px-3 py-0.5 text-[10px] font-bold rounded-lg transition-all ${
                          sandboxGender === "female" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        Female
                      </button>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleRunSandbox}
                  disabled={testingApi}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-xl text-xs transition-all"
                >
                  {testingApi ? "Executing Request..." : "Run API Request"}
                </button>
              </div>

              {/* Response Output */}
              {sandboxResponse && (
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-400">Response Status:</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      sandboxResponse.status === 200 ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                    }`}>
                      {sandboxResponse.status} {sandboxResponse.statusText}
                    </span>
                  </div>
                  <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-emerald-400 overflow-x-auto max-h-48">
                    {JSON.stringify(sandboxResponse.data || sandboxResponse.error, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Create Key Form */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-xl font-bold text-white">Generate New API Key</h3>
            <p className="text-slate-400 text-xs">Give your API key a descriptive label (e.g. "Mobile iOS App").</p>

            <form onSubmit={handleCreateKey} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Key Name</label>
                <input
                  type="text"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  placeholder="e.g. Production Web App"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingKey}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs shadow-lg shadow-indigo-600/30"
                >
                  {creatingKey ? "Generating..." : "Generate Key"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Show Newly Created Key ONCE */}
      {newlyCreatedKey && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-indigo-500/50 p-6 md:p-8 rounded-3xl max-w-lg w-full space-y-5 shadow-2xl relative">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xl font-bold mx-auto">
              ✓
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-xl font-bold text-white">API Key Generated!</h3>
              <p className="text-amber-400 text-xs font-semibold">
                ⚠️ Save this key now! For security, it will NOT be shown again.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
              <span className="font-mono text-xs text-indigo-300 break-all select-all">{newlyCreatedKey}</span>
              <button
                onClick={() => handleCopyKey(newlyCreatedKey)}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shrink-0 transition-all"
              >
                {copied ? "Copied! ✓" : "Copy Key"}
              </button>
            </div>

            <button
              onClick={() => setNewlyCreatedKey(null)}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl"
            >
              I Have Saved My API Key
            </button>
          </div>
        </div>
      )}

      {/* Modal: Payment Checkout & Confirmation */}
      {pendingPayment && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-indigo-500/50 p-6 md:p-8 rounded-3xl max-w-md w-full space-y-6 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-bold text-white">Confirm Checkout</h3>
                <p className="text-xs text-slate-400 mt-0.5">Complete payment to upgrade subscription</p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                {pendingPayment.tier.toUpperCase()}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Plan & Duration:</span>
                <span className="font-semibold text-white capitalize">
                  {pendingPayment.tier} Tier ({pendingPayment.billingCycle.replace("_", " ")})
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Discount Note:</span>
                <span className="text-xs text-indigo-400 font-medium">{pendingPayment.note}</span>
              </div>
              <div className="flex justify-between items-center text-base font-bold text-white border-t border-slate-800 pt-3">
                <span>Total Amount Due:</span>
                <span className="text-2xl text-indigo-400">{pendingPayment.price}</span>
              </div>
            </div>

            {/* Simulated Payment Card Info */}
            <div className="space-y-3 bg-slate-950/50 p-4 rounded-2xl border border-slate-800/80">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">Payment Method</span>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-indigo-400">VISA</span>
                  <span>•••• •••• •••• 4242</span>
                </div>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold">READY</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPendingPayment(null)}
                className="w-1/2 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={processingPayment}
                onClick={() => handleSubscribe(pendingPayment.tier, true)}
                className="w-1/2 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition-all active:scale-[0.98]"
              >
                {processingPayment ? "Processing..." : `Pay ${pendingPayment.price}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Upgrade Required Prompt */}
      {isUpgradePromptOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-indigo-500/40 p-6 md:p-8 rounded-3xl max-w-md w-full space-y-5 shadow-2xl relative text-center">
            <div className="w-14 h-14 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-2xl font-bold mx-auto">
              ⚡
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">API Key Limit Reached</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                {currentTier === "free"
                  ? "Free tier accounts are strictly limited to 1 active API key. Upgrade your subscription plan to Pro or Enterprise to create additional API keys."
                  : "You have reached the maximum active key limit for your current subscription plan."}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-left text-xs space-y-2">
              <div className="flex justify-between text-slate-300">
                <span>Active Key Limit:</span>
                <span className="font-bold text-white">1 / 1 Key Used</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Account Plan:</span>
                <span className="font-bold text-indigo-400 uppercase">FREE TIER</span>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 pt-2">
              <button
                onClick={() => {
                  setIsUpgradePromptOpen(false);
                  const pricingSection = document.getElementById("pricing-section");
                  if (pricingSection) {
                    pricingSection.scrollIntoView({ behavior: "smooth" });
                  }
                }}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition-all active:scale-[0.98]"
              >
                🚀 Upgrade Subscription Plan
              </button>
              <button
                onClick={() => setIsUpgradePromptOpen(false)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-medium rounded-xl transition-colors"
              >
                Close & Revoke Key Instead
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}