import nodemailer from "nodemailer";

export type EmailSendInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export type SmsSendInput = {
  to: string;
  body: string;
};

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function envFirst(...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key];
    if (value && value.trim()) return value.trim();
  }
  return undefined;
}

export function isSmtpConfigured(): boolean {
  return Boolean(
    envFirst("SMTP_HOST", "MAIL_HOST") &&
      (envFirst("SMTP_FROM", "MAIL_FROM") || envFirst("SMTP_USER", "MAIL_USER")),
  );
}

export function isTwilioConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID?.trim() &&
      process.env.TWILIO_AUTH_TOKEN?.trim() &&
      (process.env.TWILIO_PHONE_NUMBER?.trim() || process.env.TWILIO_SMS_FROM?.trim()),
  );
}

function toE164(raw: string): string {
  const value = raw.trim();
  if (!value) return "";
  if (value.startsWith("+")) {
    return `+${value.slice(1).replace(/\D/g, "")}`;
  }
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+${digits}`;
}

export async function sendSurveyEmail(input: EmailSendInput): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isSmtpConfigured()) {
    return {
      ok: false,
      message:
        "Email is not configured. Set SMTP_* or MAIL_* variables (HOST/PORT/USER/PASS and FROM).",
    };
  }

  const host = envFirst("SMTP_HOST", "MAIL_HOST")!;
  const port = Number(envFirst("SMTP_PORT", "MAIL_PORT") || "587");
  const secureRaw = envFirst("SMTP_SECURE", "MAIL_SECURE") || "0";
  const secure = secureRaw === "1" || secureRaw.toLowerCase() === "true";
  const user = envFirst("SMTP_USER", "MAIL_USER");
  const pass = envFirst("SMTP_PASS", "MAIL_PASS");
  const from = envFirst("SMTP_FROM", "MAIL_FROM") || user;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
  });

  const text = input.text?.trim() || stripHtml(input.html) || "(no content)";

  try {
    await transporter.sendMail({
      from: from!,
      to: input.to,
      subject: input.subject,
      text,
      html: input.html,
    });
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to send email.";
    return { ok: false, message };
  }
}

export async function sendSurveySms(input: SmsSendInput): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isTwilioConfigured()) {
    return {
      ok: false,
      message:
        "SMS is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER (or TWILIO_SMS_FROM).",
    };
  }

  const sid = process.env.TWILIO_ACCOUNT_SID!.trim();
  const token = process.env.TWILIO_AUTH_TOKEN!.trim();
  const from = toE164(
    process.env.TWILIO_PHONE_NUMBER?.trim() ||
      process.env.TWILIO_SMS_FROM?.trim() ||
      "",
  );
  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  const to = toE164(input.to);

  if (!from || !to || from === "+" || to === "+") {
    return {
      ok: false,
      message: "Invalid phone number format. Use E.164 style, e.g. +15551234567.",
    };
  }

  const body = new URLSearchParams({
    To: to,
    From: from,
    Body: input.body,
  });

  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { ok: false, message: errText.slice(0, 500) || `Twilio HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to send SMS.";
    return { ok: false, message };
  }
}
