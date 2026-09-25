export function calculateBMI(height, weight, heightUnit = "cm", weightUnit = "kg") {
    // 1. Convert height to cm if input is in inches
    let heightInCm = Number(height);
    if (heightUnit === "in" || heightUnit === "imperial") {
        heightInCm = height * 2.54;
    }

    // 2. Convert weight to kg if input is in lbs
    let weightInKg = Number(weight);
    if (weightUnit === "lbs" || weightUnit === "imperial") {
        weightInKg = weight * 0.45359237;
    }

    // 3. Perform BMI calculation on unrounded metric values
    const heightInMeters = heightInCm > 3 ? heightInCm / 100 : heightInCm;
    const rawBmi = weightInKg / (heightInMeters * heightInMeters);

    // 4. Rounding is performed ONLY AFTER BMI is generated
    return Number(rawBmi.toFixed(1));
}

export function getBMICategory(bmi) {
    if (bmi < 18.5) {
        return "Underweight";
    }
    else if (bmi < 25) {
        return "Normal weight";
    }
    else if (bmi < 30) {
        return "Overweight";
    }
    else {
        return "Obese";
    }
}