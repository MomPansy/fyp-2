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
import {
  executeMysqlQuery,
  executeOracleQuery,
  executePostgresQuery,
  executeSqliteQuery,
  executeSqlServerQuery
} from "../../problem-database/db-seed/query-executors.js";
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
    const userId = jwt?.user_metadata.user_id;
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
      dialect: z.string()
    })
  ),
  async (c) => {
    const { podName, sql, dialect } = c.req.valid("json");
    const pool = getPool(podName);
    if (!pool || !dialect) {
      throw new HTTPException(404, {
        message: `No active connection pool found for pod: ${podName}. Please connect first.`
      });
    }
    try {
      let result;
      switch (dialect) {
        case "postgres":
          result = await executePostgresQuery(pool, sql);
          break;
        case "mysql":
          result = await executeMysqlQuery(pool, sql);
          break;
        case "sqlite":
          result = await executeSqliteQuery(pool, sql);
          break;
        case "sqlserver":
          result = await executeSqlServerQuery(pool, sql);
          break;
        case "oracle":
          result = await executeOracleQuery(pool, sql);
          break;
        default:
          throw new HTTPException(400, {
            message: `Unsupported dialect: ${dialect}`
          });
      }
      return c.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new HTTPException(400, {
        message: `Query failed: ${message}`
      });
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
);
export {
  route
};
