# Gmail SMTP Setup Guide

This guide will help you set up Gmail SMTP for sending emails in production.

## Prerequisites

- A Gmail account to send emails from
- Two-factor authentication enabled on your Google account (required for app passwords)

## Step 1: Enable 2-Factor Authentication

If you haven't already enabled 2FA on your Google account:

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Under "How you sign in to Google", click **2-Step Verification**
3. Follow the steps to set up 2-Step Verification

## Step 2: Generate App Password

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Under "How you sign in to Google", click **2-Step Verification**
3. Scroll to the bottom and click **App passwords**
4. You may need to sign in again
5. In the "Select app" dropdown, choose **Mail**
6. In the "Select device" dropdown, choose **Other (Custom name)**
7. Enter "QueryProctor" as the name
8. Click **Generate**
9. Google will display a 16-character password - **copy this immediately** (you won't be able to see it again)

## Step 3: Update Environment Variables

Add the following environment variables to your `.env.production` file:

```env
# Gmail SMTP Configuration (Production)
GMAIL_USER=your-gmail-address@gmail.com
GMAIL_APP_PASSWORD=your-16-character-app-password

# Node Environment
NODE_ENV=production
```

### Example Configuration

```env
GMAIL_USER=noreply@queryproctor.com
GMAIL_APP_PASSWORD=abcd efgh ijkl mnop  # 16 characters with spaces (or without)

NODE_ENV=production
```

⚠️ **Important Notes:**

- The app password is 16 characters and may include spaces (spaces are optional when entering)
- Never commit these credentials to version control
- For security, these values should be stored as environment variables or secrets in your deployment platform
- If you lose the app password, delete it and generate a new one

## Step 4: Test the Setup

In development, the app will continue to use nodemailer with Mailpit.

To test Gmail SMTP in production:

1. Set `NODE_ENV=production` in your environment
2. Ensure `GMAIL_USER` and `GMAIL_APP_PASSWORD` are set
3. Try sending an email through your application

## Troubleshooting

### "Invalid login" or "Username and Password not accepted" error

- Double-check your Gmail address is correct
- Ensure you're using the app password, not your regular Gmail password
- Make sure 2-Factor Authentication is enabled on your account
- Try regenerating the app password

### "Less secure app access" error

- This shouldn't happen with app passwords
- Make sure you're using an app password, not your regular password

### Emails going to spam

- Add SPF and DKIM records to your domain (if using a custom domain)
- For Gmail addresses, this is handled automatically
- Consider warming up your sending reputation by sending gradually increasing volumes

### Rate limiting

- Gmail has sending limits: 500 emails/day for regular accounts, 2000/day for Google Workspace
- Consider implementing rate limiting in your application
- For higher volumes, consider using a dedicated email service (SendGrid, AWS SES, etc.)

## How It Works

- **Development**: Uses nodemailer with Mailpit (local SMTP server at 127.0.0.1:1025)
- **Production**: Uses nodemailer with Gmail SMTP (smtp.gmail.com:587)
- The switching is automatic based on `NODE_ENV`

The implementation uses the same nodemailer interface for both environments, so no changes are needed in other parts of the codebase.

## Gmail SMTP Settings Reference

- **Host**: smtp.gmail.com
- **Port**: 587 (TLS/STARTTLS) or 465 (SSL)
- **Security**: STARTTLS
- **Authentication**: Your Gmail address and App Password
