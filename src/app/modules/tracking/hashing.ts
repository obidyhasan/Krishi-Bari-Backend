import crypto from "crypto";
import type { HashedUserData, RawUserData } from "./tracking.types";

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function normalizeAndHash(
  value: string | undefined,
  normalizer?: (input: string) => string,
): string | undefined {
  if (!value) return undefined;
  const normalized = normalizer ? normalizer(value) : value.trim().toLowerCase();
  if (!normalized) return undefined;
  return sha256(normalized);
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z]/g, "");
}

export async function hashUserData(raw: RawUserData): Promise<HashedUserData> {
  return {
    em: normalizeAndHash(raw.email, normalizeEmail),
    ph: normalizeAndHash(raw.phone, normalizePhone),
    fn: normalizeAndHash(raw.firstName, normalizeName),
    ln: normalizeAndHash(raw.lastName, normalizeName),
    ct: normalizeAndHash(raw.city, (v) => v.trim().toLowerCase().replace(/\s/g, "")),
    st: normalizeAndHash(raw.state, (v) => v.trim().toLowerCase()),
    zp: normalizeAndHash(raw.zip, (v) => v.trim().replace(/\s/g, "")),
    country: normalizeAndHash(raw.country, (v) => v.trim().toLowerCase()),
    external_id: raw.externalId ? sha256(raw.externalId) : undefined,
    client_ip_address: raw.ip,
    client_user_agent: raw.userAgent,
  };
}

export function purchaseEventId(orderId: string): string {
  return crypto
    .createHash("sha256")
    .update(`Purchase:${orderId}`)
    .digest("hex")
    .substring(0, 36);
}
