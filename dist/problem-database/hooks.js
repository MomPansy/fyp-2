import { z } from "zod";
import { HTTPException } from "hono/http-exception";
import { supabase } from "../lib/supabase.js";
const handleError = (operation, error, fallbackMessage, statusCode = 500) => {
  if (error instanceof HTTPException) {
    throw error;
  }
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error(`\u274C ${operation}:`, {
    error: errorMessage,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
  throw new HTTPException(statusCode, {
    message: fallbackMessage
  });
};
const problemTablesSchema = z.object({
  table_name: z.string(),
  column_types: z.array(
    z.object({
      column: z.string(),
      type: z.string(),
      isPrimaryKey: z.boolean()
    })
  ),
  data_path: z.string(),
  relations: z.nullable(
    z.array(
      z.object({
        baseTableName: z.string(),
        baseColumnName: z.string(),
        baseColumnType: z.string(),
        foreignTableName: z.string(),
        foreignTableColumn: z.string(),
        foreignTableType: z.string()
      })
    )
  )
});
const allocateSchema = z.object({
  connectionString: z.string(),
  pod_name: z.string()
});
async function fetchProblemTables(problemId) {
  try {
    const { data, error } = await supabase.from("user_problem_tables").select("table_name, column_types, relations, data_path").eq("user_problem_id", problemId);
    if (error) {
      console.error("\u274C Supabase query error:", {
        error: error.message,
        problemId
      });
      throw new HTTPException(500, {
        message: `Database query failed: ${error.message}`
      });
    }
    if (data.length === 0) {
      console.error(
        "\u274C No data returned from Supabase query for problemId:",
        problemId
      );
      throw new HTTPException(404, {
        message: "No problem tables found for the given problem ID"
      });
    }
    return data.map((table) => {
      try {
        return {
          ...table,
          relations: table.relations,
          column_types: table.column_types
        };
      } catch (castError) {
        console.error("\u274C Data type casting error:", castError);
        throw new HTTPException(500, {
          message: "Invalid problem table data structure"
        });
      }
    });
  } catch (error) {
    return handleError(
      "Failed to fetch problem tables",
      error,
      "Failed to fetch problem tables"
    );
  }
}
async function allocateDatabase(dialect) {
  try {
    console.info("\u{1F50C} Attempting to connect to database broker...");
    const response = await fetch("http://db-broker:8080/allocate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        dialect
      })
    });
    if (!response.ok) {
      let errorMessage = `Database broker responded with status ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData && typeof errorData === "object" && "message" in errorData) {
          errorMessage = `Failed to connect to database: ${errorData.message}`;
        }
      } catch (parseError) {
        console.error(
          "\u274C Failed to parse error response from DB broker:",
          parseError
        );
      }
      console.error("\u274C DB Broker error:", {
        status: response.status,
        statusText: response.statusText
      });
      throw new HTTPException(500, {
        message: errorMessage
      });
    }
    let responseData;
    try {
      responseData = await response.json();
    } catch (parseError) {
      console.error("\u274C Failed to parse response from DB broker:", parseError);
      throw new HTTPException(500, {
        message: "Invalid response from database broker"
      });
    }
    const allocation = allocateSchema.safeParse(responseData);
    if (!allocation.success) {
      console.error("\u274C Invalid allocation response format:", allocation.error);
      throw new HTTPException(500, {
        message: "Invalid response format from database broker"
      });
    }
    console.info("\u2705 Successfully allocated database:", {
      pod: allocation.data.pod_name,
      dialect
    });
    return {
      connectionString: allocation.data.connectionString,
      podName: allocation.data.pod_name
    };
  } catch (error) {
    return handleError(
      "Failed to connect to database broker",
      error,
      "Failed to connect to database broker"
    );
  }
}
async function releaseDatabase(podName) {
  try {
    console.info("\u{1F50C} Attempting to release database pod:", podName);
    const response = await fetch(
      `http://db-broker:8080/release?pod=${encodeURIComponent(podName)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
    if (!response.ok) {
      let errorMessage = `Database broker responded with status ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData && typeof errorData === "object" && "message" in errorData) {
          errorMessage = `Failed to release database: ${errorData.message}`;
        }
      } catch (parseError) {
        console.error(
          "\u274C Failed to parse error response from DB broker:",
          parseError
        );
      }
      console.error("\u274C DB Broker release error:", {
        status: response.status,
        statusText: response.statusText,
        podName
      });
      throw new HTTPException(500, {
        message: errorMessage
      });
    }
    console.info("\u2705 Successfully released database pod:", podName);
  } catch (error) {
    return handleError(
      "Failed to release database",
      error,
      "Failed to release database pod"
    );
  }
}
export {
  allocateDatabase,
  allocateSchema,
  fetchProblemTables,
  handleError,
  problemTablesSchema,
  releaseDatabase
};
