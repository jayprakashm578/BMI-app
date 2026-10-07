import { calculateBMI, getBMICategory, convertToCm, convertToKg } from "../utils/bmiCalculator.js";

// 1. POST /api/v1/calculate-bmi
export async function calculateBmiPublic(req, res, next) {
  try {
    let { height, weight, unitSystem = "metric", heightUnit, weightUnit, feet, inches } = req.body;

    if (!height && !feet) {
      return res.status(400).json({
        status: "error",
        error: "Please provide 'height' (or 'feet' and 'inches').",
      });
    }

    if (!weight) {
      return res.status(400).json({
        status: "error",
        error: "Please provide 'weight'.",
      });
    }

    const effHeightUnit = heightUnit || (feet !== undefined ? "ft" : (unitSystem === "imperial" ? "in" : "cm"));
    const effWeightUnit = weightUnit || (unitSystem === "imperial" ? "lbs" : "kg");

    const heightCm = convertToCm(height || feet, effHeightUnit, inches);
    const weightKg = convertToKg(weight, effWeightUnit);

    if (heightCm <= 0 || weightKg <= 0) {
      return res.status(400).json({
        status: "error",
        error: "Height and weight must be positive numbers.",
      });
    }

    const bmi = calculateBMI(height || feet, weight, effHeightUnit, effWeightUnit, inches);
    const category = getBMICategory(bmi);

    // Calculate Healthy Weight Range (BMI 18.5 to 24.9)
    const heightInMeters = heightCm / 100;
    const minHealthyKg = Number((18.5 * heightInMeters * heightInMeters).toFixed(1));
    const maxHealthyKg = Number((24.9 * heightInMeters * heightInMeters).toFixed(1));

    let recommendation = "";
    if (bmi < 18.5) {
      recommendation = "Consider consulting a nutritionist to increase calorie intake with nutrient-dense foods.";
    } else if (bmi < 25) {
      recommendation = "Great job! Maintain your current balanced diet and regular physical activity.";
    } else if (bmi < 30) {
      recommendation = "Incorporate moderate aerobic exercises and moderate calorie deficit for gradual weight loss.";
    } else {
      recommendation = "Focus on a structured fitness program and consult a healthcare professional for guidance.";
    }

    res.status(200).json({
      status: "success",
      data: {
        bmi,
        category,
        input: { heightCm, weightKg, unitSystem },
        healthyWeightRange: {
          minKg: minHealthyKg,
          maxKg: maxHealthyKg,
          minLbs: Number((minHealthyKg * 2.20462).toFixed(1)),
          maxLbs: Number((maxHealthyKg * 2.20462).toFixed(1)),
        },
        recommendation,
      },
      meta: {
        tier: req.apiKey.tier,
        accountTotalUsage: req.accountUsage?.totalAccountUsage || 1,
        accountMonthlyQuota: req.accountUsage?.monthlyQuota || 1000,
        remainingCalls: req.accountUsage?.remainingCalls || 999,
      },
    });
  } catch (error) {
    next(error);
  }
}

// 2. POST /api/v1/analyze-progress
export async function analyzeProgressPublic(req, res, next) {
  try {
    const { history } = req.body;

    if (!Array.isArray(history) || history.length < 2) {
      return res.status(400).json({
        status: "error",
        error: "Please provide an array of at least 2 history records: [{ date, weight }]",
      });
    }

    const sortedHistory = [...history].sort((a, b) => new Date(a.date) - new Date(b.date));
    const first = sortedHistory[0];
    const last = sortedHistory[sortedHistory.length - 1];

    const weightChangeKg = Number((last.weight - first.weight).toFixed(2));
    const days = Math.max(1, (new Date(last.date) - new Date(first.date)) / (1000 * 60 * 60 * 24));
    const weeks = days / 7;
    const velocityKgPerWeek = Number((weightChangeKg / weeks).toFixed(2));

    let trend = "Stable";
    if (weightChangeKg < -0.5) trend = "Weight Loss";
    else if (weightChangeKg > 0.5) trend = "Weight Gain";

    res.status(200).json({
      status: "success",
      data: {
        totalRecords: history.length,
        startDate: first.date,
        endDate: last.date,
        durationDays: Math.round(days),
        initialWeightKg: first.weight,
        currentWeightKg: last.weight,
        weightChangeKg,
        velocityKgPerWeek,
        trend,
      },
      meta: {
        tier: req.apiKey.tier,
        accountTotalUsage: req.accountUsage?.totalAccountUsage || 1,
        accountMonthlyQuota: req.accountUsage?.monthlyQuota || 1000,
        remainingCalls: req.accountUsage?.remainingCalls || 999,
      },
    });
  } catch (error) {
    next(error);
  }
}

// 3. POST /api/v1/ideal-weight
export async function idealWeightPublic(req, res, next) {
  try {
    const { heightCm, gender = "male" } = req.body;

    if (!heightCm || heightCm <= 0) {
      return res.status(400).json({
        status: "error",
        error: "Please provide a valid positive 'heightCm'.",
      });
    }

    const inchesOver5Feet = Math.max(0, (heightCm / 2.54) - 60);

    let devineKg = 0;
    let robinsonKg = 0;
    let millerKg = 0;

    if (gender.toLowerCase() === "male") {
      devineKg = 50 + 2.3 * inchesOver5Feet;
      robinsonKg = 52 + 1.9 * inchesOver5Feet;
      millerKg = 56.2 + 1.41 * inchesOver5Feet;
    } else {
      devineKg = 45.5 + 2.3 * inchesOver5Feet;
      robinsonKg = 49 + 1.7 * inchesOver5Feet;
      millerKg = 53.1 + 1.36 * inchesOver5Feet;
    }

    res.status(200).json({
      status: "success",
      data: {
        heightCm: Number(heightCm),
        gender,
        idealBodyWeightKg: {
          devineFormula: Number(devineKg.toFixed(1)),
          robinsonFormula: Number(robinsonKg.toFixed(1)),
          millerFormula: Number(millerKg.toFixed(1)),
          averageKg: Number(((devineKg + robinsonKg + millerKg) / 3).toFixed(1)),
        },
      },
      meta: {
        tier: req.apiKey.tier,
        accountTotalUsage: req.accountUsage?.totalAccountUsage || 1,
        accountMonthlyQuota: req.accountUsage?.monthlyQuota || 1000,
        remainingCalls: req.accountUsage?.remainingCalls || 999,
      },
    });
  } catch (error) {
    next(error);
  }
}
