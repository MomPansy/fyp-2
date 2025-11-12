var id = "9ffb3800-cd6b-451f-8975-2bf078d79da3";
var prevId = "eeff8c2c-dc15-41b6-98d4-316a7d1d5ba2";
var version = "7";
var dialect = "postgresql";
var tables = {
  "public.assessmentProblems": {
    name: "assessmentProblems",
    schema: "",
    columns: {
      id: {
        name: "id",
        type: "uuid",
        primaryKey: true,
        notNull: true,
        default: "gen_random_uuid()"
      },
      created_at: {
        name: "created_at",
        type: "timestamp",
        primaryKey: false,
        notNull: true,
        default: "now()"
      },
      updated_at: {
        name: "updated_at",
        type: "timestamp (3) with time zone",
        primaryKey: false,
        notNull: true,
        default: "now()"
      },
      archived_at: {
        name: "archived_at",
        type: "timestamp (3) with time zone",
        primaryKey: false,
        notNull: false
      },
      assessment_id: {
        name: "assessment_id",
        type: "uuid",
        primaryKey: false,
        notNull: true
      },
      problem_id: {
        name: "problem_id",
        type: "uuid",
        primaryKey: false,
        notNull: true
      }
    },
    indexes: {},
    foreignKeys: {
      assessmentProblems_assessment_id_assessments_id_fk: {
        name: "assessmentProblems_assessment_id_assessments_id_fk",
        tableFrom: "assessmentProblems",
        tableTo: "assessments",
        columnsFrom: [
          "assessment_id"
        ],
        columnsTo: [
          "id"
        ],
        onDelete: "cascade",
        onUpdate: "no action"
      },
      assessmentProblems_problem_id_user_problems_id_fk: {
        name: "assessmentProblems_problem_id_user_problems_id_fk",
        tableFrom: "assessmentProblems",
        tableTo: "user_problems",
        columnsFrom: [
          "problem_id"
        ],
        columnsTo: [
          "id"
        ],
        onDelete: "cascade",
        onUpdate: "no action"
      }
    },
    compositePrimaryKeys: {},
    uniqueConstraints: {},
    policies: {},
    checkConstraints: {},
    isRLSEnabled: false
  },
  "public.assessments": {
    name: "assessments",
    schema: "",
    columns: {
      id: {
        name: "id",
        type: "uuid",
        primaryKey: true,
        notNull: true,
        default: "gen_random_uuid()"
      },
      user_id: {
        name: "user_id",
        type: "uuid",
        primaryKey: false,
        notNull: true
      },
      created_at: {
        name: "created_at",
        type: "timestamp",
        primaryKey: false,
        notNull: true,
        default: "now()"
      },
      updated_at: {
        name: "updated_at",
        type: "timestamp (3) with time zone",
        primaryKey: false,
        notNull: true,
        default: "now()"
      },
      archived_at: {
        name: "archived_at",
        type: "timestamp (3) with time zone",
        primaryKey: false,
        notNull: false
      },
      duration: {
        name: "duration",
        type: "numeric",
        primaryKey: false,
        notNull: true
      },
      name: {
        name: "name",
        type: "text",
        primaryKey: false,
        notNull: true
      }
    },
    indexes: {},
    foreignKeys: {
      assessments_user_id_users_id_fk: {
        name: "assessments_user_id_users_id_fk",
        tableFrom: "assessments",
        tableTo: "users",
        columnsFrom: [
          "user_id"
        ],
        columnsTo: [
          "id"
        ],
        onDelete: "cascade",
        onUpdate: "no action"
      }
    },
    compositePrimaryKeys: {},
    uniqueConstraints: {},
    policies: {},
    checkConstraints: {},
    isRLSEnabled: false
  },
  "public.problem_tables": {
    name: "problem_tables",
    schema: "",
    columns: {
      id: {
        name: "id",
        type: "uuid",
        primaryKey: true,
        notNull: true,
        default: "gen_random_uuid()"
      },
      problem_id: {
        name: "problem_id",
        type: "uuid",
        primaryKey: false,
        notNull: true
      },
      table_name: {
        name: "table_name",
        type: "text",
        primaryKey: false,
        notNull: true
      },
      data_path: {
        name: "data_path",
        type: "text",
        primaryKey: false,
        notNull: true
      },
      column_types: {
        name: "column_types",
        type: "jsonb",
        primaryKey: false,
        notNull: false
      },
      relations: {
        name: "relations",
        type: "jsonb",
        primaryKey: false,
        notNull: false
      },
      number_of_rows: {
        name: "number_of_rows",
        type: "integer",
        primaryKey: false,
        notNull: false
      },
      description: {
        name: "description",
        type: "text",
        primaryKey: false,
        notNull: false
      },
      created_at: {
        name: "created_at",
        type: "timestamp",
        primaryKey: false,
        notNull: true,
        default: "now()"
      }
    },
    indexes: {},
    foreignKeys: {
      problem_tables_problem_id_fk: {
        name: "problem_tables_problem_id_fk",
        tableFrom: "problem_tables",
        tableTo: "problems",
        columnsFrom: [
          "problem_id"
        ],
        columnsTo: [
          "id"
        ],
        onDelete: "no action",
        onUpdate: "no action"
      }
    },
    compositePrimaryKeys: {},
    uniqueConstraints: {},
    policies: {},
    checkConstraints: {},
    isRLSEnabled: false
  },
  "public.problems": {
    name: "problems",
    schema: "",
    columns: {
      id: {
        name: "id",
        type: "uuid",
        primaryKey: true,
        notNull: true,
        default: "gen_random_uuid()"
      },
      name: {
        name: "name",
        type: "text",
        primaryKey: false,
        notNull: true
      },
      description: {
        name: "description",
        type: "text",
        primaryKey: false,
        notNull: true
      },
      answer: {
        name: "answer",
        type: "text",
        primaryKey: false,
        notNull: false
      },
      created_at: {
        name: "created_at",
        type: "timestamp (3) with time zone",
        primaryKey: false,
        notNull: false
      },
      updated_at: {
        name: "updated_at",
        type: "timestamp (3) with time zone",
        primaryKey: false,
        notNull: false
      },
      archived_at: {
        name: "archived_at",
        type: "timestamp (3) with time zone",
        primaryKey: false,
        notNull: false
      }
    },
    indexes: {},
    foreignKeys: {},
    compositePrimaryKeys: {},
    uniqueConstraints: {},
    policies: {},
    checkConstraints: {},
    isRLSEnabled: false
  },
  "public.roles": {
    name: "roles",
    schema: "",
    columns: {
      id: {
        name: "id",
        type: "citext",
        primaryKey: true,
        notNull: true
      },
      created_at: {
        name: "created_at",
        type: "timestamp (3) with time zone",
        primaryKey: false,
        notNull: true,
        default: "now()"
      },
      updated_at: {
        name: "updated_at",
        type: "timestamp (3) with time zone",
        primaryKey: false,
        notNull: true,
        default: "now()"
      },
      archived_at: {
        name: "archived_at",
        type: "timestamp (3) with time zone",
        primaryKey: false,
        notNull: false
      }
    },
    indexes: {},
    foreignKeys: {},
    compositePrimaryKeys: {},
    uniqueConstraints: {},
    policies: {},
    checkConstraints: {},
    isRLSEnabled: false
  },
  "public.submission_details": {
    name: "submission_details",
    schema: "",
    columns: {
      id: {
        name: "id",
        type: "uuid",
        primaryKey: true,
        notNull: true,
        default: "gen_random_uuid()"
      },
      submission_id: {
        name: "submission_id",
        type: "uuid",
        primaryKey: false,
        notNull: true
      },
      assignment_problem_id: {
        name: "assignment_problem_id",
        type: "uuid",
        primaryKey: false,
        notNull: true
      },
      created_at: {
        name: "created_at",
        type: "timestamp",
        primaryKey: false,
        notNull: true,
        default: "now()"
      },
      updated_at: {
        name: "updated_at",
        type: "timestamp (3) with time zone",
        primaryKey: false,
        notNull: true,
        default: "now()"
      },
      archived_at: {
        name: "archived_at",
        type: "timestamp (3) with time zone",
        primaryKey: false,
        notNull: false
      },
      candidate_answer: {
        name: "candidate_answer",
        type: "text",
        primaryKey: false,
        notNull: true
      },
      grade: {
        name: "grade",
        type: "citext",
        primaryKey: false,
        notNull: true,
        default: "'failed'"
      }
    },
    indexes: {},
    foreignKeys: {
      submission_details_submission_id_submissions_id_fk: {
        name: "submission_details_submission_id_submissions_id_fk",
        tableFrom: "submission_details",
        tableTo: "submissions",
        columnsFrom: [
          "submission_id"
        ],
        columnsTo: [
          "id"
        ],
        onDelete: "cascade",
        onUpdate: "no action"
      },
      submission_details_assignment_problem_id_assessmentProblems_id_fk: {
        name: "submission_details_assignment_problem_id_assessmentProblems_id_fk",
        tableFrom: "submission_details",
        tableTo: "assessmentProblems",
        columnsFrom: [
          "assignment_problem_id"
        ],
        columnsTo: [
          "id"
        ],
        onDelete: "cascade",
        onUpdate: "no action"
      }
    },
    compositePrimaryKeys: {},
    uniqueConstraints: {},
    policies: {},
    checkConstraints: {},
    isRLSEnabled: false
  },
  "public.submissions": {
    name: "submissions",
    schema: "",
    columns: {
      id: {
        name: "id",
        type: "uuid",
        primaryKey: true,
        notNull: true,
        default: "gen_random_uuid()"
      },
      user_id: {
        name: "user_id",
        type: "uuid",
        primaryKey: false,
        notNull: true
      },
      created_at: {
        name: "created_at",
        type: "timestamp",
        primaryKey: false,
        notNull: true,
        default: "now()"
      },
      updated_at: {
        name: "updated_at",
        type: "timestamp (3) with time zone",
        primaryKey: false,
        notNull: true,
        default: "now()"
      },
      archived_at: {
        name: "archived_at",
        type: "timestamp (3) with time zone",
        primaryKey: false,
        notNull: false
      },
      score: {
        name: "score",
        type: "numeric",
        primaryKey: false,
        notNull: true
      },
      assessment_id: {
        name: "assessment_id",
        type: "uuid",
        primaryKey: false,
        notNull: true
      }
    },
    indexes: {},
    foreignKeys: {
      submissions_user_id_users_id_fk: {
        name: "submissions_user_id_users_id_fk",
        tableFrom: "submissions",
        tableTo: "users",
        columnsFrom: [
          "user_id"
        ],
        columnsTo: [
          "id"
        ],
        onDelete: "cascade",
        onUpdate: "no action"
      },
      submissions_assessment_id_assessments_id_fk: {
        name: "submissions_assessment_id_assessments_id_fk",
        tableFrom: "submissions",
        tableTo: "assessments",
        columnsFrom: [
          "assessment_id"
        ],
        columnsTo: [
          "id"
        ],
        onDelete: "cascade",
        onUpdate: "no action"
      }
    },
    compositePrimaryKeys: {},
    uniqueConstraints: {},
    policies: {},
    checkConstraints: {},
    isRLSEnabled: false
  },
  "public.user_problem_tables": {
    name: "user_problem_tables",
    schema: "",
    columns: {
      id: {
        name: "id",
        type: "uuid",
        primaryKey: true,
        notNull: true,
        default: "gen_random_uuid()"
      },
      user_problem_id: {
        name: "user_problem_id",
        type: "uuid",
        primaryKey: false,
        notNull: true
      },
      table_name: {
        name: "table_name",
        type: "text",
        primaryKey: false,
        notNull: true
      },
      data_path: {
        name: "data_path",
        type: "text",
        primaryKey: false,
        notNull: true
      },
      column_types: {
        name: "column_types",
        type: "jsonb",
        primaryKey: false,
        notNull: false
      },
      relations: {
        name: "relations",
        type: "jsonb",
        primaryKey: false,
        notNull: false
      },
      number_of_rows: {
        name: "number_of_rows",
        type: "integer",
        primaryKey: false,
        notNull: false
      },
      description: {
        name: "description",
        type: "text",
        primaryKey: false,
        notNull: false
      },
      created_at: {
        name: "created_at",
        type: "timestamp",
        primaryKey: false,
        notNull: true,
        default: "now()"
      }
    },
    indexes: {},
    foreignKeys: {
      problem_user_tables_user_problem_id_fk: {
        name: "problem_user_tables_user_problem_id_fk",
        tableFrom: "user_problem_tables",
        tableTo: "user_problems",
        columnsFrom: [
          "user_problem_id"
        ],
        columnsTo: [
          "id"
        ],
        onDelete: "no action",
        onUpdate: "no action"
      }
    },
    compositePrimaryKeys: {},
    uniqueConstraints: {},
    policies: {},
    checkConstraints: {},
    isRLSEnabled: false
  },
  "public.user_problems": {
    name: "user_problems",
    schema: "",
    columns: {
      id: {
        name: "id",
        type: "uuid",
        primaryKey: true,
        notNull: true,
        default: "gen_random_uuid()"
      },
      user_id: {
        name: "user_id",
        type: "uuid",
        primaryKey: false,
        notNull: true
      },
      problem_id: {
        name: "problem_id",
        type: "uuid",
        primaryKey: false,
        notNull: false
      },
      name: {
        name: "name",
        type: "text",
        primaryKey: false,
        notNull: true
      },
      description: {
        name: "description",
        type: "text",
        primaryKey: false,
        notNull: true
      },
      answer: {
        name: "answer",
        type: "text",
        primaryKey: false,
        notNull: false
      },
      created_at: {
        name: "created_at",
        type: "timestamp (3) with time zone",
        primaryKey: false,
        notNull: false,
        default: "now()"
      },
      updated_at: {
        name: "updated_at",
        type: "timestamp (3) with time zone",
        primaryKey: false,
        notNull: false,
        default: "now()"
      },
      archived_at: {
        name: "archived_at",
        type: "timestamp (3) with time zone",
        primaryKey: false,
        notNull: false
      }
    },
    indexes: {},
    foreignKeys: {
      user_problems_user_id_fk: {
        name: "user_problems_user_id_fk",
        tableFrom: "user_problems",
        tableTo: "users",
        columnsFrom: [
          "user_id"
        ],
        columnsTo: [
          "id"
        ],
        onDelete: "cascade",
        onUpdate: "no action"
      },
      user_problems_problem_id_fk: {
        name: "user_problems_problem_id_fk",
        tableFrom: "user_problems",
        tableTo: "problems",
        columnsFrom: [
          "problem_id"
        ],
        columnsTo: [
          "id"
        ],
        onDelete: "cascade",
        onUpdate: "no action"
      }
    },
    compositePrimaryKeys: {},
    uniqueConstraints: {},
    policies: {},
    checkConstraints: {},
    isRLSEnabled: false
  },
  "public.user_roles": {
    name: "user_roles",
    schema: "",
    columns: {
      user_id: {
        name: "user_id",
        type: "uuid",
        primaryKey: false,
        notNull: true
      },
      role_id: {
        name: "role_id",
        type: "citext",
        primaryKey: false,
        notNull: true
      },
      created_at: {
        name: "created_at",
        type: "timestamp (3) with time zone",
        primaryKey: false,
        notNull: true,
        default: "now()"
      },
      created_by: {
        name: "created_by",
        type: "uuid",
        primaryKey: false,
        notNull: false
      },
      updated_at: {
        name: "updated_at",
        type: "timestamp (3) with time zone",
        primaryKey: false,
        notNull: false,
        default: "now()"
      },
      updated_by: {
        name: "updated_by",
        type: "uuid",
        primaryKey: false,
        notNull: false
      },
      archived_at: {
        name: "archived_at",
        type: "timestamp (3) with time zone",
        primaryKey: false,
        notNull: false
      }
    },
    indexes: {},
    foreignKeys: {
      user_roles_user_id_fk: {
        name: "user_roles_user_id_fk",
        tableFrom: "user_roles",
        tableTo: "users",
        columnsFrom: [
          "user_id"
        ],
        columnsTo: [
          "id"
        ],
        onDelete: "cascade",
        onUpdate: "no action"
      },
      user_roles_created_by_fk: {
        name: "user_roles_created_by_fk",
        tableFrom: "user_roles",
        tableTo: "users",
        columnsFrom: [
          "created_by"
        ],
        columnsTo: [
          "id"
        ],
        onDelete: "no action",
        onUpdate: "no action"
      },
      user_roles_updated_by_fk: {
        name: "user_roles_updated_by_fk",
        tableFrom: "user_roles",
        tableTo: "users",
        columnsFrom: [
          "updated_by"
        ],
        columnsTo: [
          "id"
        ],
        onDelete: "no action",
        onUpdate: "no action"
      },
      user_roles_role_id_fk: {
        name: "user_roles_role_id_fk",
        tableFrom: "user_roles",
        tableTo: "roles",
        columnsFrom: [
          "role_id"
        ],
        columnsTo: [
          "id"
        ],
        onDelete: "cascade",
        onUpdate: "no action"
      }
    },
    compositePrimaryKeys: {
      user_roles_pk: {
        name: "user_roles_pk",
        columns: [
          "user_id",
          "role_id"
        ]
      }
    },
    uniqueConstraints: {
      user_roles_unique: {
        name: "user_roles_unique",
        nullsNotDistinct: false,
        columns: [
          "user_id",
          "role_id"
        ]
      }
    },
    policies: {},
    checkConstraints: {},
    isRLSEnabled: false
  },
  "public.users": {
    name: "users",
    schema: "",
    columns: {
      id: {
        name: "id",
        type: "uuid",
        primaryKey: true,
        notNull: true,
        default: "gen_random_uuid()"
      },
      auth_user_id: {
        name: "auth_user_id",
        type: "uuid",
        primaryKey: false,
        notNull: true
      },
      created_at: {
        name: "created_at",
        type: "timestamp (3) with time zone",
        primaryKey: false,
        notNull: true,
        default: "now()"
      },
      updated_at: {
        name: "updated_at",
        type: "timestamp (3) with time zone",
        primaryKey: false,
        notNull: true,
        default: "now()"
      },
      archived_at: {
        name: "archived_at",
        type: "timestamp (3) with time zone",
        primaryKey: false,
        notNull: false
      },
      email: {
        name: "email",
        type: "text",
        primaryKey: false,
        notNull: false
      }
    },
    indexes: {
      users_auth_user_id_idx: {
        name: "users_auth_user_id_idx",
        columns: [
          {
            expression: "auth_user_id",
            isExpression: false,
            asc: true,
            nulls: "last"
          }
        ],
        isUnique: false,
        concurrently: false,
        method: "btree",
        with: {}
      }
    },
    foreignKeys: {},
    compositePrimaryKeys: {},
    uniqueConstraints: {
      users_auth_user_id_unique: {
        name: "users_auth_user_id_unique",
        nullsNotDistinct: false,
        columns: [
          "auth_user_id"
        ]
      }
    },
    policies: {},
    checkConstraints: {},
    isRLSEnabled: false
  }
};
var enums = {};
var schemas = {};
var sequences = {};
var roles = {};
var policies = {};
var views = {};
var _meta = {
  columns: {},
  schemas: {},
  tables: {}
};
var snapshot_default = {
  id,
  prevId,
  version,
  dialect,
  tables,
  enums,
  schemas,
  sequences,
  roles,
  policies,
  views,
  _meta
};
export {
  _meta,
  snapshot_default as default,
  dialect,
  enums,
  id,
  policies,
  prevId,
  roles,
  schemas,
  sequences,
  tables,
  version,
  views
};
