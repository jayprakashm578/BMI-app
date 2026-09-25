import { Measurement } from "../models/Measurement.js";

export async function createMeasurementService(user, height, weight, bmi, category, heightUnit = "cm", weightUnit = "kg", rawHeight, rawWeight, createdAt) {
  const unit = (heightUnit === "in" || weightUnit === "lbs") ? "imperial" : "metric";
  const data = {
    user,
    height,
    weight,
    rawHeight: rawHeight !== undefined ? rawHeight : height,
    rawWeight: rawWeight !== undefined ? rawWeight : weight,
    bmi,
    category,
    heightUnit,
    weightUnit,
    unit
  };
  if (createdAt) {
    data.createdAt = createdAt;
  }
  return Measurement.create(data);
}