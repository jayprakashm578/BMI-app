import crypto from "crypto";
import { ApiKey } from "../models/ApiKey.js";
import { Subscription } from "../models/Subscription.js";
// In-memory sliding window store for shared per-minute rate limiting across all user keys
const rateLimitMap = new Map();

function checkSharedRateLimit(userId, tier) {
  const now = Date.now();
  const oneMinuteAgo = now - 60 * 1000;
  const maxReqPerMin = tier === "pro" ? 100 : tier === "enterprise" ? 1000 : 10;

  let timestamps = rateLimitMap.get(userId.toString()) || [];
  timestamps = timestamps.filter((ts) => ts > oneMinuteAgo);

  if (timestamps.length >= maxReqPerMin) {
    return { allowed: false, maxReqPerMin, current: timestamps.length };
  }

  timestamps.push(now);
  rateLimitMap.set(userId.toString(), timestamps);
  return { allowed: true, maxReqPerMin, current: timestamps.length };
}

export async function validateApiKey(req, res, next) {
  try {
    const rawKey = req.headers["x-api-key"] || req.headers.authorization?.replace("Bearer ", "");

    if (!rawKey) {
      return res.status(401).json({
        status: "error",
        error: "API key missing. Please provide your API key via the 'x-api-key' header or Bearer authorization.",
      });
    }

    const hashedKey = crypto.createHash("sha256").update(rawKey.trim()).digest("hex");
    const keyRecord = await ApiKey.findOne({ keyHash: hashedKey });

    if (!keyRecord || keyRecord.status !== "active") {
      return res.status(401).json({
        status: "error",
        error: "Invalid, suspended, or revoked API key.",
      });
    }

    // Check user subscription status
    const sub = await Subscription.findOne({ userId: keyRecord.userId });
    if (sub && sub.expiryDate && new Date() > new Date(sub.expiryDate) && sub.tier !== "free") {
      return res.status(403).json({
        status: "error",
        error: "Subscription has expired. Please renew your plan on the Developer Portal.",
      });
    }

    const tier = sub ? sub.tier : "free";
    const tierQuota = tier === "pro" ? 50000 : tier === "enterprise" ? 500000 : 1000;

    // 1. Enforce Shared Per-Minute Rate Limit across all user keys
    const rateLimitCheck = checkSharedRateLimit(keyRecord.userId, tier);
    const resetTimeSeconds = Math.max(1, Math.ceil((60 * 1000 - (Date.now() % (60 * 1000))) / 1000));

    res.setHeader("X-RateLimit-Limit", rateLimitCheck.maxReqPerMin);

    if (!rateLimitCheck.allowed) {
      res.setHeader("X-RateLimit-Remaining", 0);
      res.setHeader("X-RateLimit-Reset", resetTimeSeconds);
      res.setHeader("Retry-After", resetTimeSeconds);
      return res.status(429).json({
        status: "error",
        error: `Per-minute rate limit exceeded (${rateLimitCheck.maxReqPerMin} req/min). Rate limits are shared across all keys under your account.`,
        rateLimitPerMin: rateLimitCheck.maxReqPerMin,
        retryAfterSeconds: resetTimeSeconds,
      });
    }

    const remainingPerMin = Math.max(0, rateLimitCheck.maxReqPerMin - rateLimitCheck.current);
    res.setHeader("X-RateLimit-Remaining", remainingPerMin);
    res.setHeader("X-RateLimit-Reset", resetTimeSeconds);

    // Auto-reset monthly usage quota if 30 days have elapsed
    const now = new Date();
    const daysSinceReset = (now - new Date(keyRecord.lastResetDate)) / (1000 * 60 * 60 * 24);
    if (daysSinceReset >= 30) {
      keyRecord.usageCount = 0;
      keyRecord.lastResetDate = now;
    }

    // 2. Enforce Shared Account-Level Monthly Quota across all user keys
    const userKeys = await ApiKey.find({ userId: keyRecord.userId, status: "active" });
    const totalAccountUsage = userKeys.reduce((acc, k) => acc + (k.usageCount || 0), 0);
    const remainingMonthly = Math.max(0, tierQuota - (totalAccountUsage + 1));

    res.setHeader("X-Monthly-Quota-Limit", tierQuota);
    res.setHeader("X-Monthly-Quota-Remaining", remainingMonthly);

    if (totalAccountUsage >= tierQuota) {
      return res.status(429).json({
        status: "error",
        error: `Account monthly API quota (${tierQuota.toLocaleString()} calls) exceeded for your ${tier.toUpperCase()} plan. Upgrade your subscription on the Developer Portal.`,
        totalAccountUsage,
        monthlyQuota: tierQuota,
      });
    }

    // Increment Usage Count on Key
    keyRecord.usageCount += 1;
    await keyRecord.save();

    req.apiKey = keyRecord;
    req.accountUsage = {
      totalAccountUsage: totalAccountUsage + 1,
      monthlyQuota: tierQuota,
      remainingCalls: remainingMonthly,
    };
    next();
  } catch (error) {
    next(error);
  }
}
