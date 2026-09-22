import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/axios.js";
import { X } from "lucide-react";

export function AddMeasurementModal({isOpen, onClose, initialHeight, initialWeight}){
    const queryClient = useQueryClient();
    const [height, setHeight] = useState(initialHeight || "");
    const [weight, setWeight] = useState(initialWeight || ""); 

    const mutation = useMutation({
        mutationFn: async (data) => {
            const response = await api.post("/measurement", data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["measurements"] });
            onClose();
        },
        onError: (error) => {
            console.error("Error adding measurement:", error);
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        mutation.mutate({ height: Number(height), weight: Number(weight) });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700/80 p-6 md:p-8 rounded-3xl shadow-2xl shadow-black/80 w-full max-w-md relative z-10 text-slate-100">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-white tracking-tight">Log New Measurement</h3>
                        <p className="text-slate-400 text-xs mt-0.5">Record your latest height and weight</p>
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
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2" htmlFor="modal-height">
                            Height (cm)
                        </label>
                        <input
                            type="number"
                            id="modal-height"
                            value={height}
                            onChange={(e) => setHeight(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
                            placeholder="175"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2" htmlFor="modal-weight">
                            Weight (kg)
                        </label>
                        <input
                            type="number"
                            id="modal-weight"
                            value={weight}
                            onChange={(e) => setWeight(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
                            placeholder="70"
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


