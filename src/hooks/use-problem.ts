import {
  queryOptions,
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { Dialect } from "server/problem-database/mappings.ts";
import { showErrorNotification } from "components/notifications.ts";
import {
  problemKeys,
  problemTableKeys,
} from "components/problems/querykeys.ts";
import { supabase } from "lib/supabase.ts";
import { DEFAULT_PROBLEM_TEMPLATE } from "components/problems/problem-template-html.ts";
import { Database } from "database.gen";
import { ColumnType, ForeignKeyMapping } from "server/drizzle/_custom.ts";
import { api } from "@/lib/api.ts";
import { downloadAndParseCsv } from "@/utils/csv-storage.ts";
import { problemLibraryKeys } from "@/components/problems-library/query-keys.ts";

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
export const problemDetailQueryOptions = <
  K extends keyof ProblemRow = keyof ProblemRow,
>(
  id: string,
  opts?: { columns?: readonly K[] },
) =>
  queryOptions<Pick<ProblemRow, K> | null>({
    queryKey: opts?.columns
      ? [...problemKeys.detail(id), { select: opts.columns }]
      : problemKeys.detail(id),
    queryFn: async () => {
      const selectArg =
        opts?.columns && opts.columns.length > 0 ? opts.columns.join(",") : "*";

      const { data, error } = await supabase
        .from("problems")
        .select(selectArg)
        .eq("id", id)
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
export const createNewProblem = async (id: string) => {
  const { data, error } = await supabase
    .from("problems")
    .upsert({
      id: id,
      name: "Untitled",
      description: DEFAULT_PROBLEM_TEMPLATE,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data;
};

export const useAutoSaveProblemName = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { data, error } = await supabase
        .from("problems")
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
        queryKey: problemKeys.detail(id),
      });
      const previousData = queryClient.getQueryData<
        Database["public"]["Tables"]["problems"]["Row"]
      >(problemKeys.detail(id));

      queryClient.setQueryData<
        Database["public"]["Tables"]["problems"]["Insert"]
      >(problemKeys.detail(id), (oldData) =>
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
        problemKeys.detail(variables.id),
        context?.previousData,
      );
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData<
        Database["public"]["Tables"]["problems"]["Insert"]
      >(problemKeys.detail(variables.id), data);

      queryClient.invalidateQueries({
        queryKey: problemLibraryKeys.all,
      });
    },
  });
};

export const useAutoSaveProblemContent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const { data, error } = await supabase
        .from("problems")
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
        queryKey: problemKeys.detail(id),
      });
      const previousData = queryClient.getQueryData<
        Database["public"]["Tables"]["problems"]["Row"]
      >(problemKeys.detail(id));

      queryClient.setQueryData<
        Database["public"]["Tables"]["problems"]["Insert"]
      >(problemKeys.detail(id), (oldData) =>
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
        problemKeys.detail(variables.id),
        context?.previousData,
      );
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData<
        Database["public"]["Tables"]["problems"]["Insert"]
      >(problemKeys.detail(variables.id), data);
      queryClient.invalidateQueries({
        queryKey: problemLibraryKeys.all,
      });
    },
  });
};

export const problemTablesColumnTypesQueryOptions = (id: string) => {
  return queryOptions<TableMetadata[]>({
    queryKey: problemTableKeys.metadataByProblemId(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("problem_tables")
        .select(
          "id, table_name, column_types, number_of_rows, description, relations, data_path",
        )
        .eq("problem_id", id);

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

export const problemTablesQueryOptions = <
  K extends keyof ProblemTableRow = keyof ProblemTableRow,
>(
  problemId: string,
  opts?: {
    columns: readonly K[];
  },
) => {
  return queryOptions<Pick<ProblemTableRow, K> | null>({
    queryKey: opts?.columns
      ? [...problemTableKeys.detail(problemId), { select: opts.columns }]
      : problemTableKeys.detail(problemId),
    queryFn: async () => {
      const selectArgs =
        opts?.columns && opts.columns.length > 0 ? opts.columns.join(",") : "*";
      const { data, error } = await supabase
        .from("problem_tables")
        .select(selectArgs)
        .eq("problem_id", problemId);

      if (error) {
        throw new Error(error.message);
      }
      return data as unknown as Pick<ProblemTableRow, K>;
    },
  });
};

export const databaseConnectionQueryOptions = (
  problemId: string,
  dialect: Dialect,
) => {
  return queryOptions<{
    key: string;
    dialect: Dialect;
  }>({
    queryKey: ["database", "connect", problemId, dialect],
    queryFn: async () => {
      const response = await api.problems.connect.$post({
        json: {
          problemId,
          dialect,
        },
      });

      const data = await response.json();

      const key = `${data.podName}-${data.dialect}`;
      return {
        key,
        dialect,
      };
    },
    // Increase timeout for long-running database operations
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (was cacheTime in v4)
  });
};

export function useFetchTableDataMutation() {
  return useMutation({
    mutationFn: async (tableId: string) => {
      const { data, error } = await supabase
        .from("problem_tables")
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

export function useDeleteProblemTableMutation() {
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
        .from("problem_tables")
        .delete()
        .eq("id", tableId)
        .eq("problem_id", problemId)
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
        queryKey: problemTableKeys.metadataByProblemId(data.problem_id),
      });
    },
  });
}

export function useDeleteProblemMutation() {
  const queryClient = useQueryClient();
  return useMutation<unknown, Error, { problemId: string }>({
    mutationFn: async ({ problemId }: { problemId: string }) => {
      // get all tables for the problem
      const { data: tables, error: tablesError } = await supabase
        .from("problem_tables")
        .select("id, data_path")
        .eq("problem_id", problemId);

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
        .from("problem_tables")
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
        .from("problems")
        .delete()
        .eq("id", problemId);

      if (problemDeleteError) {
        throw new Error("Error deleting problem" + problemDeleteError.message);
      }
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({
        queryKey: problemKeys.detail(variables.problemId),
      });

      queryClient.invalidateQueries({
        queryKey: problemTableKeys.metadataByProblemId(variables.problemId),
      });

      queryClient.invalidateQueries({
        queryKey: problemTableKeys.byProblemId(variables.problemId),
      });

      queryClient.invalidateQueries({
        queryKey: problemLibraryKeys.all,
      });
    },
  });
}

export const usePrefetchProblemTablesColumnTypes = (id: string) => {
  const queryClient = useQueryClient();

  return () => {
    queryClient.prefetchQuery({
      ...problemTablesColumnTypesQueryOptions(id),
    });
  };
};

export const useFetchProblemTablesColumnTypes = (id: string) => {
  return useSuspenseQuery({
    ...problemTablesColumnTypesQueryOptions(id),
  });
};
