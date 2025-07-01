import * as users from "./users.ts";
import * as userRoles from "./user_roles.ts";
import * as userProblems from "./user_problems.ts";
import * as problems from "./problems.ts";
import * as problemTables from "./problem_tables.ts";

export default {
    ...users,
    ...userRoles,
    ...userProblems,
    ...problems,
    ...problemTables,
};
