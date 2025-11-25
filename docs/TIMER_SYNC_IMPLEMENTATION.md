# Assessment Timer Synchronization

## Problem

Student assessments need accurate time tracking that cannot be manipulated by adjusting the client's system clock. Without server time synchronization, students could:

- Set their clock back to get more time
- Set their clock forward to see if answers are available
- Experience timer drift between different devices

## Solution

The frontend calculates a **time offset** between the server and client, then uses this offset to adjust all time calculations. This ensures the timer always reflects the true server time, regardless of the client's system clock settings.

## Frontend Implementation (Already Done)

### Changes Made:

1. **Updated Type Definition** (`src/components/student-assessments/hooks.ts`):

```typescript
export interface ActiveResponse {
  status: "active";
  assessment: ActiveAssessment;
  serverTime?: string; // ISO timestamp from server for time synchronization
}
```

2. **Calculate Time Offset** (`src/routes/_student.student.assessment.$id.tsx`):

```typescript
// Calculate server time offset to prevent client-side time manipulation
const serverTimeOffset = data.serverTime
  ? new Date(data.serverTime).getTime() - Date.now()
  : 0;
```

3. **Use Offset in Timer Calculations**:

```typescript
function calculateTimeInfo(
  startTime: string | null,
  durationString: string,
  endDate?: string,
  serverTimeOffset = 0
): { elapsed: string; remaining: string; isOvertime: boolean } {
  // Get current time adjusted for server offset
  const now = new Date(Date.now() + serverTimeOffset);
  // ... rest of calculations use 'now'
}
```

## Backend Implementation Required

### Step 1: Add Server Time to API Response

Update your student assessment endpoint to include the current server time:

```typescript
// In your student assessment endpoint
// Example: server/routes/student/assessments.ts

app.get("/student/assessments/:id", async (c) => {
  // ... your existing logic to get assessment data

  if (assessmentData.status === "active") {
    return c.json({
      status: "active",
      assessment: assessmentData.assessment,
      serverTime: new Date().toISOString(), // Add current server time in UTC
    });
  }

  // ... rest of your endpoint
});
```

### Step 2: Ensure All Timestamps Are in UTC

Make sure all datetime fields in your database and API responses use UTC:

```typescript
// When storing start time
const startTime = new Date().toISOString(); // Always UTC

// When calculating end time
const endTime = new Date(startTime.getTime() + durationMs).toISOString();
```

### Step 3: Server-Side Time Validation

For extra security, validate submission times on the server:

```typescript
app.post("/student/assessments/:id/submit", async (c) => {
  const submission = await c.req.json();
  const serverTime = new Date();

  // Get assessment end time from database
  const assessment = await getAssessment(id);
  const endTime = new Date(assessment.endDate);

  // Reject submissions that are too late (with grace period)
  const gracePeriodMs = 60000; // 1 minute grace period
  if (serverTime.getTime() > endTime.getTime() + gracePeriodMs) {
    return c.json({ error: "Assessment time has expired" }, 403);
  }

  // ... process submission
});
```

## How It Works

1. **Client receives assessment data** with `serverTime: "2025-11-25T10:30:00.000Z"`
2. **Client calculates offset**:
   - Server time: 10:30:00
   - Client time: 10:28:00 (2 minutes behind)
   - Offset: +120000ms (2 minutes)
3. **Timer uses offset**:
   - Every second, calculate: `adjustedNow = Date.now() + offset`
   - This gives server time regardless of client clock
4. **Timer stays accurate** even if student:
   - Changes their system time
   - Switches devices with different time settings
   - Refreshes the page (new offset calculated from fresh serverTime)

## Benefits

- ✅ **Tamper-resistant**: Client clock manipulation has no effect
- ✅ **Consistent**: Same time across all student devices
- ✅ **Simple**: Single timestamp per request, no continuous polling
- ✅ **Accurate**: Millisecond precision
- ✅ **Fair**: All students measured by same clock (server time)

## Testing

To test the implementation:

1. **Change system time**: Set your computer clock forward/backward, timer should remain accurate
2. **Network delay**: Add artificial network delay, timer should sync correctly
3. **Refresh page**: Timer should resume at correct time after refresh
4. **Different timezones**: Test from different timezone settings

## Security Considerations

- Server time is recalculated on each page load/refresh
- Actual time validation happens on server during submission
- Client timer is for UX only; server enforces actual deadlines
- Consider adding periodic server time sync (e.g., every 5 minutes) for long assessments

## Example Test Scenario

```typescript
// Student tries to cheat by setting clock back 1 hour
// Before: Server 10:30, Client 10:30, Offset: 0
// After:  Server 10:30, Client 09:30, Offset: +3600000ms
// Timer shows: 09:30 + 3600000ms = 10:30 (correct server time!)
```
