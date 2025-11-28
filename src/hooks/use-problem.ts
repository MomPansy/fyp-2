import {
  queryOptions,
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { InferResponseType } from "hono";
import { Dialect } from "server/problem-database/mappings.ts";
import { showErrorNotification } from "components/notifications.ts";
import {
  userProblemKeys,
  userProblemTableKeys,
} from "components/problems/querykeys.ts";
import { supabase } from "lib/supabase.ts";
import { DEFAULT_PROBLEM_TEMPLATE } from "components/problems/problem-template-html.ts";
import { ColumnType, ForeignKeyMapping } from "server/drizzle/_custom.ts";
import { api } from "@/lib/api.ts";
import { downloadAndParseCsv } from "@/utils/csv-storage.ts";
import { myProblemKeys } from "@/components/my-problems/query-keys.ts";
import { PROBLEM_EXECUTE_SQL_MUTATION_KEY } from "@/components/problems/create/mutation-key.ts";
import { Database } from "@/database.gen.ts";

// Narrow type for convenience
type ProblemRow = Database["public"]["Tables"]["problems"]["Row"];
type ProblemTableRow = Database["public"]["Tables"]["problem_tables"]["Row"];
export type Row = Record<string, unknown>;
export interface TableMetadata {
  tableId: string;
  tableName: string;
  columnTypes: ColumnType[];
  numberOfRows: number;
  description: string;
  relations: ForeignKeyMapping[];
  dataPath: string;
}

// Query options for use in loaders (router-safe)
export const userProblemDetailQueryOptions = <
  K extends keyof ProblemRow = keyof ProblemRow,
>(
  id: string,
  userId: string,
  opts?: { columns?: readonly K[] },
) =>
  queryOptions<Pick<ProblemRow, K> | null>({
    queryKey: opts?.columns
      ? [...userProblemKeys.detail(id), { select: opts.columns }]
      : userProblemKeys.detail(id),
    queryFn: async () => {
      const selectArg =
        opts?.columns && opts.columns.length > 0 ? opts.columns.join(",") : "*";

      const { data, error } = await supabase
        .from("user_problems")
        .select(selectArg)
        .eq("id", id)
        .eq("user_id", userId)
        .single();

      if (error) {
        // For 404/not found, return null instead of throwing
        if (error.code === "PGRST116") {
          return null;
        }
        throw new Error(error.message);
      }
      // Cast via unknown because Supabase cannot infer typed selects from dynamic column strings
      return data as unknown as Pick<ProblemRow, K>;
    },
    retry: (failureCount, error) => {
      // Don't retry on 404s
      if (error.message.includes("PGRST116")) {
        return false;
      }
      return failureCount < 3;
    },
  });

// Separate function for creating new problems (router-safe)
export const createNewUserProblem = async (id: string, userId: string) => {
  const { data, error } = await supabase
    .from("user_problems")
    .upsert({
      id: id,
      name: "Untitled",
      description: DEFAULT_PROBLEM_TEMPLATE,
      user_id: userId,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data;
};

export const useAutoSaveUserProblemName = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { data, error } = await supabase
        .from("user_problems")
        .update({ name })
        .eq("id", id)
        .select("*")
        .single();

      if (error) {
        throw new Error(error.message);
      }
      return data;
    },
    onMutate: async ({ id, name }) => {
      // Optimistically update the cache
      await queryClient.cancelQueries({
        queryKey: userProblemKeys.detail(id),
      });
      const previousData = queryClient.getQueryData<
        Database["public"]["Tables"]["problems"]["Row"]
      >(userProblemKeys.detail(id));

      queryClient.setQueryData<
        Database["public"]["Tables"]["problems"]["Insert"]
      >(userProblemKeys.detail(id), (oldData) =>
        oldData
          ? {
              ...oldData,
              name,
            }
          : undefined,
      );

      return { previousData };
    },
    onError: (_error, variables, context) => {
      queryClient.setQueryData(
        userProblemKeys.detail(variables.id),
        context?.previousData,
      );
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData<
        Database["public"]["Tables"]["problems"]["Insert"]
      >(userProblemKeys.detail(variables.id), data);

      queryClient.invalidateQueries({
        queryKey: myProblemKeys.all,
      });
    },
  });
};

export const useAutoSaveUserProblemContent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const { data, error } = await supabase
        .from("user_problems")
        .update({ description: content })
        .eq("id", id)
        .select("*")
        .single();

      if (error) {
        throw new Error(error.message);
      }
      return data;
    },
    onMutate: async ({ id, content }) => {
      // Optimistically update the cache
      await queryClient.cancelQueries({
        queryKey: userProblemKeys.detail(id),
      });
      const previousData = queryClient.getQueryData<
        Database["public"]["Tables"]["problems"]["Row"]
      >(userProblemKeys.detail(id));

      queryClient.setQueryData<
        Database["public"]["Tables"]["problems"]["Insert"]
      >(userProblemKeys.detail(id), (oldData) =>
        oldData
          ? {
              ...oldData,
              description: content,
            }
          : undefined,
      );

      return { previousData };
    },
    onError: (_error, variables, context) => {
      queryClient.setQueryData(
        userProblemKeys.detail(variables.id),
        context?.previousData,
      );
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData<
        Database["public"]["Tables"]["problems"]["Insert"]
      >(userProblemKeys.detail(variables.id), data);
      queryClient.invalidateQueries({
        queryKey: myProblemKeys.all,
      });
    },
  });
};

