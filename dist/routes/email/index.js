import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { sendEmail, sendInvitationEmail } from "../../lib/mailer.js";
const app = new Hono();
app.post(
  "/test",
  zValidator(
    "json",
    z.object({
      to: z.string().email(),
      subject: z.string(),
      text: z.string().optional(),
      html: z.string().optional()
    })
  ),
  async (c) => {
    try {
      const { to, subject, text, html } = c.req.valid("json");
      await sendEmail({
        to,
        subject,
        text: text ?? `Test email sent at ${(/* @__PURE__ */ new Date()).toISOString()}`,
        html
      });
      return c.json({
        success: true,
        message: "Email sent successfully"
      });
    } catch (error) {
      console.error("Error sending email:", error);
      return c.json(
        {
          success: false,
          error: "Failed to send email"
        },
        500
      );
    }
  }
);
app.post(
  "/test-invitation",
  zValidator(
    "json",
    z.object({
      to: z.string().email(),
      studentName: z.string(),
      assessmentTitle: z.string(),
      inviteLink: z.string().url(),
      dueDate: z.string().optional()
    })
  ),
  async (c) => {
    try {
      const { to, studentName, assessmentTitle, inviteLink, dueDate } = c.req.valid("json");
      await sendInvitationEmail({
        to,
        studentName,
        assessmentTitle,
        inviteLink,
        dueDate
      });
      return c.json({
        success: true,
        message: "Invitation email sent successfully"
      });
    } catch (error) {
      console.error("Error sending invitation email:", error);
      return c.json(
        {
          success: false,
          error: "Failed to send invitation email"
        },
        500
      );
    }
  }
);
var email_default = app;
export {
  email_default as default
};
