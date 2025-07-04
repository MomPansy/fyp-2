import { factory } from "../../factory.js";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { auth } from "../../middlewares/auth.js";
import { supabase } from "../../lib/supabase";
import { HTTPException } from "hono/http-exception";
const route = factory.createApp().post(
  "/init-upload",
  auth(),
  zValidator(
    "json",
    z.object({
      userId: z.string(),
      problemId: z.string(),
      tableName: z.string()
    })
  ),
  async (c) => {
    const { userId, problemId, tableName } = c.req.valid("json");
    const bucket = userId;
    const path = `${problemId}/${tableName}`;
    await supabase.storage.createBucket(bucket, {
      public: false,
      allowedMimeTypes: ["text/csv"]
    }).catch((error2) => {
      if (!error2.message?.includes("already exists")) {
        throw new HTTPException(500, {
          message: error2.message || "Failed to create bucket"
        });
      } else {
        console.info("\u2705 Bucket already exists, continuing...");
      }
    });
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
    if (!data) {
      console.error("\u274C No upload URL generated - data is null/undefined");
      throw new HTTPException(500, {
        message: "No upload URL generated"
      });
    }
    return c.json({
      token: data.token,
      path: data.path
    });
  }
);
export {
  route
};