export const userProblemTablesColumnTypesQueryOptions = (id: string) => {
  return queryOptions<TableMetadata[]>({
    queryKey: userProblemTableKeys.metadataByProblemId(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_problem_tables")
        .select(
          "id, table_name, column_types, number_of_rows, description, relations, data_path",
        )
        .eq("user_problem_id", id);

      if (error) {
        showErrorNotification({
          title: "Failed to fetch problem tables",
          message: error.message,
        });
        throw new Error(error.message);
      }

      return data.map((item) => ({
        tableId: item.id,
        tableName: item.table_name,
        columnTypes: item.column_types as unknown as ColumnType[],
        numberOfRows: item.number_of_rows,
        description: item.description,
        relations: item.relations as unknown as ForeignKeyMapping[],
        dataPath: item.data_path,
      })) as TableMetadata[];
    },
    retry: (failureCount, error) => {
      // Don't retry on 404s
      if (error.message.includes("PGRST116")) {
        return false;
      }
      return failureCount < 3;
    },
  });
};

export const userProblemTablesQueryOptions = <
  K extends keyof ProblemTableRow = keyof ProblemTableRow,
>(
  problemId: string,
  opts?: {
    columns: readonly K[];
  },
) => {
  return queryOptions<Pick<ProblemTableRow, K> | null>({
    queryKey: opts?.columns
      ? [...userProblemTableKeys.detail(problemId), { select: opts.columns }]
      : userProblemTableKeys.detail(problemId),
    queryFn: async () => {
      const selectArgs =
        opts?.columns && opts.columns.length > 0 ? opts.columns.join(",") : "*";
      const { data, error } = await supabase
        .from("user_problem_tables")
        .select(selectArgs)
        .eq("user_problem_id", problemId);

      if (error) {
        throw new Error(error.message);
      }
      return data as unknown as Pick<ProblemTableRow, K>;
    },
  });
};

interface ExecuteSQLMutationOptions {
  podName: string;
  dialect: Dialect;
  sql: string;
}

export type ExecuteSQLMutationResult = InferResponseType<
  typeof api.problems.execute.$post
>;

export const useExecuteSQLMutation = () => {
  return useMutation<
    ExecuteSQLMutationResult,
    Error,
    ExecuteSQLMutationOptions
  >({
    mutationKey: [PROBLEM_EXECUTE_SQL_MUTATION_KEY],
    mutationFn: async ({
      podName,
      dialect,
      sql,
    }: ExecuteSQLMutationOptions) => {
      const response = await api.problems.execute.$post({
        json: {
          podName,
          sql,
          dialect,
        },
      });

      const data = await response.json();

      // Return the data regardless of status - let the terminal handle errors
      // The backend returns { error: "message" } for SQL errors
      return data;
    },
  });
};

export const databaseConnectionQueryOptions = (problemId: string) => {
  return queryOptions({
    queryKey: ["database", "connect", problemId],
    queryFn: async () => {
      const response = await api.problems.connect.$post({
        json: {
          problemId,
        },
      });

      const data = await response.json();

      return data;
    },
    // Increase timeout for long-running database operations
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (was cacheTime in v4)
  });
};

export function useFetchUserProblemTableDataMutation() {
  return useMutation({
    mutationFn: async (tableId: string) => {
      const { data, error } = await supabase
        .from("user_problem_tables")
        .select("*")
        .eq("id", tableId)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      // fetch data from data_path
      if (!data.data_path) {
        throw new Error("No data path found");
      }

      // Download and parse CSV data
      const csvResult = await downloadAndParseCsv<Row>(
        data.data_path,
        "tables",
      );

      return {
        ...data,
        rawData: csvResult.data,
        relations: data.relations as unknown as ForeignKeyMapping[],
        column_types: data.column_types as unknown as ColumnType[],
      };
    },
    onError: (error) => {
      showErrorNotification({
        title: "Failed to fetch table data",
        message: error.message,
      });
    },
  });
}

export function useDeleteUserProblemTableMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      tableId,
      problemId,
    }: {
      tableId: string;
      problemId: string;
    }) => {
      // eslint-disable-next-line drizzle/enforce-delete-with-where
      const { data, error: dbError } = await supabase
        .from("user_problem_tables")
        .delete()
        .eq("id", tableId)
        .eq("user_problem_id", problemId)
        .select()
        .single();

      if (dbError) {
        throw new Error(dbError.message);
      }

      // delete data from storage
      if (data.data_path) {
        const { error: storageError } = await supabase.storage
          .from("tables")
          .remove([data.data_path]);

        if (storageError) {
          throw new Error(storageError.message);
        }
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: userProblemTableKeys.metadataByProblemId(
          data.user_problem_id,
        ),
      });
    },
  });
}

export function useUpdateUserProblemTableMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      tableId,
      problemId,
      tableName,
      description,
      oldTableName,
    }: {
      tableId: string;
      problemId: string;
      tableName?: string;
      description?: string;
      oldTableName?: string;
    }) => {
      const updateData: { table_name?: string; description?: string } = {};
      if (tableName !== undefined) updateData.table_name = tableName;
      if (description !== undefined) updateData.description = description;

      const { data, error } = await supabase
        .from("user_problem_tables")
        .update(updateData)
        .eq("id", tableId)
        .eq("user_problem_id", problemId)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      // If table name changed, update relations in all tables that reference this table
      if (
        tableName !== undefined &&
        oldTableName &&
        tableName !== oldTableName
      ) {
        // Get all tables for this problem to update their relations
        const { data: allTables, error: fetchError } = await supabase
          .from("user_problem_tables")
          .select("id, relations")
          .eq("user_problem_id", problemId);

        if (fetchError) {
          throw new Error(
            "Error fetching tables for relation update: " + fetchError.message,
          );
        }

        // Update relations in each table that references the renamed table
        for (const table of allTables) {
          if (!table.relations || !Array.isArray(table.relations)) continue;

          const relations = table.relations as unknown as ForeignKeyMapping[];
          let hasChanges = false;

          const updatedRelations = relations.map((relation) => {
            const updated = { ...relation };

            // Update baseTableName if it matches the old table name
            if (relation.baseTableName === oldTableName) {
              updated.baseTableName = tableName;
              hasChanges = true;
            }

            // Update foreignTableName if it matches the old table name
            if (relation.foreignTableName === oldTableName) {
              updated.foreignTableName = tableName;
              hasChanges = true;
            }

            return updated;
          });

          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          if (hasChanges) {
            const { error: updateError } = await supabase
              .from("user_problem_tables")
              .update({ relations: updatedRelations })
              .eq("id", table.id);

            if (updateError) {
              console.error(
                `Error updating relations for table ${table.id}:`,
                updateError,
              );
            }
          }
        }
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: userProblemTableKeys.metadataByProblemId(
          data.user_problem_id,
        ),
      });
    },
  });
}

export function useDeleteUserProblemMutation() {
  const queryClient = useQueryClient();
  return useMutation<unknown, Error, { problemId: string }>({
    mutationFn: async ({ problemId }: { problemId: string }) => {
      // get all tables for the problem
      const { data: tables, error: tablesError } = await supabase
        .from("user_problem_tables")
        .select("id, data_path")
        .eq("user_problem_id", problemId);

      if (tablesError) {
        throw new Error(
          "Error fetching problem table details" + tablesError.message,
        );
      }

      const dataPaths = tables.map((table) => table.data_path);
      if (dataPaths.length > 0) {
        // delete all data files from storage
        const { error: storageError } = await supabase.storage
          .from("tables")
          .remove(dataPaths);

        if (storageError) {
          throw new Error(
            "Error deleting problem table data" + storageError.message,
          );
        }
      }
      const tableIds = tables.map((table) => table.id);
      // delete all tables
      // eslint-disable-next-line drizzle/enforce-delete-with-where
      const { error: tableDeleteError } = await supabase
        .from("user_problem_tables")
        .delete()
        .in("id", tableIds);

      if (tableDeleteError) {
        throw new Error(
          "Error deleting problem tables" + tableDeleteError.message,
        );
      }
      // delete the problem itself
      // eslint-disable-next-line drizzle/enforce-delete-with-where
      const { error: problemDeleteError } = await supabase
        .from("user_problems")
        .delete()
        .eq("id", problemId);

      if (problemDeleteError) {
        throw new Error("Error deleting problem" + problemDeleteError.message);
      }
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({
        queryKey: userProblemKeys.detail(variables.problemId),
      });

      queryClient.invalidateQueries({
        queryKey: userProblemTableKeys.metadataByProblemId(variables.problemId),
      });

      queryClient.invalidateQueries({
        queryKey: userProblemTableKeys.byProblemId(variables.problemId),
      });

      queryClient.invalidateQueries({
        queryKey: myProblemKeys.all,
      });
    },
  });
}

export const usePrefetchUserProblemTablesColumnTypes = (id: string) => {
  const queryClient = useQueryClient();

  return () => {
    queryClient.prefetchQuery({
      ...userProblemTablesColumnTypesQueryOptions(id),
    });
  };
};

export const useFetchUserProblemTablesColumnTypes = (id: string) => {
  return useSuspenseQuery({
    ...userProblemTablesColumnTypesQueryOptions(id),
  });
};
