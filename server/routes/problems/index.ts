import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { HTTPException } from "hono/http-exception";
import { seedDatabase } from "server/problem-database/db-seed/index.ts";
import { factory } from "server/factory.ts";
import { auth } from "server/middlewares/auth.ts";
import { supabase } from "server/lib/supabase.ts";
import {
  allocateDatabase,
  fetchProblemTables,
  releaseDatabase,
} from "server/problem-database/hooks.ts";
import {
  getColumnMappings,
  getRelationsMappings,
  SUPPORTED_DIALECTS,
} from "server/problem-database/mappings.ts";
import {
  createPool,
  getPool,
  removePool,
} from "server/problem-database/pool-manager.ts";
import type { SeedTable } from "server/problem-database/db-seed/index.ts";
import {
  executeMysqlQuery,
  executeOracleQuery,
  executePostgresQuery,
  executeSqliteQuery,
  executeSqlServerQuery,
} from "server/problem-database/db-seed/query-executors.ts";
import type {
  MysqlPool,
  OraclePool,
  PostgresPool,
  SqlitePool,
  SqlServerPool,
} from "server/problem-database/pools.ts";

export const route = factory
  .createApp()
  .post(
    "/init-upload",
    auth(),
    zValidator(
      "json",
      z.object({
        problemId: z.string(),
        tableName: z.string(),
      }),
    ),
    async (c) => {
      const { problemId, tableName } = c.req.valid("json");
      const jwt = c.get("jwtPayload");
      const userId = jwt?.user_metadata.user_id;

      if (!userId) {
        throw new HTTPException(401, {
          message: "Missing user context for file upload",
        });
      }

      const bucket = "tables";
      const path = `${userId}/${problemId}/${tableName}`;

      // Ensure bucket exists or create it
      // get bucket
      const { data: bucketData } = await supabase.storage.getBucket(bucket);

      if (!bucketData) {
        const { error: storageError } = await supabase.storage.createBucket(
          bucket,
          {
            public: true,
            allowedMimeTypes: ["text/csv"],
          },
        );

        if (storageError) {
          console.error("❌ Failed to create bucket:", {
            error: storageError.message,
            bucket,
            userId,
          });
          console.error("❌ Bucket creation error:", storageError);

          throw new HTTPException(500, {
            message: storageError.message || "Failed to create storage bucket",
          });
        }
      }

      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUploadUrl(path, {
          upsert: true,
        });

      if (error) {
        console.error("❌ Supabase storage error:", {
          message: error.message,
          name: error.name,
          bucket,
          path,
          userId,
        });
        throw new HTTPException(500, {
          message: `Failed to create signed upload URL: ${error.message}`,
        });
      }

      return c.json({
        token: data.token,
        path: data.path,
      });
    },
  )
  .post(
    "/connect",
    auth(),
    zValidator(
      "json",
      z.object({
        problemId: z.string(),
        dialect: z.enum(SUPPORTED_DIALECTS),
      }),
    ),
    async (c) => {
      const { problemId, dialect } = c.req.valid("json");

      const problemTables = await fetchProblemTables(problemId);

      const processedTables: SeedTable[] = problemTables.map((table) => ({
        table_name: table.table_name,
        column_types: getColumnMappings(dialect, table.column_types),
        data_path: table.data_path,
        relations: getRelationsMappings(dialect, table.relations),
      }));

      const { connectionString, podName } = await allocateDatabase(dialect);

      // transfer connection string storage to redis
      const key = `${podName}-${dialect}`;
      const pool = await createPool(key, connectionString, dialect);

      // 1) Create tables
      await seedDatabase(pool, processedTables, dialect);

      return c.json({
        podName,
        dialect,
      });
    },
  )
  .post(
    "/execute",
    auth(),
    zValidator(
      "json",
      z.object({
        podName: z.string(),
        sql: z.string(),
        dialect: z.string(),
      }),
    ),
    async (c) => {
      const { podName, sql, dialect } = c.req.valid("json");
      const key = `${podName}-${dialect}`;
      const pool = getPool(key);

      if (!pool || !dialect) {
        throw new HTTPException(404, {
          message: `No active connection pool found for pod: ${podName}. Please connect first.`,
        });
      }

      try {
        let result;
        switch (dialect) {
          case "postgres":
            result = await executePostgresQuery(pool as PostgresPool, sql);
            break;
          case "mysql":
            result = await executeMysqlQuery(pool as MysqlPool, sql);
            break;
          case "sqlite":
            result = await executeSqliteQuery(pool as SqlitePool, sql);
            break;
          case "sqlserver":
            result = await executeSqlServerQuery(pool as SqlServerPool, sql);
            break;
          case "oracle":
            result = await executeOracleQuery(pool as OraclePool, sql);
            break;
          default:
            throw new HTTPException(400, {
              message: `Unsupported dialect: ${dialect}`,
            });
        }
        return c.json(result);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        throw new HTTPException(400, {
          message: `Query failed: ${message}`,
        });
      }
    },
  )
  .post(
    "/release",
    auth(),
    zValidator(
      "json",
      z.object({
        key: z.string(),
      }),
    ),
    async (c) => {
      const { key } = c.req.valid("json");

      await releaseDatabase(key);
      await removePool(key);

      return c.json({
        status: "released",
        key,
      });
    },
  );
