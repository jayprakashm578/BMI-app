import { Measurement } from "../models/Measurement.js";

export async function createMeasurementService(user, height, weight, bmi, category){
    return Measurement.create({
        user,
        height,
        weight,
        bmi,
        category
    })
}