import {
  queryOptions,
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { showErrorNotification } from "components/notifications";
import {
  problemKeys,
  problemTableKeys,
} from "components/problems/querykeys.ts";
import { supabase } from "lib/supabase.ts";
import { DEFAULT_PROBLEM_TEMPLATE } from "components/problems/problem-template-html";
import { Database } from "database.gen";
import { ForeignKeyMapping, TableMetadata } from "server/drizzle/_custom";
import { Dialect } from "server/utils/mappings";
import { api } from "@/lib/api";

// Narrow type for convenience
type ProblemRow = Database["public"]["Tables"]["problems"]["Row"];

// Query options for use in loaders (router-safe)
export const problemDetailQueryOptions = <
  K extends keyof ProblemRow = keyof ProblemRow,
>(
  id: string,
  opts?: { columns?: ReadonlyArray<K> },
) =>
  queryOptions<Pick<ProblemRow, K> | null>({
    queryKey: opts?.columns
      ? [...problemKeys.detail(id), { select: opts.columns }]
      : problemKeys.detail(id),
    queryFn: async () => {
      const selectArg = opts?.columns && opts.columns.length > 0
        ? (opts.columns.join(",") as string)
        : "*";

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
  const { data, error } = await supabase.from("problems").upsert({
    id: id,
    name: "Untitled",
    description: DEFAULT_PROBLEM_TEMPLATE,
  })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error("Failed to create new problem");
  }
  return data;
};

export const useAutoSaveProblemName = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      { id, name }: { id: string; name: string },
    ) => {
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
      >(
        problemKeys.detail(id),
        (oldData) =>
          oldData
            ? ({
              ...oldData,
              name,
            })
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
    },
  });
};

export const useAutoSaveProblemContent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      { id, content }: { id: string; content: string },
    ) => {
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
      >(
        problemKeys.detail(id),
        (oldData) =>
          oldData
            ? ({
              ...oldData,
              description: content,
            })
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
    },
  });
};

export const problemTablesColumnTypesQueryOptions = (id: string) => {
  return queryOptions<TableMetadata[]>({
    queryKey: problemTableKeys.columnTypes(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("problem_tables")
        .select("table_name, column_types")
        .eq("problem_id", id);

      if (error) {
        showErrorNotification({
          title: "Failed to fetch problem tables",
          message: error.message,
        });
        throw new Error(error.message);
      }
      if (!data || data.length === 0) {
        return [];
      }
      return data.map((item) => ({
        tableName: item.table_name,
        columnTypes: item.column_types,
      })) as TableMetadata[];
    },
  });
};

export const problemTablesRelationsQueryOptions = (id: string) => {
  return queryOptions<Record<string, ForeignKeyMapping[]>>({
    queryKey: problemTableKeys.relationsByProblemId(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("problem_tables")
        .select("table_name, relations")
        .eq("problem_id", id);

      if (error) {
        showErrorNotification({
          title: "Failed to fetch problem table relations",
          message: error.message,
        });
        throw new Error(error.message);
      }
      if (!data || data.length === 0) {
        return {};
      }

      const groupedMappings: Record<string, ForeignKeyMapping[]> = {};

      data.forEach((item) => {
        const foreignKeyMapping = (item.relations || []) as ForeignKeyMapping[];
        if (foreignKeyMapping && foreignKeyMapping.length > 0) {
          foreignKeyMapping.forEach((mapping) => {
            const pairKey =
              `${mapping.baseTableName}_to_${mapping.foreignTableName}`;
            if (!groupedMappings[pairKey]) {
              groupedMappings[pairKey] = [];
            }
            groupedMappings[pairKey].push(mapping);
          });
        }
      });

      return groupedMappings;
    },
  });
};

// Error body shape returned by the connect endpoint on failure
type ConnectDbErrorBody = {
  message?: string;
  error?: string | { message?: string };
  code?: string | number;
  status?: number;
  details?: string;
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
        "json": {
          problemId,
          dialect,
        },
      });

      const data = await response.json();
      return data;
    },
    throwOnError: true,
  });
};

export const usePrefetchProblemTablesColumnTypes = (id: string) => {
  useQueryClient().prefetchQuery({
    ...problemTablesColumnTypesQueryOptions(id),
  });
};

export const useFetchProblemTablesColumnTypes = (id: string) => {
  return useSuspenseQuery({
    ...problemTablesColumnTypesQueryOptions(id),
  });
};

export const useFetchProblemTablesRelations = (id: string) => {
  return useSuspenseQuery({
    ...problemTablesRelationsQueryOptions(id),
  });
};
