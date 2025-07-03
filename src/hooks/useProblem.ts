import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { showErrorNotification } from "components/notifications";
import { problemKeys } from "components/problems/querykeys.ts";
import { supabase } from "lib/supabase.ts";
import { DEFAULT_PROBLEM_TEMPLATE } from "components/problems/problem-template-html";
import { Database } from "database.gen";

// Query options for use in loaders (router-safe)
export const problemDetailQueryOptions = (id: string) =>
  queryOptions({
    queryKey: problemKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("problems")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        // For 404/not found, return null instead of throwing
        if (error.code === "PGRST116") {
          return null;
        }
        throw new Error(error.message);
      }
      return data;
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

export const useProblem = () => {
  const queryClient = useQueryClient();
  async function saveProblemDetails(
    { id, problemName, content }: {
      id?: string;
      problemName: string;
      content: string;
    },
  ) {
    // Logic to save the problem name and content
    const { data, error } = await supabase.from("problems").upsert({
      id: id,
      name: problemName,
      description: content,
    }).select("id").single();

    if (error) {
      showErrorNotification({
        title: "Error saving problem",
        message: error.message,
      });
    }
    return data;
  }

  const saveProblemDetailsMutation = () =>
    useMutation({
      mutationFn: saveProblemDetails,
      onSuccess: (data) => {
        if (data?.id) {
          // Optimistically update the cache
          queryClient.setQueryData(
            problemKeys.detail(data.id),
            (oldData: any) => oldData ? { ...oldData, ...data } : data,
          );
          // Then invalidate to ensure freshness
          queryClient.invalidateQueries({
            queryKey: problemKeys.detail(data.id),
          });
        }
        // Always invalidate the list view
        queryClient.invalidateQueries({ queryKey: problemKeys.all });
      },
      onError: (error) => {
        showErrorNotification({
          title: "Error saving problem",
          message: error.message,
        });
      },
    });

  const fetchProblemsQuery = (id: string) => {
    return useSuspenseQuery(problemDetailQueryOptions(id));
  };

  return {
    saveProblemDetailsMutation,
    fetchProblemsQuery,
  };
};
