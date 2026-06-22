import nodemailer from "nodemailer";
import path from "path";
import config from "../config";

const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: config.email.port === 465,
  auth: {
    user: config.email.user,
    pass: config.email.pass,
  },
});

interface IEmailPayload {
  to: string;
  subject: string;
  html: string;
}

const currentYear = new Date().getFullYear();

const sendEmail = async (payload: IEmailPayload): Promise<void> => {
  const logoPath = path.join(process.cwd(), "src/app/assets/logo.png");

  await transporter.sendMail({
    from: config.email.from,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
    attachments: [
      {
        filename: "logo.png",
        path: logoPath,
        cid: "logo", // same cid value as in the html img src
      },
    ],
  });
};

// Email templates
const TemplateWrapper = (content: string, previewText: string = "") => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Krishi Bari</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #1e293b;
      margin: 0;
      padding: 0;
      background-color: #f8fafc;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    .card {
      background: #ffffff;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02);
      border: 1px solid #e2e8f0;
    }
    .header {
      background-color: #ffffff;
      padding: 40px 32px;
      text-align: center;
      border-bottom: 1px solid #f1f5f9;
    }
    .logo-container {
      display: inline-flex;
      align-items: center;
      text-decoration: none;
    }
    .logo-img {
      height: 36px;
      width: auto;
      margin-right: 12px;
      vertical-align: middle;
    }
    .logo-text {
      font-size: 26px;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: -0.04em;
      margin: 0;
      display: inline-block;
      vertical-align: middle;
    }
    .logo-accent {
      color: #16a34a;
    }
    .content {
      padding: 48px 40px;
    }
    .footer {
      padding: 24px 24px;
      text-align: center;
      color: #94a3b8;
      font-size: 13px;
      background-color: #fdfdfd;
      border-top: 1px solid #f1f5f9;
    }
    .button {
      display: inline-block;
      padding: 16px 32px;
      background-color: #16a34a;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 12px;
      font-weight: 700;
      font-size: 15px;
      margin-top: 24px;
      box-shadow: 0 4px 6px -1px rgba(22, 163, 74, 0.15);
      transition: all 0.2s ease;
    }
    .otp-container {
      background: #f0fdf4;
      padding: 40px;
      border-radius: 16px;
      text-align: center;
      margin: 32px 0;
      border: 1px solid #dcfce7;
    }
    .otp-code {
      font-size: 38px;
      font-weight: 800;
      color: #15803d;
      letter-spacing: 10px;
      margin: 0;
      font-family: 'Inter', monospace;
    }
    .otp-expiry {
      font-size: 14px;
      color: #166534;
      margin-top: 16px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .order-summary {
      background: #f8fafc;
      padding: 32px;
      border-radius: 16px;
      margin: 32px 0;
      border: 1px solid #e2e8f0;
    }
    .order-table {
      width: 100%;
      border-collapse: collapse;
    }
    .order-table th {
      text-align: left;
      padding: 0 0 16px 0;
      border-bottom: 2px solid #e2e8f0;
      color: #64748b;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      font-weight: 700;
    }
    .order-table td {
      padding: 20px 0;
      border-bottom: 1px solid #f1f5f9;
      color: #334155;
      font-size: 15px;
    }
    .total-label {
      font-weight: 700;
      color: #0f172a;
      padding-top: 24px !important;
    }
    .total-value {
      font-weight: 700;
      font-size: 22px;
      color: #16a34a;
      text-align: right;
      padding-top: 24px !important;
    }
    .preview-text {
      display: none;
      font-size: 1px;
      color: #ffffff;
      line-height: 1px;
      max-height: 0px;
      max-width: 0px;
      opacity: 0;
      overflow: hidden;
    }
    @media only screen and (max-width: 600px) {
      .content { padding: 32px 24px; }
      .otp-code { font-size: 36px; letter-spacing: 6px; }
    }
  </style>
</head>
<body>
  <div class="preview-text">${previewText}</div>
  <div class="container">
    <div class="card">
      <div class="header">
        <div class="logo-container">
          <img src="cid:logo" alt="Krishi Bari" class="logo-img">
          <span class="logo-text">Krishi<span class="logo-accent"> Bari</span></span>
        </div>
      </div>
      <div class="content">
        ${content}
      </div>
      <div class="footer">
        <p style="margin-bottom: 6px; color: #64748b; font-weight: 500;">&copy; ${currentYear} Krishi Bari. All rights reserved.</p>
        <p style="margin-top: 0;">Bangladesh's freshest online agricultural marketplace.</p>
      </div>
    </div>
    <div style="text-align: center; padding-top: 24px;">
      <p style="font-size: 12px; color: #c2cbd6ff; font-weight: 400;">
        This is an automated message, please do not reply directly to this email.
      </p>
    </div>
  </div>
</body>
</html>
`;

const otpEmailTemplate = (otp: string, expiresIn: number): string =>
  TemplateWrapper(
    `
  <h1 style="margin: 0 0 16px 0; color: #0f172a; font-size: 24px; font-weight: 700; text-align: center;">Verify your account</h1>
  <p style="text-align: center; color: #475569; font-size: 16px;">Please use the following verification code to complete your registration. This code is valid for a limited time.</p>
  
  <div class="otp-container">
    <p class="otp-code">${otp}</p>
    <p class="otp-expiry">Expires in ${expiresIn} minutes</p>
  </div>

  <p style="color: #64748b; font-size: 14px; text-align: center;">If you didn't request this code, you can safely ignore this email.</p>
`,
    `Your verification code is ${otp}`,
  );

const orderConfirmationTemplate = (
  orderNumber: string,
  total: number,
  items: Array<{ name: string; quantity: number; price: number }>,
): string =>
  TemplateWrapper(
    `
  <div style="text-align: center; margin-bottom: 12px;">
    <h1 style="margin: 0; color: #0f172a; font-size: 28px; font-weight: 700;">Order Confirmed!</h1>
    <p style="color: #64748b; margin-top: 8px;">Thank you for shopping with us. Your order <strong style="color: #0f172a;">#${orderNumber}</strong> is being prepared.</p>
  </div>
  
  <div class="order-summary">
    <h3 style="margin: 0 0 16px 0; font-size: 14px; color: #0f172a; text-transform: uppercase; letter-spacing: 0.05em;">Order Details</h3>
    <table class="order-table">
      <thead>
        <tr>
          <th>Item</th>
          <th style="text-align: center;">Qty</th>
          <th style="text-align: right;">Price</th>
        </tr>
      </thead>
      <tbody>
        ${items
          .map(
            (item) => `
          <tr>
            <td>
              <div style="font-weight: 600; color: #1e293b;">${item.name}</div>
            </td>
            <td style="text-align: center;">${item.quantity}</td>
            <td style="text-align: right;">৳${(
              item.price * item.quantity
            ).toFixed(2)}</td>
          </tr>
        `,
          )
          .join("")}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="2" class="total-label text-right">Total Amount</td>
          <td class="total-value">৳${total.toFixed(2)}</td>
        </tr>
      </tfoot>
    </table>
  </div>

  <div style="text-align: center;">
    <p style="color: #475569; margin-bottom: 24px;">We'll notify you when your order is out for delivery.</p>
  </div>
`,
    `Order #${orderNumber} has been confirmed!`,
  );

const passwordResetTemplate = (otp: string, expiresIn: number): string =>
  TemplateWrapper(
    `
  <h1 style="margin: 0 0 16px 0; color: #0f172a; font-size: 24px; font-weight: 700; text-align: center;">Reset your password</h1>
  <p style="text-align: center; color: #475569; font-size: 16px;">We received a request to reset your password. Use the code below to proceed.</p>
  
  <div class="otp-container">
    <p class="otp-code">${otp}</p>
    <p class="otp-expiry">Valid for ${expiresIn} minutes</p>
  </div>

  <p style="color: #64748b; font-size: 14px; text-align: center;">If you didn't request a password reset, your password will remain unchanged.</p>
`,
    `Password reset code: ${otp}`,
  );

export const emailHelper = {
  sendEmail,
  otpEmailTemplate,
  orderConfirmationTemplate,
  passwordResetTemplate,
};
