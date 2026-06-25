import config from "../../config";
import { emailHelper } from "../../helper/emailHelper";

type ContactPayload = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

const entity = (name: string) => `${String.fromCharCode(38)}${name};`;

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      "&": entity("amp"),
      "<": entity("lt"),
      ">": entity("gt"),
      '"': entity("quot"),
      "'": entity("#039"),
    };
    return entities[char] || char;
  });

const contactEmailTemplate = (payload: ContactPayload) => `
  <div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 18px; overflow: hidden;">
    <div style="background: #16a34a; color: #ffffff; padding: 24px 28px;">
      <p style="margin: 0; font-size: 12px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; opacity: .85;">Krishi Bari Contact Form</p>
      <h1 style="margin: 8px 0 0; font-size: 24px; line-height: 1.25;">${escapeHtml(payload.subject)}</h1>
    </div>
    <div style="padding: 28px;">
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <tr>
          <td style="padding: 10px 0; color: #64748b; font-size: 13px; font-weight: 700; width: 110px;">Name</td>
          <td style="padding: 10px 0; color: #0f172a; font-size: 15px; font-weight: 700;">${escapeHtml(payload.name)}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #64748b; font-size: 13px; font-weight: 700;">Email</td>
          <td style="padding: 10px 0; color: #0f172a; font-size: 15px;"><a href="mailto:${escapeHtml(payload.email)}" style="color: #16a34a;">${escapeHtml(payload.email)}</a></td>
        </tr>
      </table>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 20px; color: #334155; font-size: 15px; line-height: 1.7; white-space: pre-wrap;">${escapeHtml(payload.message)}</div>
    </div>
  </div>
`;

const submitContact = async (payload: ContactPayload) => {
  const normalizedPayload = {
    name: payload.name.trim(),
    email: payload.email.trim().toLowerCase(),
    subject: payload.subject.trim(),
    message: payload.message.trim(),
  };

  await emailHelper.sendEmail({
    to: config.email.contactTo,
    subject: `Contact Form: ${normalizedPayload.subject}`,
    html: contactEmailTemplate(normalizedPayload),
  });

  return { delivered: true };
};

export const ContactService = { submitContact };
