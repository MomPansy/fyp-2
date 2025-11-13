import * as users from "./users.js";
import * as userRoles from "./user_roles.js";
import * as userProblems from "./user_problems.js";
import * as problems from "./problems.js";
import * as problemTables from "./problem_tables.js";
import * as assessments from "./assessments.js";
import * as assessmentProblems from "./assessment_problems.js";
import * as studentAssessments from "./student_assessments.js";
var index_default = {
  ...users,
  ...userRoles,
  ...userProblems,
  ...problems,
  ...problemTables,
  ...assessments,
  ...assessmentProblems,
  ...studentAssessments
};
export {
  index_default as default
};
