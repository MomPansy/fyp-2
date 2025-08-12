import { factory } from "server/factory.ts";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { auth } from "server/middlewares/auth.ts";
import { supabase } from "server/lib/supabase.ts";
import { HTTPException } from "hono/http-exception";
import {
  allocateDatabase,
  fetchProblemTables,
  releaseDatabase,
} from "server/utils/database-helpers.ts";
import { getMappings, SUPPORTED_DIALECTS } from "server/utils/mappings.ts";
import { createPool, getPool, removePool } from "server/utils/pool-manager.ts";
import {
  addForeignKeys,
  createTables,
  importCsvData,
  waitForDatabase,
} from "server/utils/db-seed.ts";

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

      const bucket = userId;
      const path = `${problemId}/${tableName}`;

      // get bucket
      const { data: bucketData } = await supabase.storage
        .getBucket(bucket);

      if (!bucketData) {
        const { error: storageError } = await supabase.storage.createBucket(
          bucket,
          {
            public: false,
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
      const { problemId, dialect } = c.req.valid("json");

      const problemTables = await fetchProblemTables(problemId);

      const processedTables = problemTables.map((table) => ({
        ...table,
        relations: getMappings(dialect, table.relations),
      }));

      const { connectionString, podName } = await allocateDatabase(dialect);
      const key = `${podName}-${dialect}`;
      const pool = createPool(key, connectionString);

      // Wait for DB to be ready before issuing DDL/queries
      try {
        await waitForDatabase(pool, dialect, { timeoutMs: 60_000, intervalMs: 1_000 });
      } catch (e) {
        console.error("❌ Database did not become ready in time:", e);
        throw new HTTPException(500, { message: "Database not ready" });
      }

      // 1) Create tables
      await createTables(pool, processedTables, dialect);

      // 2) Import CSV data
      try {
        const jwt = c.get("jwtPayload");
        const userId = jwt?.user_metadata.user_id;
        if (!userId) {
          throw new HTTPException(401, {
            message: "Missing user context for data import",
          });
        }
        await importCsvData(
          supabase,
          userId,
          pool,
          processedTables,
          dialect,
        );
      } catch (e) {
        if (e instanceof HTTPException) throw e;
        console.error("❌ Data import failed:", e);
        throw new HTTPException(500, { message: "Failed to import CSV data" });
      }

      // 3) Add FKs
      await addForeignKeys(pool, processedTables, dialect);

      return c.json({ key, dialect });
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
