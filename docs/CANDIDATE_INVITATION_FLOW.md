# Candidate Invitation Flow

This document outlines the step-by-step process for an admin user to invite candidates to an assessment they have created.

## Overview

The candidate invitation system allows administrators to bulk upload candidate information via CSV and send email invitations containing unique, secure links to access assessments.

## User Flow

### Step 1: Create an Assessment

1. **Navigate to Assessments Page**
   - Go to `/admin/assessments`
   - View existing assessments in a table format

2. **Create New Assessment**
   - Click the "New Assessment" button
   - A new assessment is created with the name "Untitled Assessment"
   - User is automatically redirected to the assessment details page at `/admin/assessment/:id/details`

### Step 2: Configure Assessment Details

1. **Access Settings Tab** (Optional but recommended first)
   - On the assessment details page, navigate to the "Settings" tab
   - Configure assessment properties:
     - Assessment name
     - Duration (in minutes)
     - Scheduled date/time
   - **Important**: Assessment must have a scheduled date/time before invitations can be sent

2. **Add Problems** (Optional)
   - Navigate to the "Problems" tab
   - Add problems to the assessment
   - These will be the questions candidates need to answer

### Step 3: Upload Candidate Information

1. **Navigate to Candidates Tab**
   - Click on the "Candidates" tab in the assessment details page
   - You'll see:
     - An alert box explaining CSV schema requirements
     - A CSV dropzone for uploading candidate data
     - A table to preview candidates (if any exist)

2. **Prepare CSV File**
   - The CSV file **must** contain the following columns:
     - `email`: Candidate's email address (string, required)
     - `full_name`: Candidate's full name (string, required)
     - `matriculation_number`: Candidate's student ID (string, required)
   - Additional columns are allowed but will be ignored
   - Example CSV format:
     ```csv
     email,full_name,matriculation_number
     john.doe@university.edu,John Doe,A0123456X
     jane.smith@university.edu,Jane Smith,A0234567Y
     ```

3. **Upload CSV File**
   - Click or drag-and-drop the CSV file into the dropzone
   - The system will:
     - Parse the CSV file using PapaParse
     - Display candidates in a preview table
     - Show the number of candidates loaded
     - Display all columns from the CSV

4. **Review Uploaded Candidates**
   - Check the preview table to ensure data is correct
   - Verify all required columns are present and populated
   - The table shows:
     - All columns from the CSV
     - Number of candidates
     - Scrollable view for large datasets

### Step 4: Save Candidates (Optional Pre-Save)

1. **Save Without Sending**
   - If you want to save candidates without immediately sending invitations
   - Click the "Save Candidates" button
   - The system will:
     - Validate all candidate data
     - Check for required fields (email, full_name, matriculation_number)
     - Delete any existing candidates for this assessment
     - Insert the new candidates into the database
   - Success notification: "Candidates have been successfully saved"
   - Error handling:
     - If validation fails, you'll see which rows have issues
     - Example: "CSV must contain valid email, full_name columns. Issues found in row(s): 1, 3, 5"

### Step 5: Send Invitations

1. **Trigger Invitation Sending**
   - Click the "Send Invitations" button (with envelope icon)
   - Button states:
     - Disabled if no candidates exist
     - Shows loading spinner while sending
     - Displays number of candidates

2. **Automatic Processing** (if candidates not yet saved)
   - If there are unsaved candidates in the preview:
     - System automatically validates the data first
     - Saves candidates to the database
     - Then proceeds to send invitations
   - If validation fails at this stage, the process stops and shows errors

3. **Backend Processing**
   - For each candidate, the system:
     - Marks the invitation record as `active: true`
     - Generates a unique, signed JWT token containing:
       - Invitation ID
       - Assessment ID
       - Candidate email
       - Candidate full name
       - Candidate matriculation number
     - Sets token expiration (based on assessment scheduled date)
     - Generates a unique invitation URL with the token
     - Sends an email invitation using the configured mailer

4. **Email Content**
   - Candidates receive an email with:
     - Assessment title
     - Due date (if available)
     - Personalized greeting with their name
     - "Start Assessment" button with unique link
     - Plain text fallback link

5. **Success Feedback**
   - Green notification appears: "Invitations Sent!"
   - Shows count: "Successfully sent X invitation email(s)"
   - The preview table clears (if new candidates were uploaded)
   - Existing candidates table updates to show invitation status

### Step 6: Monitor Invitation Status

1. **View Invitation Status**
   - After sending, the candidates table shows:
     - All candidate information
     - An `active` column indicating invitation status
     - A green badge showing: "X invitation(s) sent"
   - Status indicators:
     - `active: true` = Invitation has been sent
     - `active: false` = Saved but not yet sent

2. **Re-send Invitations**
   - You can click "Send Invitations" again to re-send to all candidates
   - This will generate new tokens and send new emails
   - Useful if candidates report they didn't receive the email

