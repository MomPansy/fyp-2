import nodemailer from "nodemailer";
import { appEnvVariables } from "../env.js";
let transporter = null;
let gmailTransporter = null;
function getMailTransporter() {
  transporter ??= nodemailer.createTransport({
    host: appEnvVariables.SMTP_HOST,
    port: appEnvVariables.SMTP_PORT,
    secure: false,
    // true for 465, false for other ports
    auth: appEnvVariables.SMTP_USER && appEnvVariables.SMTP_PASS ? {
      user: appEnvVariables.SMTP_USER,
      pass: appEnvVariables.SMTP_PASS
    } : void 0,
    // For development with Mailpit, accept any cert
    tls: {
      rejectUnauthorized: false
    }
  });
  return transporter;
}
function getGmailTransporter() {
  gmailTransporter ??= nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    // use STARTTLS
    auth: {
      user: appEnvVariables.GMAIL_USER,
      pass: appEnvVariables.GMAIL_APP_PASSWORD
    }
  });
  return gmailTransporter;
}
async function sendEmail({
  to,
  subject,
  html,
  text,
  from
}) {
  const isProduction = appEnvVariables.NODE_ENV === "production";
  const transporter2 = isProduction ? getGmailTransporter() : getMailTransporter();
  const fromAddress = isProduction ? from ?? appEnvVariables.GMAIL_USER ?? '"QueryProctor" <noreply@queryproctor.com>' : from ?? appEnvVariables.SMTP_FROM ?? '"QueryProctor" <noreply@queryproctor.com>';
  const info = await transporter2.sendMail({
    from: fromAddress,
    to: Array.isArray(to) ? to.join(", ") : to,
    subject,
    text,
    html
  });
  console.info(
    "Message sent: %s",
    String(info.messageId ?? "unknown")
  );
  return info;
}
async function sendInvitationEmail({
  to,
  studentName,
  assessmentTitle,
  inviteLink,
  dueDate
}) {
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
    text
  });
}
export {
  getGmailTransporter,
  getMailTransporter,
  sendEmail,
  sendInvitationEmail
};
