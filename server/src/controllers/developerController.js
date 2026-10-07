import crypto from "crypto";
import mongoose from "mongoose";
import { ApiKey } from "../models/ApiKey.js";
import { Subscription } from "../models/Subscription.js";

// Helper: Get quota based on tier
function getQuotaForTier(tier) {
  switch (tier) {
    case "pro":
      return 50000;
    case "enterprise":
      return 500000;
    case "free":
    default:
      return 1000;
  }
}

// Helper: Calculate Expiry Date based on billing cycle
function calculateExpiry(billingCycle) {
  const now = new Date();
  switch (billingCycle) {
    case "3_months":
      return new Date(now.setMonth(now.getMonth() + 3));
    case "6_months":
      return new Date(now.setMonth(now.getMonth() + 6));
    case "1_year":
      return new Date(now.setFullYear(now.getFullYear() + 1));
    case "1_month":
    default:
      return new Date(now.setMonth(now.getMonth() + 1));
  }
}

// GET /api/developer/overview
export async function getDeveloperOverview(req, res, next) {
  try {
    const userId = req.user._id;

    // Get or create subscription record
    let sub = await Subscription.findOne({ userId });
    if (!sub) {
      const defaultExpiry = new Date();
      defaultExpiry.setFullYear(defaultExpiry.getFullYear() + 10); // Free tier 10 years

      sub = await Subscription.create({
        userId,
        tier: "free",
        billingCycle: "1_month",
        pricePaid: 0,
        expiryDate: defaultExpiry,
        status: "active",
      });
    }

    // Check if subscription expired
    if (sub.expiryDate && new Date() > new Date(sub.expiryDate) && sub.tier !== "free") {
      sub.status = "expired";
      await sub.save();
    }

    // Fetch user API keys
    const keys = await ApiKey.find({ userId }).select("-keyHash").sort({ createdAt: -1 });

    const totalUsage = keys.reduce((acc, k) => acc + (k.usageCount || 0), 0);
    const accountQuota = getQuotaForTier(sub.tier);

    res.status(200).json({
      status: "success",
      subscription: {
        tier: sub.tier,
        billingCycle: sub.billingCycle,
        startDate: sub.startDate,
        expiryDate: sub.expiryDate,
        autoRenew: sub.autoRenew,
        status: sub.status,
        daysRemaining: sub.expiryDate
          ? Math.max(0, Math.ceil((new Date(sub.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)))
          : null,
      },
      keys: keys.map((k) => ({
        id: k._id,
        name: k.name,
        keyPrefix: k.keyPrefix,
        status: k.status,
        tier: k.tier,
        monthlyQuota: k.monthlyQuota,
        usageCount: k.usageCount,
        lastResetDate: k.lastResetDate,
        createdAt: k.createdAt,
      })),
      stats: {
        totalKeys: keys.length,
        totalUsage,
        totalQuota: accountQuota,
      },
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/developer/keys
export async function createApiKey(req, res, next) {
  try {
    const userId = req.user._id;
    const { name } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: "API key name is required." });
    }

    // Fetch user subscription tier
    const sub = await Subscription.findOne({ userId });
    const tier = sub ? sub.tier : "free";
    const quota = getQuotaForTier(tier);

    // Strictly limit free tier to 1 active key
    const activeKeyCount = await ApiKey.countDocuments({ userId, status: "active" });
    if (tier === "free" && activeKeyCount >= 1) {
      return res.status(400).json({
        error: "Free tier accounts are strictly limited to 1 active API key. Please revoke your existing key or upgrade to Pro for additional keys.",
      });
    }

    if (tier === "pro" && activeKeyCount >= 5) {
      return res.status(400).json({
        error: "Pro tier accounts are limited to 5 active API keys. Please revoke an existing key or upgrade to Enterprise.",
      });
    }

    // Generate secure random API key: bmi_live_sk_...
    const randomBytes = crypto.randomBytes(24).toString("hex");
    const rawKey = `bmi_live_sk_${randomBytes}`;
    const keyPrefix = rawKey.substring(0, 16) + "...";
    const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

    const newKey = await ApiKey.create({
      userId,
      name: name.trim(),
      keyHash,
      keyPrefix,
      status: "active",
      tier,
      monthlyQuota: quota,
      usageCount: 0,
      lastResetDate: new Date(),
    });

    res.status(201).json({
      message: "API key generated successfully. Copy it now, as it will NOT be shown again!",
      apiKey: rawKey,
      keyRecord: {
        id: newKey._id,
        name: newKey.name,
        keyPrefix: newKey.keyPrefix,
        status: newKey.status,
        tier: newKey.tier,
        monthlyQuota: newKey.monthlyQuota,
        createdAt: newKey.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/developer/keys/:id/revoke
export async function revokeApiKey(req, res, next) {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid API key ID format." });
    }

    const keyRecord = await ApiKey.findOne({ _id: id, userId });
    if (!keyRecord) {
      return res.status(404).json({ error: "API key not found." });
    }

    keyRecord.status = "revoked";
    await keyRecord.save();

    res.status(200).json({
      message: "API key revoked successfully.",
      keyId: id,
    });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/developer/keys/:id/rotate
export async function rotateApiKey(req, res, next) {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid API key ID format." });
    }

    const keyRecord = await ApiKey.findOne({ _id: id, userId });
    if (!keyRecord) {
      return res.status(404).json({ error: "API key not found." });
    }

    if (keyRecord.status !== "active") {
      return res.status(400).json({ error: "Cannot rotate a revoked or suspended API key." });
    }

    // Generate a new secure random secret key: bmi_live_sk_...
    const randomBytes = crypto.randomBytes(24).toString("hex");
    const rawKey = `bmi_live_sk_${randomBytes}`;
    const keyPrefix = rawKey.substring(0, 16) + "...";
    const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

    keyRecord.keyHash = keyHash;
    keyRecord.keyPrefix = keyPrefix;
    if (!keyRecord.name) keyRecord.name = "API Key";
    await keyRecord.save();

    res.status(200).json({
      message: "API key secret rotated successfully! Copy your new secret now, as it will NOT be shown again.",
      apiKey: rawKey,
      keyRecord: {
        id: keyRecord._id.toString(),
        name: keyRecord.name,
        keyPrefix: keyRecord.keyPrefix,
        status: keyRecord.status,
        tier: keyRecord.tier,
        monthlyQuota: keyRecord.monthlyQuota,
        createdAt: keyRecord.createdAt,
      },
    });
  } catch (error) {
    console.error("Error in rotateApiKey:", error);
    res.status(500).json({ error: error.message || "Failed to rotate API key secret." });
  }
}

// POST /api/developer/subscribe
export async function subscribePlan(req, res, next) {
  try {
    const userId = req.user._id;
    const { tier = "free", billingCycle = "1_month" } = req.body;

    const validTiers = ["free", "pro", "enterprise"];
    const validCycles = ["1_month", "3_months", "6_months", "1_year"];

    if (!validTiers.includes(tier) || !validCycles.includes(billingCycle)) {
      return res.status(400).json({ error: "Invalid tier or billing cycle selection." });
    }

    const expiryDate = calculateExpiry(billingCycle);
    const newQuota = getQuotaForTier(tier);

    let pricePaid = 0;
    if (tier === "pro") {
      if (billingCycle === "1_month") pricePaid = 29;
      else if (billingCycle === "3_months") pricePaid = 78;
      else if (billingCycle === "6_months") pricePaid = 139;
      else if (billingCycle === "1_year") pricePaid = 243;
    } else if (tier === "enterprise") {
      if (billingCycle === "1_month") pricePaid = 99;
      else if (billingCycle === "3_months") pricePaid = 267;
      else if (billingCycle === "6_months") pricePaid = 475;
      else if (billingCycle === "1_year") pricePaid = 831;
    }

    // Require payment confirmation for paid tiers
    if ((tier === "pro" || tier === "enterprise") && !req.body.paymentConfirmed) {
      return res.status(402).json({
        requiresPayment: true,
        tier,
        billingCycle,
        pricePaid,
        message: `Payment of $${pricePaid} required to activate ${tier.toUpperCase()} plan.`,
      });
    }

    let sub = await Subscription.findOne({ userId });
    if (!sub) {
      sub = new Subscription({ userId });
    }

    sub.tier = tier;
    sub.billingCycle = billingCycle;
    sub.pricePaid = pricePaid;
    sub.startDate = new Date();
    sub.expiryDate = expiryDate;
    sub.status = "active";
    await sub.save();

    // Update quota and tier for all active API keys owned by user
    await ApiKey.updateMany(
      { userId, status: "active" },
      { $set: { tier, monthlyQuota: newQuota } }
    );

    res.status(200).json({
      message: `Subscription successfully updated to ${tier.toUpperCase()} (${billingCycle.replace("_", " ")})!`,
      subscription: {
        tier: sub.tier,
        billingCycle: sub.billingCycle,
        expiryDate: sub.expiryDate,
        pricePaid: sub.pricePaid,
        daysRemaining: Math.ceil((new Date(sub.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)),
      },
    });
  } catch (error) {
    next(error);
  }
}
