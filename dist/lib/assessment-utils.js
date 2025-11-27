function calculateAssessmentEndDate(scheduledDate, durationMinutes) {
  if (!scheduledDate) return null;
  const scheduled = typeof scheduledDate === "string" ? new Date(scheduledDate) : scheduledDate;
  const duration = typeof durationMinutes === "string" ? Number(durationMinutes) : durationMinutes;
  return new Date(scheduled.getTime() + duration * 60 * 1e3);
}
function getAssessmentTimingStatus(scheduledDate, durationMinutes, now = /* @__PURE__ */ new Date()) {
  if (!scheduledDate) {
    return {
      status: "active",
      scheduledDate: null,
      endDate: null
    };
  }
  const scheduled = typeof scheduledDate === "string" ? new Date(scheduledDate) : scheduledDate;
  const endDate = calculateAssessmentEndDate(scheduled, durationMinutes);
  if (now < scheduled) {
    return {
      status: "not_started",
      scheduledDate: scheduled,
      endDate
    };
  }
  if (endDate && now > endDate) {
    return {
      status: "ended",
      scheduledDate: scheduled,
      endDate
    };
  }
  return {
    status: "active",
    scheduledDate: scheduled,
    endDate
  };
}
export {
  calculateAssessmentEndDate,
  getAssessmentTimingStatus
};
