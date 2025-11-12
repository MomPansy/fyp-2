import nodemailer from "nodemailer";
import type { Transporter, SentMessageInfo } from "nodemailer";
import { appEnvVariables } from "../env.ts";

let transporter: Transporter | null = null;
let gmailTransporter: Transporter | null = null;

/**
 * Get or create the email transporter for development
 */
export function getMailTransporter(): Transporter {
  transporter ??= nodemailer.createTransport({
    host: appEnvVariables.SMTP_HOST,
    port: appEnvVariables.SMTP_PORT,
    secure: false, // true for 465, false for other ports
    auth:
      appEnvVariables.SMTP_USER && appEnvVariables.SMTP_PASS
        ? {
            user: appEnvVariables.SMTP_USER,
            pass: appEnvVariables.SMTP_PASS,
          }
        : undefined,
    // For development with Mailpit, accept any cert
    tls: {
      rejectUnauthorized: false,
    },
  });

  return transporter;
}

/**
 * Get or create the Gmail SMTP transporter for production
 */
export function getGmailTransporter(): Transporter {
  gmailTransporter ??= nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // use STARTTLS
    auth: {
      user: appEnvVariables.GMAIL_USER,
      pass: appEnvVariables.GMAIL_APP_PASSWORD,
    },
  });

  return gmailTransporter;
}

/**
 * Send an email
 * Uses Gmail SMTP in production, local SMTP in development
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  from,
}: {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
}): Promise<SentMessageInfo> {
  const isProduction = appEnvVariables.NODE_ENV === "production";

  // Select transporter based on environment
  const transporter = isProduction
    ? getGmailTransporter()
    : getMailTransporter();

  const fromAddress = isProduction
    ? (from ??
      appEnvVariables.GMAIL_USER ??
      '"QueryProctor" <noreply@queryproctor.com>')
    : (from ??
      appEnvVariables.SMTP_FROM ??
      '"QueryProctor" <noreply@queryproctor.com>');

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const info = await transporter.sendMail({
    from: fromAddress,
    to: Array.isArray(to) ? to.join(", ") : to,
    subject,
    text,
    html,
  });

  console.info(
    "Message sent: %s",
    String((info as { messageId?: string }).messageId ?? "unknown"),
  );
  return info;
}

/**
 * Send an invitation email to a student
 */
export async function sendInvitationEmail({
  to,
  studentName,
  assessmentTitle,
  inviteLink,
  dueDate,
}: {
  to: string;
  studentName: string;
  assessmentTitle: string;
  inviteLink: string;
  dueDate?: string;
}): Promise<SentMessageInfo> {
  const subject = `Invitation: ${assessmentTitle}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background-color: #f9f9f9;
            border-radius: 8px;
            padding: 30px;
            margin: 20px 0;
          }
          .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #228be6;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
            font-weight: 500;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            font-size: 12px;
            color: #666;
          }
          h1 {
            color: #228be6;
            margin-bottom: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Assessment Invitation</h1>
          <p>Hello ${studentName},</p>
          <p>You have been invited to participate in the following assessment:</p>
          <p><strong>${assessmentTitle}</strong></p>
          ${dueDate ? `<p><strong>Due Date:</strong> ${dueDate}</p>` : ""}
          <p>Click the button below to access your assessment:</p>
          <a href="${inviteLink}" class="button">Start Assessment</a>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #228be6;">${inviteLink}</p>
          <div class="footer">
            <p>This is an automated message from QueryProctor. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
Hello ${studentName},

You have been invited to participate in the following assessment:

${assessmentTitle}
${dueDate ? `Due Date: ${dueDate}` : ""}

Access your assessment at: ${inviteLink}

---
This is an automated message from QueryProctor. Please do not reply to this email.
  `;

  return sendEmail({
    to,
    subject,
    html,
    text,
  });
}
