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
  }).select("id").single();

  if (error) {
    throw new Error(error.message);
  }
  return data;
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
