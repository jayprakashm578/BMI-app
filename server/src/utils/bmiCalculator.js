/**
 * Convert any height input (ft/in, in, m, cm) to exact unrounded centimeters
 */
export function convertToCm(height, heightUnit = "cm", inchesInput = 0) {
  if (typeof height === "object" && height !== null) {
    const feet = Number(height.feet || height.ft || 0);
    const inches = Number(height.inches || height.in || 0);
    return ((feet * 12) + inches) * 2.54;
  }

  const h = Number(height || 0);
  const u = String(heightUnit || "cm").toLowerCase().trim();

  // Feet & Inches format
  if (u === "ft" || u === "feet" || u === "ft_in") {
    const feet = h;
    const inches = Number(inchesInput || 0);
    return ((feet * 12) + inches) * 2.54;
  }

  // Inches format
  if (u === "in" || u === "inch" || u === "inches" || u === "imperial") {
    return h * 2.54;
  }

  // Meters format
  if (u === "m" || u === "meter" || u === "meters") {
    return h * 100;
  }

  // If height is small (e.g. 1.75) and unit defaults to cm, detect meter input
  if (h > 0 && h <= 3 && u === "cm") {
    return h * 100;
  }

  // Centimeters format
  return h;
}

/**
 * Convert any weight input (lbs, kg) to exact unrounded kilograms
 */
export function convertToKg(weight, weightUnit = "kg") {
  const w = Number(weight || 0);
  const u = String(weightUnit || "kg").toLowerCase().trim();

  if (u === "lbs" || u === "lb" || u === "pound" || u === "pounds" || u === "imperial") {
    return w * 0.45359237;
  }

  return w;
}

/**
 * Perform exact BMI calculation:
 * 1. Convert height -> unrounded cm
 * 2. Convert weight -> unrounded kg
 * 3. Calculate raw unrounded BMI in metric values
 * 4. Round ONLY AT THE END after full BMI generation
 */
export function calculateBMI(height, weight, heightUnit = "cm", weightUnit = "kg", inchesInput = 0) {
  const heightInCm = convertToCm(height, heightUnit, inchesInput);
  const weightInKg = convertToKg(weight, weightUnit);

  if (!heightInCm || heightInCm <= 0 || !weightInKg || weightInKg <= 0) {
    return 0;
  }

  const heightInMeters = heightInCm / 100;
  const rawBmi = weightInKg / (heightInMeters * heightInMeters);

  // Rounding is performed ONLY AFTER final raw BMI is computed
  return Number(rawBmi.toFixed(1));
}

/**
 * Returns complete calculation details including unrounded and rounded metrics
 */
export function calculateBMIDetails(height, weight, heightUnit = "cm", weightUnit = "kg", inchesInput = 0) {
  const heightInCm = convertToCm(height, heightUnit, inchesInput);
  const weightInKg = convertToKg(weight, weightUnit);

  if (!heightInCm || heightInCm <= 0 || !weightInKg || weightInKg <= 0) {
    return null;
  }

  const heightInMeters = heightInCm / 100;
  const rawBmi = weightInKg / (heightInMeters * heightInMeters);
  const roundedBmi = Number(rawBmi.toFixed(1));
  const category = getBMICategory(roundedBmi);

  return {
    heightInCm,
    weightInKg,
    heightInMeters,
    rawBmi,
    bmi: roundedBmi,
    category,
  };
}

export function getBMICategory(bmi) {
  if (bmi < 18.5) {
    return "Underweight";
  } else if (bmi < 25) {
    return "Normal weight";
  } else if (bmi < 30) {
    return "Overweight";
  } else {
    return "Obese";
  }
}