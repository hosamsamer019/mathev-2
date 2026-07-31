/**
 * Email Service — Supports:
 *   - nodemailer with real SMTP (production)
 *   - SendGrid HTTP API (alternative)
 *   - Console fallback in development (no credentials needed)
 *
 * Activated by: SMTP_HOST or SENDGRID_API_KEY in environment
 */
import dotenv from 'dotenv';
import { logger } from '@shared/utils';
dotenv.config();

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

async function sendWithSMTP(opts: EmailOptions): Promise<void> {
  const nodemailer = await import('nodemailer');
  const transport = nodemailer.default.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  await transport.sendMail({
    from: process.env.SMTP_FROM || `"Smart Math Platform" <noreply@smartmath.app>`,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
}

async function sendWithSendGrid(opts: EmailOptions): Promise<void> {
  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: opts.to }] }],
      from: { email: process.env.SENDGRID_FROM || 'noreply@smartmath.app' },
      subject: opts.subject,
      content: [{ type: 'text/html', value: opts.html }],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`SendGrid error ${res.status}: ${body}`);
  }
}

export async function sendEmail(opts: EmailOptions): Promise<void> {
  const hasSMTP = !!process.env.SMTP_HOST;
  const hasSendGrid = !!process.env.SENDGRID_API_KEY;

  if (hasSMTP) {
    await sendWithSMTP(opts);
    logger.info(`[Email] Sent via SMTP → ${opts.to}`);
  } else if (hasSendGrid) {
    await sendWithSendGrid(opts);
    logger.info(`[Email] Sent via SendGrid → ${opts.to}`);
  } else {
    // Dev fallback: print to console, never throw
    logger.info(`[Email DEV FALLBACK - Not Actually Sent]`, { to: opts.to, subject: opts.subject });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Template builders
// ─────────────────────────────────────────────────────────────────────────────
export function buildPasswordResetEmail(name: string, resetUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="font-family:sans-serif;background:#f4f6f9;padding:40px;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:40px;box-shadow:0 2px 12px rgba(0,0,0,.08)">
    <h2 style="color:#1a1a2e;margin-bottom:8px">إعادة تعيين كلمة المرور</h2>
    <p style="color:#555">مرحباً ${name}،</p>
    <p style="color:#555">طلبت إعادة تعيين كلمة المرور. انقر على الزر أدناه لتعيين كلمة مرور جديدة:</p>
    <a href="${resetUrl}" style="display:inline-block;background:#6c63ff;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin:20px 0">
      إعادة تعيين كلمة المرور
    </a>
    <p style="color:#888;font-size:13px">هذا الرابط صالح لمدة <strong>1 ساعة</strong> فقط.</p>
    <p style="color:#888;font-size:13px">إذا لم تطلب هذا، يمكنك تجاهل هذا البريد الإلكتروني بأمان.</p>
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
    <p style="color:#bbb;font-size:12px;text-align:center">Smart Math Platform</p>
  </div>
</body>
</html>`;
}

export function buildVerificationEmail(name: string, verifyUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="font-family:sans-serif;background:#f4f6f9;padding:40px;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:40px;box-shadow:0 2px 12px rgba(0,0,0,.08)">
    <h2 style="color:#1a1a2e;margin-bottom:8px">تأكيد البريد الإلكتروني</h2>
    <p style="color:#555">مرحباً ${name}،</p>
    <p style="color:#555">شكراً لتسجيلك! يرجى تأكيد بريدك الإلكتروني بالنقر على الزر أدناه:</p>
    <a href="${verifyUrl}" style="display:inline-block;background:#4ade80;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin:20px 0">
      تأكيد البريد الإلكتروني
    </a>
    <p style="color:#888;font-size:13px">هذا الرابط صالح لمدة <strong>24 ساعة</strong>.</p>
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
    <p style="color:#bbb;font-size:12px;text-align:center">Smart Math Platform</p>
  </div>
</body>
</html>`;
}
