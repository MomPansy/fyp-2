import { problemDetailQueryOptions, problemTablesColumnTypesQueryOptions, problemTablesRelationsQueryOptions } from '@/hooks/use-problem';
import { createFileRoute } from '@tanstack/react-router';
import { ProblemDatabase } from '@/components/problems/database/problem-database';
import { ProblemDatabasePending } from '@/components/problems/database/problem-database-pending';
import { ProblemDatabaseError } from '@/components/problems/database/problem-database-error';
import { ProblemContext } from '@/components/problems/problem-context';

export const Route = createFileRoute('/_admin/admin/problem/$id/database')({
  loader: async ({ context: { queryClient }, params }) => {
    const relations = await queryClient.ensureQueryData(problemTablesRelationsQueryOptions(params.id));
    const tableMetadata = await queryClient.ensureQueryData(problemTablesColumnTypesQueryOptions(params.id));

    return {
      relations,
      tableMetadata,
    };
  },
  pendingComponent: ProblemDatabasePending,
  errorComponent: ProblemDatabaseErrorComponent,
  component: RouteComponent,
});

function ProblemDatabaseErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  return <ProblemDatabaseError error={error} onRetry={reset} />;
}

function RouteComponent() {
  const { relations, tableMetadata } = Route.useLoaderData();

  return (
    <ProblemContext.Provider value={{ problemId: Route.useParams().id }}>
      <ProblemDatabase
        tableMetadata={tableMetadata}
        groupedMappings={relations}
      />
    </ProblemContext.Provider>
  );
}
