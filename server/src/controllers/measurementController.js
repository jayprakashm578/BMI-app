import { createMeasurementService } from "../services/measurementService.js";
import { calculateBMI, getBMICategory } from "../utils/bmiCalculator.js";
import { Measurement } from "../models/Measurement.js";

export async function createMeasurement(req, res, next) {
  try {
    const { height, weight } = req.body;
    const bmi = calculateBMI(height, weight);
    const category = getBMICategory(bmi);
    const measurement = await createMeasurementService(req.user._id, height, weight, bmi, category);
    res.status(201).json({
      message: "Measurement created successfully",
      measurement,
    });
  } catch (error) {
    next(error);
  }
}

export async function getMeasurements(req, res, next) {
  try {
    let measurements = await Measurement.find({ user: req.user._id }).sort({ createdAt: -1 });

    // Auto-apply initial measurement if user has 0 measurements but height & weight exist in profile
    if (measurements.length === 0 && req.user && req.user.height && req.user.weight) {
      const bmi = calculateBMI(req.user.height, req.user.weight);
      const category = getBMICategory(bmi);
      const initialMeasurement = await createMeasurementService(
        req.user._id,
        req.user.height,
        req.user.weight,
        bmi,
        category
      );
      measurements = [initialMeasurement];
    }

    res.status(200).json({ success: true, count: measurements.length, data: measurements });
  } catch (error) {
    next(error);
  }
}
export async function deleteMeasurement(req, res, next) {
  try {
    const measurement = await Measurement.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });

    if (!measurement) {
      return res.status(404).json({ error: "Measurement not found" });
    }

    res.status(200).json({ success: true, message: "Measurement deleted successfully" });
  } catch (error) {
    next(error);
  }
}