## Candidate Experience

### Step 7: Candidate Receives Invitation

1. **Email Receipt**
   - Candidate receives email at the address provided in CSV
   - Email subject: "Invitation: [Assessment Title]"
   - Contains personalized information and unique link

2. **Click Invitation Link**
   - Link format: `https://your-domain.com/invitation/{unique-token}`
   - Token is validated on the backend
   - System verifies:
     - Token signature is valid
     - Token has not expired
     - Invitation is still active

### Step 8: Candidate Accepts Invitation

1. **View Invitation Details**
   - Candidate sees invitation acceptance page at `/invitation/:token`
   - Displays:
     - Assessment title and scheduled date
     - Candidate's personal information (name, email, matriculation number)
     - Terms and conditions

2. **Account Creation/Recognition**
   - Candidate clicks "Accept Invitation"
   - System checks if user already exists by email
   - If new user:
     - Creates new user account with provided information
     - Assigns "student" role
   - If existing user:
     - Links assessment to existing account

3. **Assessment Registration**
   - Creates a `student_assessments` record linking:
     - Student user ID
     - Assessment ID
   - Marks invitation as processed

4. **Redirect to Assessment**
   - After successful acceptance, candidate is redirected to `/student/assessment/:id`
   - Can now view and participate in the assessment

## Technical Details

### Data Flow

```
Admin uploads CSV
    ↓
Frontend parses and validates CSV
    ↓
Frontend sends to: POST /api/assessment_student_invitations (Supabase)
    ↓
Admin clicks "Send Invitations"
    ↓
Frontend calls: POST /api/invitations/send
    ↓
Backend generates JWT tokens for each invitation
    ↓
Backend updates invitation records with tokens and active: true
    ↓
Backend sends emails via configured mailer (Gmail API)
    ↓
Candidate clicks link in email
    ↓
Frontend displays invitation page: GET /api/invitations/:token
    ↓
Candidate accepts invitation: POST /api/invitations/:token/accept
    ↓
Backend creates/updates user account
    ↓
Backend creates student_assessment record
    ↓
Candidate redirected to assessment
```

### Database Tables Involved

1. **assessments**
   - Stores assessment metadata
   - Required field: `date_time_scheduled` (before sending invitations)

2. **assessment_student_invitations**
   - Stores candidate information
   - Fields:
     - `id`: UUID primary key
     - `assessment_id`: Foreign key to assessments
     - `email`: Candidate email
     - `full_name`: Candidate name
     - `matriculation_number`: Student ID
     - `invitation_token`: JWT token (generated on send)
     - `active`: Boolean flag (true after sending)
     - `created_at`, `updated_at`: Timestamps

3. **users**
   - Created/updated when candidate accepts invitation

4. **student_assessments**
   - Links students to assessments they can take

## Validation and Error Handling

### CSV Validation

- **Required fields check**: email, full_name, matriculation_number
- **Type validation**: All required fields must be non-empty strings
- **Error reporting**: 
  - Shows which rows have issues
  - Lists which fields are missing/invalid
  - Limits display to first 5 rows (+ count of additional errors)

### Pre-Send Validation

- Assessment must have a scheduled date/time
- At least one candidate must exist
- All candidate records must pass schema validation

### Email Sending

- Uses Promise.allSettled to handle partial failures
- Reports:
  - Number of successful sends
  - Number of failed sends
  - Error messages for failures
- Successful partial sends still save progress

### Token Security

- JWT tokens signed with server secret
- Expiration based on assessment schedule
- One-time use recommended (though not enforced)
- Tokens contain all necessary invitation data

## Best Practices

1. **Before Uploading Candidates**:
   - Ensure assessment has a name, duration, and scheduled date/time
   - Add problems to the assessment
   - Verify CSV file matches required schema

2. **CSV Preparation**:
   - Use consistent formatting
   - Verify email addresses are valid
   - Check for duplicate entries
   - Test with a small batch first

3. **After Sending Invitations**:
   - Monitor for bounce-backs or email delivery issues
   - Keep CSV file as backup
   - Be prepared to re-send if needed

4. **Timing**:
   - Send invitations with adequate lead time
   - Consider time zones if candidates are distributed
   - Token expiration is tied to assessment date

## Related Files

- **Frontend Component**: `src/components/assessments/details/candidates-tab.tsx`
- **Frontend Hooks**: `src/components/assessments/hooks.ts`
- **Backend Routes**: `server/routes/invitations/index.ts`
- **Email Templates**: `server/lib/mailer.ts`
- **Database Schema**: `server/drizzle/assessment_student_invitations.ts`
- **Invitation JWT**: `server/lib/invitation-jwt.ts`
- **Invitation UI**: `src/components/invitation/invitation-accept.tsx`
