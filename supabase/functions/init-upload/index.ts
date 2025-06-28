// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate authorization header first
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid Authorization header" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        },
      );
    }

    const { userId, tableName, assessmentName } = await req.json();

    // Validate required fields
    if (!userId || !tableName || !assessmentName) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: userId, tableName, assessmentName",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }
    const supabaseClient = createClient(
      // Supabase API URL - env var exported by default.
      Deno.env.get("SUPABASE_URL") ?? "",
      // Use service role key for storage operations
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      // Create client with Auth context of the user that called the function.
      // This way your row-level-security (RLS) policies are applied.
    );

    const bucket = userId as string;
    const objectPath = `${tableName}/${assessmentName}`;

    // Create bucket (ignore error if bucket already exists)
    await supabaseClient.storage.createBucket(bucket, {
      public: false,
      allowedMimeTypes: ["text/csv"],
    }).catch((error) => {
      // Only throw if it's not a "bucket already exists" error
      if (!error.message?.includes("already exists")) {
        throw new Error(error.message || "Failed to create bucket");
      }
    });

    const { data, error } = await supabaseClient.storage.from(bucket)
      .createSignedUploadUrl(objectPath, {
        upsert: true,
      });

    if (error) {
      console.error("Supabase storage error:", {
        message: error.message,
        name: error.name,
        cause: error.cause,
        bucket,
        objectPath,
        userId,
      });
      throw new Error(`Failed to create signed upload URL: ${error.message}`);
    }

    if (!data) {
      throw new Error("No upload URL generated");
    }

    return new Response(
      JSON.stringify({
        signedUrl: data.signedUrl,
        token: data.token,
        path: data.path,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Function error:", error);

    const errorMessage = error instanceof Error
      ? error.message
      : "An unexpected error occurred";

    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/init-upload' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
