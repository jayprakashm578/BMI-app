import mongoose from "mongoose";

const measurementSchema = new mongoose.Schema(
    {
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    height: {
        type: Number,
        required: true
    },
    weight: {
        type: Number,
        required: true
    },
    rawHeight: {
        type: Number
    },
    rawWeight: {
        type: Number
    },
    bmi: {
        type: Number,
        required: true
    },
    category: {
        type: String,
        enum: ["Underweight", "Normal weight", "Overweight", "Obese"]
    },
    heightUnit: {
        type: String,
        enum: ["cm", "in"],
        default: "cm"
    },
    weightUnit: {
        type: String,
        enum: ["kg", "lbs"],
        default: "kg"
    },
    unit: {
        type: String,
        enum: ["metric", "imperial"],
        default: "metric"
    }
},
{ timestamps: true}
);

export const Measurement = mongoose.model("Measurement", measurementSchema);