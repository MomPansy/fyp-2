import { problemTablesColumnTypesQueryOptions, problemTablesRelationsQueryOptions, useFetchProblemTablesColumnTypes, useFetchProblemTablesRelations } from '@/hooks/use-problem';
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
  const params = Route.useParams();

  // Use reactive queries instead of loader data for real-time updates
  const { data: tableMetadata } = useFetchProblemTablesColumnTypes(params.id);
  const { data: relations } = useFetchProblemTablesRelations(params.id);

  return (
    <ProblemContext.Provider value={{ problemId: params.id }}>
      <ProblemDatabase
        tableMetadata={tableMetadata}
        groupedMappings={relations}
      />
    </ProblemContext.Provider>
  );
}
