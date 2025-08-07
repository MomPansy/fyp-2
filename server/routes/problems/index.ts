import { factory } from "server/factory.ts";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { auth } from "server/middlewares/auth.ts";
import { supabase } from "server/lib/supabase.ts";
import { HTTPException } from "hono/http-exception";
import {
  type Allocate,
  allocateDatabase,
  fetchProblemTables,
  handleError,
  type ProblemTable,
  releaseDatabase,
} from "server/utils/database-helpers.ts";
import {
  type Dialect,
  getMappings,
  SUPPORTED_DIALECTS,
} from "server/utils/mappings.ts";
import { createPool, getPool, removePool } from "server/utils/pool-manager.ts";

export const route = factory
  .createApp()
  .post(
    "/init-upload",
    auth(),
    zValidator(
      "json",
      z.object({
        userId: z.string(),
        problemId: z.string(),
        tableName: z.string(),
      }),
    ),
    async (c) => {
      const { userId, problemId, tableName } = c.req.valid("json");
      const bucket = userId;
      const path = `${problemId}/${tableName}`;

      try {
        await supabase.storage.createBucket(bucket, {
          public: false,
          allowedMimeTypes: ["text/csv"],
        });
        console.info("✅ Bucket created successfully");
      } catch (error: any) {
        // Only throw if it's not a "bucket already exists" error
        if (!error.message?.includes("already exists")) {
          console.error("❌ Failed to create bucket:", {
            error: error.message,
            bucket,
            userId,
          });
          throw new HTTPException(500, {
            message: error.message || "Failed to create storage bucket",
          });
        } else {
          console.info("✅ Bucket already exists, continuing...");
        }
      }

      const { data, error } = await supabase.storage.from(bucket)
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
      if (!data) {
        console.error("❌ No upload URL generated - data is null/undefined");
        throw new HTTPException(500, {
          message: "No upload URL generated",
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
      // get tables from problemID
      const { problemId, dialect } = c.req.valid("json");

      // Fetch problem tables
      const problemTables = await fetchProblemTables(problemId);

      // Transform the relations in problemTables to mapped relations
      const processedTables = problemTables.map((table) => ({
        ...table,
        relations: getMappings(dialect, table.relations),
      }));

      // Get database connection
      const { connectionString, podName } = await allocateDatabase(dialect);

      const key = `${podName}-${dialect}`;

      // Create and store a connection pool
      createPool(key, connectionString);

      return c.json("ok");
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
      }),
    ),
    async (c) => {
      const { podName, sql } = c.req.valid("json");
      const pool = getPool(podName);

      if (!pool) {
        throw new HTTPException(404, {
          message:
            `No active connection pool found for pod: ${podName}. Please connect first.`,
        });
      }

      try {
        const result = await pool.query(sql);
        return c.json(result);
      } catch (error: any) {
        throw new HTTPException(400, {
          message: `Query failed: ${error.message}`,
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
