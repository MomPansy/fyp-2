import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { HTTPException } from "hono/http-exception";
import { seedDatabase } from "../../problem-database/db-seed/index.js";
import { factory } from "../../factory.js";
import { auth } from "../../middlewares/auth.js";
import { supabase } from "../../lib/supabase.js";
import {
  allocateDatabase,
  fetchProblemTables,
  releaseDatabase
} from "../../problem-database/hooks.js";
import {
  getColumnMappings,
  getRelationsMappings,
  SUPPORTED_DIALECTS
} from "../../problem-database/mappings.js";
import {
  createPool,
  getPool,
  removePool
} from "../../problem-database/pool-manager.js";
import { executeQueryByDialect } from "../../problem-database/db-seed/query-executors.js";
const route = factory.createApp().post(
  "/init-upload",
  auth(),
  zValidator(
    "json",
    z.object({
      problemId: z.string(),
      tableName: z.string()
    })
  ),
  async (c) => {
    const { problemId, tableName } = c.req.valid("json");
    const jwt = c.get("jwtPayload");
    const userId = jwt.user_metadata.user_id;
    if (!userId) {
      throw new HTTPException(401, {
        message: "Missing user context for file upload"
      });
    }
    const bucket = "tables";
    const path = `${userId}/${problemId}/${tableName}`;
    const { data: bucketData } = await supabase.storage.getBucket(bucket);
    if (!bucketData) {
      const { error: storageError } = await supabase.storage.createBucket(
        bucket,
        {
          public: true,
          allowedMimeTypes: ["text/csv"]
        }
      );
      if (storageError) {
        console.error("\u274C Failed to create bucket:", {
          error: storageError.message,
          bucket,
          userId
        });
        console.error("\u274C Bucket creation error:", storageError);
        throw new HTTPException(500, {
          message: storageError.message || "Failed to create storage bucket"
        });
      }
    }
    const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path, {
      upsert: true
    });
    if (error) {
      console.error("\u274C Supabase storage error:", {
        message: error.message,
        name: error.name,
        bucket,
        path,
        userId
      });
      throw new HTTPException(500, {
        message: `Failed to create signed upload URL: ${error.message}`
      });
    }
    return c.json({
      token: data.token,
      path: data.path
    });
  }
).post(
  "/connect",
  auth(),
  zValidator(
    "json",
    z.object({
      problemId: z.string(),
      dialect: z.enum(SUPPORTED_DIALECTS)
    })
  ),
  async (c) => {
    const { problemId, dialect } = c.req.valid("json");
    const problemTables = await fetchProblemTables(problemId);
    const processedTables = problemTables.map((table) => ({
      table_name: table.table_name,
      column_types: getColumnMappings(dialect, table.column_types),
      data_path: table.data_path,
      relations: getRelationsMappings(dialect, table.relations)
    }));
    const { connectionString, podName } = await allocateDatabase(dialect);
    const key = `${podName}-${dialect}`;
    const pool = await createPool(key, connectionString, dialect);
    await seedDatabase(pool, processedTables, dialect);
    return c.json({
      podName,
      dialect
    });
  }
).post(
  "/execute",
  auth(),
  zValidator(
    "json",
    z.object({
      podName: z.string(),
      sql: z.string(),
      dialect: z.enum(SUPPORTED_DIALECTS)
    })
  ),
  async (c) => {
    const { podName, sql, dialect } = c.req.valid("json");
    const key = `${podName}-${dialect}`;
    const pool = getPool(key);
    if (!pool) {
      throw new HTTPException(404, {
        message: `No active connection pool found for pod: ${podName}. Please connect first.`
      });
    }
    try {
      const result = await executeQueryByDialect(pool, sql, dialect);
      return c.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Query execution error:", message);
      return c.json(
        {
          error: message
        },
        400
      );
    }
  }
).post(
  "/release",
  auth(),
  zValidator(
    "json",
    z.object({
      key: z.string()
    })
  ),
  async (c) => {
    const { key } = c.req.valid("json");
    await releaseDatabase(key);
    await removePool(key);
    return c.json({
      status: "released",
      key
    });
  }
).post(
  "/save-user-problem",
  auth(),
  zValidator(
    "json",
    z.object({
      problemId: z.string(),
      answer: z.string(),
      dialect: z.enum(SUPPORTED_DIALECTS),
      saveAsTemplate: z.boolean()
    })
  ),
  async (c) => {
    const { problemId, answer, dialect, saveAsTemplate } = c.req.valid("json");
    const { data, error: userProblemsError } = await supabase.from("user_problems").update({
      answer,
      dialect
    }).eq("id", problemId).select("*, user_problem_tables(*)").single();
    if (userProblemsError) {
      throw new HTTPException(500, {
        message: userProblemsError.message
      });
    }
    const { user_problem_tables, ...userProblem } = data;
    const { problem_id, user_id, id, ...templatePayload } = userProblem;
    const userProblemTables = user_problem_tables;
    if (saveAsTemplate) {
      const { data: savedTemplate, error: savedTemplateError } = await supabase.from("problems").upsert(templatePayload, {
        onConflict: "id"
      }).select("id").single();
      if (savedTemplateError) {
        throw new HTTPException(500, {
          message: savedTemplateError.message
        });
      }
      if (userProblemTables.length > 0) {
        const templateTables = [];
        for (const table of userProblemTables) {
          const path = table.data_path;
          const parts = path.split("/");
          const fileName = parts[parts.length - 1];
          const templateTableDataPath = `${savedTemplate.id}/${fileName}`;
          const { error: copyError } = await supabase.storage.from("tables").copy(path, templateTableDataPath, {
            destinationBucket: "templates"
          });
          if (copyError) {
            throw new HTTPException(500, {
              message: copyError.message
            });
          }
          templateTables.push({
            table_name: table.table_name,
            data_path: templateTableDataPath,
            column_types: table.column_types,
            number_of_rows: table.number_of_rows,
            description: table.description,
            relations: table.relations,
            problem_id: savedTemplate.id
          });
        }
        const { error: templateProblemTableError } = await supabase.from("problem_tables").upsert(templateTables, { onConflict: "id" });
        if (templateProblemTableError) {
          throw new HTTPException(500, {
            message: templateProblemTableError.message
          });
        }
      }
    }
    return c.json({
      userProblem,
      userProblemTables
    });
  }
).post(
  "/use-template",
  auth(),
  zValidator(
    "json",
    z.object({
      templateProblemId: z.string()
    })
  ),
  async (c) => {
    const { templateProblemId } = c.req.valid("json");
    const jwt = c.get("jwtPayload");
    const userId = jwt.user_metadata.user_id;
    if (!userId) {
      throw new HTTPException(401, {
        message: "Missing user context for using template"
      });
    }
    const { data: templateProblemData, error: templateProblemError } = await supabase.from("problems").select("*, problem_tables(*)").eq("id", templateProblemId).single();
    if (templateProblemError) {
      throw new HTTPException(500, {
        message: templateProblemError.message
      });
    }
    const { problem_tables: templateProblemTables, ...templateProblem } = templateProblemData;
    const { data: userProblem, error: userProblemError } = await supabase.from("user_problems").insert({
      name: templateProblem.name,
      problem_id: templateProblem.id,
      description: templateProblem.description,
      answer: templateProblem.answer,
      dialect: templateProblem.dialect,
      user_id: userId
    }).select("id").single();
    if (userProblemError) {
      throw new HTTPException(500, {
        message: userProblemError.message
      });
    }
    const newDataPaths = [];
    for (const table of templateProblemTables) {
      const path = table.data_path;
      const parts = path.split("/");
      const fileName = parts[parts.length - 1];
      const userTableDataPath = `${userId}/${userProblem.id}/${fileName}`;
      newDataPaths.push(userTableDataPath);
      const { error: copyError } = await supabase.storage.from("templates").copy(path, userTableDataPath, {
        destinationBucket: "tables"
      });
      if (copyError) {
        throw new HTTPException(500, {
          message: copyError.message
        });
      }
    }
    if (templateProblemTables.length > 0) {
      const userProblemTables = templateProblemTables.map((table, index) => ({
        user_problem_id: userProblem.id,
        table_name: table.table_name,
        data_path: newDataPaths[index],
        column_types: table.column_types,
        number_of_rows: table.number_of_rows,
        description: table.description,
        relations: table.relations
      }));
      const { error: userProblemTableError } = await supabase.from("user_problem_tables").insert(userProblemTables);
      if (userProblemTableError) {
        throw new HTTPException(500, {
          message: userProblemTableError.message
        });
      }
    }
    return c.json({
      userProblemId: userProblem.id
    });
  }
);
export {
  route
};
