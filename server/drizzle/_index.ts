import * as users from "./users.ts";
import * as userRoles from "./user_roles.ts";
import * as userProblems from "./user_problems.ts";
import * as problems from "./problems.ts";
import * as problemTables from "./problem_tables.ts";
import * as assessments from "./assessments.ts";
import * as assessmentProblems from "./assessment_problems.ts";
import * as studentAssessments from "./student_assessments.ts";

export default {
  ...users,
  ...userRoles,
  ...userProblems,
  ...problems,
  ...problemTables,
  ...assessments,
  ...assessmentProblems,
  ...studentAssessments,
};
