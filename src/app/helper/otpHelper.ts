import crypto from "crypto";
import config from "../config";
import { getRedis } from "../shared/redis";
import { prisma } from "../shared/prisma";

type OtpPurpose = "verify" | "reset" | "admin2fa";

const generateOtp = (): string => {
  return crypto.randomInt(100000, 999999).toString();
};

const hashOtp = (otp: string) => {
  const key = config.jwt.access_secret || "krishibari";
  return crypto.createHash("sha256").update(`${otp}:${key}`).digest("hex");
};

const getOtpKey = (purpose: OtpPurpose, identifier: string) =>
  `otp:${purpose}:${identifier.toLowerCase()}`;

const getFallbackIdentifier = (purpose: OtpPurpose, identifier: string) =>
  `otp:${purpose}:${identifier.toLowerCase()}`;

const saveOtp = async (
  identifier: string,
  purpose: OtpPurpose = "verify"
): Promise<string> => {
  const otp = generateOtp();
  const otpHash = hashOtp(otp);
  const ttlMs = config.otp_expires_in * 60 * 1000;
  const expiresAt = new Date(Date.now() + ttlMs);

  const redis = getRedis();
  if (redis) {
    try {
      const key = getOtpKey(purpose, identifier);
      await redis.set(key, otpHash, "PX", ttlMs);
      return otp;
    } catch {
      // Fall back to DB-backed OTP so signup/verification can continue.
    }
  }

  await prisma.otpVerification.create({
    data: {
      email: getFallbackIdentifier(purpose, identifier),
      otp: otpHash,
      expiresAt,
    },
  });

  return otp;
};

const verifyOtp = async (
  otp: string,
  identifier: string,
  purpose: OtpPurpose = "verify"
): Promise<boolean> => {
  const otpHash = hashOtp(otp);
  const redis = getRedis();
  if (redis) {
    try {
      const key = getOtpKey(purpose, identifier);
      const storedHash = await redis.get(key);
      if (!storedHash || storedHash !== otpHash) return false;
      await redis.del(key);
      return true;
    } catch {
      // Fall through to DB-backed fallback.
    }
  }

  const token = await prisma.otpVerification.findFirst({
    where: {
      email: getFallbackIdentifier(purpose, identifier),
      isUsed: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!token || token.otp !== otpHash) return false;

  await prisma.otpVerification.update({
    where: { id: token.id },
    data: { isUsed: true },
  });

  return true;
};

export const otpHelper = {
  generateOtp,
  saveOtp,
  verifyOtp,
};
