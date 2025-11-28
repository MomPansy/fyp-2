import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { HTTPException } from "hono/http-exception";
import { Database } from "../../../src/database.gen.ts";
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
import { executeQueryByDialect } from "server/problem-database/db-seed/query-executors.ts";

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
      const userId = jwt.user_metadata.user_id;

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
      }),
    ),
    async (c) => {
      const { problemId } = c.req.valid("json");

      const problemTables = await fetchProblemTables(problemId);

      const processedTablesPostgres: SeedTable[] = problemTables.map(
        (table) => ({
          table_name: table.table_name,
          column_types: getColumnMappings("postgres", table.column_types),
          data_path: table.data_path,
          relations: getRelationsMappings("postgres", table.relations),
        }),
      );

      const processedTablesMysql: SeedTable[] = problemTables.map((table) => ({
        table_name: table.table_name,
        column_types: getColumnMappings("mysql", table.column_types),
        data_path: table.data_path,
        relations: getRelationsMappings("mysql", table.relations),
      }));

      const [postgresResult, mysqlResult] = await Promise.all([
        allocateDatabase("postgres"),
        allocateDatabase("mysql"),
      ]);

      // transfer connection string storage to redis
      const postgresKey = `${postgresResult.podName}-postgres`;
      const mysqlKey = `${mysqlResult.podName}-mysql`;

      const [postgresPool, mysqlPool] = await Promise.all([
        createPool(postgresKey, postgresResult.connectionString, "postgres"),
        createPool(mysqlKey, mysqlResult.connectionString, "mysql"),
      ]);

      // 1) Create tables in both databases
      await Promise.all([
        seedDatabase(postgresPool, processedTablesPostgres, "postgres"),
        seedDatabase(mysqlPool, processedTablesMysql, "mysql"),
      ]);

      return c.json({
        postgres: {
          podName: postgresResult.podName,
          dialect: "postgres",
          key: postgresKey,
        },
        mysql: {
          podName: mysqlResult.podName,
          dialect: "mysql",
          key: mysqlKey,
        },
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
        dialect: z.enum(SUPPORTED_DIALECTS),
      }),
    ),
    async (c) => {
      const { podName, sql, dialect } = c.req.valid("json");
      const key = `${podName}-${dialect}`;
      const pool = getPool(key);

      if (!pool) {
        throw new HTTPException(404, {
          message: `No active connection pool found for pod: ${podName}. Please connect first.`,
        });
      }

      try {
        console.info("Executing SQL query:", { podName, dialect, sql });
        const result = await executeQueryByDialect(pool, sql, dialect);
        console.info("Query execution result:", { dialect, result });
        return c.json(result);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Query execution error:", message);
        // Return the SQL error message in the response so the terminal can display it
        return c.json(
          {
            error: message,
          },
          400,
        );
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
  )
  .post(
    "/save-user-problem",
    auth(),
    zValidator(
      "json",
      z.object({
        problemId: z.string(),
        answer: z.string(),
        dialect: z.enum(SUPPORTED_DIALECTS),
        saveAsTemplate: z.boolean(),
      }),
    ),
    async (c) => {
      const { problemId, answer, dialect, saveAsTemplate } =
        c.req.valid("json");

      const { data, error: userProblemsError } = await supabase
        .from("user_problems")
        .update({
          answer: answer,
          dialect: dialect,
        })
        .eq("id", problemId)
        .select("*, user_problem_tables(*)")
        .single();

      if (userProblemsError) {
        throw new HTTPException(500, {
          message: userProblemsError.message,
        });
      }

      // Destructure the data to separate userProblem and userProblemTables
      const { user_problem_tables, ...userProblem } = data;
      // for userProblem we need to drop the problemId column
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { problem_id, user_id, id, ...templatePayload } = userProblem;
      const userProblemTables = user_problem_tables;
      if (saveAsTemplate) {
        // Upsert into problems (templates table)
        const { data: savedTemplate, error: savedTemplateError } =
          await supabase
            .from("problems")
            // insert a new problem row from the user's problem payload
            // use upsert on the "id" column if you want to overwrite an existing template
            .upsert(templatePayload, {
              onConflict: "id",
            })
            .select("id")
            .single();

        if (savedTemplateError) {
          throw new HTTPException(500, {
            message: savedTemplateError.message,
          });
        }

        // Upsert into user_problem_tables
        if (userProblemTables.length > 0) {
          // Build templateTables while copying files to avoid a second pass
          const templateTables: Database["public"]["Tables"]["problem_tables"]["Insert"][] =
            [];

          for (const table of userProblemTables) {
            const path = table.data_path;
            // expect path to be like "<bucket>/<objectPath>" (e.g. "userId/tableName/file.csv")
            const parts = path.split("/");
            const fileName = parts[parts.length - 1];

            const templateTableDataPath = `${savedTemplate.id}/${fileName}`;

            // Copy from source bucket/object to templates bucket under template id
            // TODO: issue with destination path getting 404 not found
            const { error: copyError } = await supabase.storage
              .from("tables")
              .copy(path, templateTableDataPath, {
                destinationBucket: "templates",
              });

            if (copyError) {
              throw new HTTPException(500, {
                message: copyError.message,
              });
            }

            // push directly into templateTables using the new path
            templateTables.push({
              table_name: table.table_name,
              data_path: templateTableDataPath,
              column_types: table.column_types,
              number_of_rows: table.number_of_rows,
              description: table.description,
              relations: table.relations,
              problem_id: savedTemplate.id,
            });
          }

          const { error: templateProblemTableError } = await supabase
            .from("problem_tables")
            .upsert(templateTables, { onConflict: "id" });

          if (templateProblemTableError) {
            throw new HTTPException(500, {
              message: templateProblemTableError.message,
            });
          }
        }
      }

      return c.json({
        userProblem,
        userProblemTables,
      });
    },
  )
  .post(
    "/use-template",
    auth(),
    zValidator(
      "json",
      z.object({
        templateProblemId: z.string(),
      }),
    ),
    async (c) => {
      type UserProblemTableInsert =
        Database["public"]["Tables"]["user_problem_tables"]["Insert"];

      const { templateProblemId } = c.req.valid("json");
      const jwt = c.get("jwtPayload");
      const userId = jwt.user_metadata.user_id;

      if (!userId) {
        throw new HTTPException(401, {
          message: "Missing user context for using template",
        });
      }

      // fetch problem details
      const { data: templateProblemData, error: templateProblemError } =
        await supabase
          .from("problems")
          .select("*, problem_tables(*)")
          .eq("id", templateProblemId)
          .single();

      if (templateProblemError) {
        throw new HTTPException(500, {
          message: templateProblemError.message,
        });
      }

      const { problem_tables: templateProblemTables, ...templateProblem } =
        templateProblemData;

      // insert into user_problems
      const { data: userProblem, error: userProblemError } = await supabase
        .from("user_problems")
        .insert({
          name: templateProblem.name,
          problem_id: templateProblem.id,
          description: templateProblem.description,
          answer: templateProblem.answer,
          dialect: templateProblem.dialect,
          user_id: userId,
        })
        .select("id")
        .single();

      if (userProblemError) {
        throw new HTTPException(500, {
          message: userProblemError.message,
        });
      }

      const newDataPaths: string[] = [];

      // copy storage data
      for (const table of templateProblemTables) {
        const path = table.data_path;
        // expect path to be like "<bucket>/<objectPath>" (e.g. "userId/tableName/file.csv")
        const parts = path.split("/");
        const fileName = parts[parts.length - 1];
        const userTableDataPath = `${userId}/${userProblem.id}/${fileName}`;
        newDataPaths.push(userTableDataPath);
        // Copy from source bucket/object to user bucket under user id and problem id
        const { error: copyError } = await supabase.storage
          .from("templates")
          .copy(path, userTableDataPath, {
            destinationBucket: "tables",
          });

        if (copyError) {
          throw new HTTPException(500, {
            message: copyError.message,
          });
        }
      }

      // insert into user_problem_tables
      if (templateProblemTables.length > 0) {
        const userProblemTables: UserProblemTableInsert[] =
          templateProblemTables.map((table, index) => ({
            user_problem_id: userProblem.id,
            table_name: table.table_name,
            data_path: newDataPaths[index],
            column_types: table.column_types,
            number_of_rows: table.number_of_rows,
            description: table.description,
            relations: table.relations,
          }));

        const { error: userProblemTableError } = await supabase
          .from("user_problem_tables")
          .insert(userProblemTables);

        if (userProblemTableError) {
          throw new HTTPException(500, {
            message: userProblemTableError.message,
          });
        }
      }

      return c.json({
        userProblemId: userProblem.id,
      });
    },
  );
