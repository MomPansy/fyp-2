import { factory } from "server/factory.ts";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { auth } from "server/middlewares/auth.ts";
import { supabase } from "server/lib/supabase.ts";
import { HTTPException } from "hono/http-exception";

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

      await supabase.storage.createBucket(bucket, {
        public: false,
        allowedMimeTypes: ["text/csv"],
      }).catch((error) => {
        // Only throw if it's not a "bucket already exists" error
        if (!error.message?.includes("already exists")) {
          // help me throw a suitable status code
          throw new HTTPException(500, {
            message: error.message || "Failed to create bucket",
          });
        } else {
          console.info("✅ Bucket already exists, continuing...");
        }
      });

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
  );
