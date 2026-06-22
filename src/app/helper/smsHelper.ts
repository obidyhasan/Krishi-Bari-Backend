/**
 * Placeholder for SMS Gateway integration (e.g., Twilio, local BD providers).
 * SRD 2.2 (117), 4.11 (307).
 */
const sendSMS = async (to: string, message: string) => {
  const maskedPhone = to.length > 4 ? `${"*".repeat(to.length - 4)}${to.slice(-4)}` : "***";
  console.log(`[SMS SENDER] Sending SMS to ${maskedPhone}`);
  
  // Example Twilio Implementation:
  /*
  const client = require('twilio')(config.sms.sid, config.sms.auth_token);
  await client.messages.create({
     body: message,
     from: config.sms.from_number,
     to: to
   });
  */

  return { success: true, message: "SMS sent successfully (simulated)." };
};

const sendOtpSms = async (phone: string, otp: string) => {
  const message = `Your Krishi Bari OTP is ${otp}. Valid for 5 minutes.`;
  return sendSMS(phone, message);
};

const sendOrderConfirmationSms = async (phone: string, orderNumber: string) => {
  const message = `Order confirmed! Your order #${orderNumber} is being prepared. Thank you for shopping with Krishi Bari.`;
  return sendSMS(phone, message);
};

const sendDeliverySms = async (phone: string, orderNumber: string) => {
  const message = `Your order #${orderNumber} is out for delivery. Our agent will contact you soon.`;
  return sendSMS(phone, message);
};

export const smsHelper = {
  sendSMS,
  sendOtpSms,
  sendOrderConfirmationSms,
  sendDeliverySms,
};
