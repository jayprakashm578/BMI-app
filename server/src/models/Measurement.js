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
    bmi: {
        type: Number,
        required: true
    },
    category: {
        type: String,
        enum: ["Underweight", "Normal weight", "Overweight", "Obese"]
    }
},
{ timestamps: true}
);

export const Measurement = mongoose.model("Measurement", measurementSchema);