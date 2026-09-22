import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/bmi_db";

export async function connectDatabase() {
    try{
        await mongoose.connect(MONGO_URI);

        console.log("MongoDB connected");
    } catch(error) {
        console.log("MongoDB connection failed", error.message);

        process.exit(1);
    }
}