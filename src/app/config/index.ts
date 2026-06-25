import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });

export default {
  node_env: process.env.NODE_ENV || "development",
  port: process.env.PORT || 5000,
  database_url: process.env.DATABASE_URL,
  // Comma-separated list of allowed frontend origins (for CORS + CSRF Origin checks).
  // Example: FRONTEND_URL="https://app.example.com,https://admin.example.com"
  frontend_url: process.env.FRONTEND_URL || "http://localhost:3000",
  frontend_urls: (process.env.FRONTEND_URL || "http://localhost:3000")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),

  jwt: {
    access_secret: process.env.JWT_ACCESS_SECRET as string,
    access_expires_in: process.env.JWT_ACCESS_EXPIRES_IN || "1d",
    refresh_secret: process.env.JWT_REFRESH_SECRET as string,
    refresh_expires_in: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
  },

  bcrypt_salt_rounds: Number(process.env.BCRYPT_SALT_ROUNDS) || 12,

  cloudinary: {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME as string,
    api_key: process.env.CLOUDINARY_API_KEY as string,
    api_secret: process.env.CLOUDINARY_API_SECRET as string,
  },

  email: {
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: Number(process.env.EMAIL_PORT) || 587,
    user: process.env.EMAIL_USER as string,
    pass: process.env.EMAIL_PASS as string,
    from: process.env.EMAIL_FROM || "Krishi Bari <noreply@krishibari.com>",
    contactTo:
      process.env.CONTACT_EMAIL ||
      process.env.EMAIL_FROM ||
      "support@krishibari.com",
  },

  bkash: {
    app_key: process.env.BKASH_APP_KEY as string,
    app_secret: process.env.BKASH_APP_SECRET as string,
    username: process.env.BKASH_USERNAME as string,
    password: process.env.BKASH_PASSWORD as string,
    grant_token_url: process.env.BKASH_GRANT_TOKEN_URL as string,
    payment_create_url: process.env.BKASH_PAYMENT_CREATE_URL as string,
    payment_execute_url: process.env.BKASH_PAYMENT_EXECUTE_URL as string,
    payment_query_url: process.env.BKASH_PAYMENT_QUERY_URL as string,
    callback_token: process.env.BKASH_CALLBACK_TOKEN || "",
    callback_hmac_secret: process.env.BKASH_CALLBACK_HMAC_SECRET || "",
  },

  backend_url: process.env.BACKEND_URL || "http://localhost:5000",
  meta: {
    pixel_id: process.env.META_PIXEL_ID || "",
    capi_access_token: process.env.META_CAPI_ACCESS_TOKEN || "",
    test_event_code: process.env.META_TEST_EVENT_CODE || "",
  },
  redis_url: process.env.REDIS_URL || undefined,
  otp_expires_in: Number(process.env.OTP_EXPIRES_IN) || 5, // minutes
};
