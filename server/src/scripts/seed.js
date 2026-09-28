import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { User } from "../models/User.js";
import { Measurement } from "../models/Measurement.js";
import { calculateBMI, getBMICategory } from "../utils/bmiCalculator.js";

dotenv.config();

const targetUri = process.argv[2] || process.env.MONGO_URI;

if (!targetUri || targetUri.includes("127.0.0.1")) {
  console.log("--------------------------------------------------");
  console.log("⚠️ WARNING: Target URI is set to local DB or missing.");
  console.log("To target your hosted MongoDB Atlas database, run:");
  console.log('node src/scripts/seed.js "mongodb+srv://<user>:<password>@cluster.mongodb.net/bmi_db"');
  console.log("--------------------------------------------------");
}

const FIRST_NAMES = ["Alex", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Avery", "Dakota", "Reese", "Quinn", "Skyler", "Rowan"];
const LAST_NAMES = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez"];

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomNumber(min, max, decimals = 1) {
  const val = Math.random() * (max - min) + min;
  return Number(val.toFixed(decimals));
}

async function seedDatabase() {
  console.time("⏱️ Total Seeding Time");
  try {
    console.log(`🔌 Connecting to MongoDB Atlas: ${targetUri.replace(/:([^@]+)@/, ":****@")}`);
    await mongoose.connect(targetUri);
    console.log("✅ Successfully connected to MongoDB Atlas!");

    const userCount = 10000;
    const batchSize = 2000;

    console.log("🔒 Pre-hashing default password 'Password123!'...");
    const defaultPasswordHash = await bcrypt.hash("Password123!", 10);

    console.log(`🚀 Starting generation of ${userCount.toLocaleString()} users & ~75,000 measurement entries...`);

    let totalUsersInserted = 0;
    let totalMeasurementsInserted = 0;

    for (let i = 0; i < userCount; i += batchSize) {
      const usersBatch = [];
      const measurementsBatch = [];

      const currentBatchEnd = Math.min(i + batchSize, userCount);

      for (let u = i; u < currentBatchEnd; u++) {
        const userId = new mongoose.Types.ObjectId();
        const firstName = getRandomItem(FIRST_NAMES);
        const lastName = getRandomItem(LAST_NAMES);
        const name = `${firstName} ${lastName}`;
        const email = `user${u + 1}@example.com`;

        usersBatch.push({
          _id: userId,
          name,
          email,
          password: defaultPasswordHash,
          createdAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000)
        });

        // Generate 5 to 10 measurement entries per user
        const numEntries = Math.floor(Math.random() * 6) + 5; // 5 to 10 entries
        const isImperialUser = Math.random() > 0.5;

        // Base height & weight
        let baseHeightCm = getRandomNumber(152, 192, 1); // 152cm to 192cm
        let currentWeightKg = getRandomNumber(52, 105, 1); // 52kg to 105kg

        const heightUnit = isImperialUser ? "in" : "cm";
        const weightUnit = isImperialUser ? "lbs" : "kg";
        const unit = isImperialUser ? "imperial" : "metric";

        const rawHeight = isImperialUser ? Number((baseHeightCm / 2.54).toFixed(1)) : baseHeightCm;

        // Space entries over past 90 days
        const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

        for (let m = 0; m < numEntries; m++) {
          // Slight weight fluctuation (+/- 0.8 kg per log)
          currentWeightKg = Number((currentWeightKg + getRandomNumber(-0.8, 0.8, 1)).toFixed(1));
          if (currentWeightKg < 40) currentWeightKg = 40;

          const rawWeight = isImperialUser ? Number((currentWeightKg / 0.45359237).toFixed(1)) : currentWeightKg;

          // Perform BMI math
          const bmi = calculateBMI(rawHeight, rawWeight, heightUnit, weightUnit);
          const category = getBMICategory(bmi);

          const logDate = new Date(startDate.getTime() + (m * (90 / numEntries) + Math.random()) * 24 * 60 * 60 * 1000);

          measurementsBatch.push({
            user: userId,
            height: baseHeightCm,
            weight: currentWeightKg,
            rawHeight,
            rawWeight,
            bmi,
            category,
            heightUnit,
            weightUnit,
            unit,
            createdAt: logDate,
            updatedAt: logDate
          });
        }
      }

      // Batch insert into MongoDB Atlas
      await User.insertMany(usersBatch, { ordered: false });
      await Measurement.insertMany(measurementsBatch, { ordered: false });

      totalUsersInserted += usersBatch.length;
      totalMeasurementsInserted += measurementsBatch.length;

      const progressPct = ((totalUsersInserted / userCount) * 100).toFixed(0);
      console.log(`📦 Progress: ${progressPct}% | Users: ${totalUsersInserted.toLocaleString()} | Measurements: ${totalMeasurementsInserted.toLocaleString()}`);
    }

    console.log("--------------------------------------------------");
    console.log("🎉 POPULATION COMPLETE!");
    console.log(`✅ Total Users Seeded: ${totalUsersInserted.toLocaleString()}`);
    console.log(`✅ Total Measurements Seeded: ${totalMeasurementsInserted.toLocaleString()}`);
    console.log("🔑 All test users have default password: Password123!");
    console.log("--------------------------------------------------");
    console.timeEnd("⏱️ Total Seeding Time");

  } catch (error) {
    console.error("❌ Error seeding database:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB Atlas.");
    process.exit(0);
  }
}

seedDatabase();
