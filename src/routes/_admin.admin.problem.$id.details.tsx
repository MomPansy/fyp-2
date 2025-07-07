
import { ProblemContext } from "@/components/problems/problem-context";
import {
  Stepper,
} from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";
import { ProblemDatabase } from "@/components/problems/database/problem-database";
import { ProblemDescription } from "components/problems/details/problem-description";
import { problemDetailQueryOptions, createNewProblem } from "@/hooks/use-problem";
import { useState } from "react";


export const Route = createFileRoute("/_admin/admin/problem/$id/details")({
  loader: async ({ context: { queryClient }, params }) => {
    try {
      // Try to fetch existing problem
      const existingProblem = await queryClient.ensureQueryData(problemDetailQueryOptions(params.id));

      // If problem exists, return it
      if (existingProblem) {
        return existingProblem;
      }

      // If problem doesn't exist (null), create a new one
      const newProblem = await createNewProblem(params.id);

      // Update the cache with the new problem and return it
      queryClient.setQueryData(problemDetailQueryOptions(params.id).queryKey, newProblem);

      return newProblem;
    } catch (error) {
      throw new Error(`Failed to load or create problem: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
  // Add proper error handling
  errorComponent: ({ error }: { error: Error }) => (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <h2 className="text-xl font-semibold text-red-600">Failed to Load Problem</h2>
      <p className="text-gray-600">{error.message}</p>
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Retry
      </button>
    </div>
  ),
  // Add loading state
  pendingComponent: () => (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading problem...</p>
      </div>
    </div>
  ),
  preload: false,
  component: RouteComponent,
});

function RouteComponent() {
  const problem = Route.useLoaderData()
  const { id } = Route.useParams();

  return (
    <ProblemContext.Provider value={{ problemId: id }}>
      <ProblemDescription
        problemName={problem.name}
        problemContent={problem?.description || ''}
      />
    </ProblemContext.Provider >
  );
}
