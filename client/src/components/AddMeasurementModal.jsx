import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/axios.js";
import { X } from "lucide-react";

export function AddMeasurementModal({ isOpen, onClose, initialHeight, initialWeight, editingEntry, latestMeasurement }) {
    const queryClient = useQueryClient();
    const [heightUnit, setHeightUnit] = useState("cm");
    const [weightUnit, setWeightUnit] = useState("kg");
    const [height, setHeight] = useState("");
    const [feet, setFeet] = useState("");
    const [inches, setInches] = useState("");
    const [weight, setWeight] = useState("");
    const [customDate, setCustomDate] = useState("");

    useEffect(() => {
        if (editingEntry) {
            const hUnit = editingEntry.heightUnit || (editingEntry.unit === "imperial" ? "in" : "cm");
            const wUnit = editingEntry.weightUnit || (editingEntry.unit === "imperial" ? "lbs" : "kg");
            setHeightUnit(hUnit);
            setWeightUnit(wUnit);
            setWeight(editingEntry.rawWeight ?? editingEntry.weight ?? "");
            if (editingEntry.createdAt) {
                const localIso = new Date(new Date(editingEntry.createdAt).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                setCustomDate(localIso);
            }

            const rawH = editingEntry.rawHeight ?? editingEntry.height ?? "";
            const rawHNum = Number(rawH);
            if (hUnit === "in" && !isNaN(rawHNum) && rawHNum > 0) {
                setFeet(Math.floor(rawHNum / 12));
                setInches(Number((rawHNum % 12).toFixed(1)));
                setHeight("");
            } else {
                setHeight(rawH);
                setFeet("");
                setInches("");
            }
        } else {
            // Prefill height and units from latest measurement or defaults
            const baseH = latestMeasurement?.rawHeight ?? latestMeasurement?.height ?? initialHeight ?? "";
            const hUnit = latestMeasurement?.heightUnit || (latestMeasurement?.unit === "imperial" ? "in" : "cm");
            const wUnit = latestMeasurement?.weightUnit || (latestMeasurement?.unit === "imperial" ? "lbs" : "kg");
            
            setHeightUnit(hUnit);
            setWeightUnit(wUnit);
            
            const rawHNum = Number(baseH);
            if (hUnit === "in" && !isNaN(rawHNum) && rawHNum > 0) {
                setFeet(Math.floor(rawHNum / 12));
                setInches(Number((rawHNum % 12).toFixed(1)));
                setHeight("");
            } else {
                setHeight(baseH);
                setFeet("");
                setInches("");
            }
            setWeight(initialWeight || "");
            
            const nowLocalIso = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
            setCustomDate(nowLocalIso);
        }
    }, [editingEntry, initialHeight, initialWeight, latestMeasurement, isOpen]);

    // Convert height values when switching height unit tab
    const handleHeightUnitChange = (newUnit) => {
        if (newUnit === heightUnit) return;
        if (newUnit === "in" && height) {
            // cm -> ft & in
            const totalInches = Number(height) / 2.54;
            if (!isNaN(totalInches) && totalInches > 0) {
                setFeet(Math.floor(totalInches / 12));
                setInches(Number((totalInches % 12).toFixed(1)));
            }
            setHeight("");
        } else if (newUnit === "cm" && (feet !== "" || inches !== "")) {
            // ft & in -> cm
            const totalInches = (Number(feet) * 12) + Number(inches);
            if (!isNaN(totalInches) && totalInches > 0) {
                const rawCm = totalInches * 2.54;
                const roundedInt = Math.round(rawCm);
                // Snap to exact integer if rounding error drift is under 0.1 cm
                const finalCm = Math.abs(rawCm - roundedInt) < 0.1 ? roundedInt : Number(rawCm.toFixed(1));
                setHeight(finalCm);
            }
            setFeet("");
            setInches("");
        }
        setHeightUnit(newUnit);
    };

    // Convert weight values when switching weight unit tab
    const handleWeightUnitChange = (newUnit) => {
        if (newUnit === weightUnit) return;
        if (weight && !isNaN(Number(weight))) {
            const val = Number(weight);
            if (newUnit === "lbs" && weightUnit === "kg") {
                const rawLbs = val / 0.45359237;
                const roundedInt = Math.round(rawLbs);
                const finalLbs = Math.abs(rawLbs - roundedInt) < 0.1 ? roundedInt : Number(rawLbs.toFixed(1));
                setWeight(finalLbs);
            } else if (newUnit === "kg" && weightUnit === "lbs") {
                const rawKg = val * 0.45359237;
                const roundedInt = Math.round(rawKg);
                const finalKg = Math.abs(rawKg - roundedInt) < 0.1 ? roundedInt : Number(rawKg.toFixed(1));
                setWeight(finalKg);
            }
        }
        setWeightUnit(newUnit);
    };

    const mutation = useMutation({
        mutationFn: async (data) => {
            if (editingEntry) {
                const response = await api.put(`/measurement/${editingEntry._id}`, data);
                return response.data;
            } else {
                const response = await api.post("/measurement", data);
                return response.data;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["measurements"] });
            onClose();
        },
        onError: (error) => {
            console.error("Error saving measurement:", error);
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        
        let finalHeight = Number(height);
        if (heightUnit === "in") {
            finalHeight = (Number(feet) * 12) + Number(inches);
        }

        mutation.mutate({
            height: finalHeight,
            weight: Number(weight),
            heightUnit,
            weightUnit,
            createdAt: customDate ? new Date(customDate).toISOString() : undefined
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700/80 p-6 md:p-8 rounded-3xl shadow-2xl shadow-black/80 w-full max-w-md relative z-10 text-slate-100">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-white tracking-tight">
                            {editingEntry ? "Edit Measurement" : "Log New Measurement"}
                        </h3>
                        <p className="text-slate-400 text-xs mt-0.5">Record your height & weight in any unit</p>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                        title="Close Modal"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Height input with unit selector */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300" htmlFor="modal-height">
                                Height ({heightUnit === "in" ? "ft & in" : "cm"})
                            </label>
                            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => handleHeightUnitChange("cm")}
                                    className={`px-3 py-1 text-[10px] font-bold uppercase rounded-lg transition-all ${
                                        heightUnit === "cm"
                                            ? "bg-indigo-600 text-white shadow"
                                            : "text-slate-400 hover:text-slate-200"
                                    }`}
                                >
                                    cm
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleHeightUnitChange("in")}
                                    className={`px-3 py-1 text-[10px] font-bold uppercase rounded-lg transition-all ${
                                        heightUnit === "in"
                                            ? "bg-indigo-600 text-white shadow"
                                            : "text-slate-400 hover:text-slate-200"
                                    }`}
                                >
                                    ft & in
                                </button>
                            </div>
                        </div>

                        {heightUnit === "in" ? (
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <span className="block text-[10px] font-medium text-slate-400 mb-1">Feet (ft)</span>
                                    <input
                                        type="number"
                                        inputMode="decimal"
                                        step="any"
                                        min="0"
                                        value={feet}
                                        onChange={(e) => setFeet(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
                                        placeholder="5"
                                        required
                                    />
                                </div>
                                <div>
                                    <span className="block text-[10px] font-medium text-slate-400 mb-1">Inches (in)</span>
                                    <input
                                        type="number"
                                        inputMode="decimal"
                                        step="any"
                                        min="0"
                                        max="11.9"
                                        value={inches}
                                        onChange={(e) => setInches(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
                                        placeholder="9"
                                        required
                                    />
                                </div>
                            </div>
                        ) : (
                            <input
                                type="number"
                                inputMode="decimal"
                                step="any"
                                min="1"
                                id="modal-height"
                                value={height}
                                onChange={(e) => setHeight(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
                                placeholder="175"
                                required
                            />
                        )}
                    </div>

                    {/* Weight input with unit selector */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300" htmlFor="modal-weight">
                                Weight ({weightUnit})
                            </label>
                            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => handleWeightUnitChange("kg")}
                                    className={`px-3 py-1 text-[10px] font-bold uppercase rounded-lg transition-all ${
                                        weightUnit === "kg"
                                            ? "bg-indigo-600 text-white shadow"
                                            : "text-slate-400 hover:text-slate-200"
                                    }`}
                                >
                                    kg
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleWeightUnitChange("lbs")}
                                    className={`px-3 py-1 text-[10px] font-bold uppercase rounded-lg transition-all ${
                                        weightUnit === "lbs"
                                            ? "bg-indigo-600 text-white shadow"
                                            : "text-slate-400 hover:text-slate-200"
                                    }`}
                                >
                                    lbs
                                </button>
                            </div>
                        </div>
                        <input
                            type="number"
                            step="any"
                            id="modal-weight"
                            value={weight}
                            onChange={(e) => setWeight(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
                            placeholder={weightUnit === "lbs" ? "154" : "70"}
                            required
                        />
                    </div>

                    {/* Date/Time picker for backdating entries */}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5" htmlFor="modal-date">
                            Log Date & Time
                        </label>
                        <input
                            type="datetime-local"
                            id="modal-date"
                            value={customDate}
                            onChange={(e) => setCustomDate(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200 text-xs"
                            required
                        />
                    </div>

                    <div className="flex items-center justify-end space-x-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium border border-slate-700/60 transition-colors text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={mutation.isPending}
                            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold shadow-lg shadow-indigo-600/25 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 text-sm"
                        >
                            {mutation.isPending ? "Saving Entry..." : "Save Entry"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}


