import { createFileRoute } from "@tanstack/react-router";
import { PGlite } from "@electric-sql/pglite";
import { live } from "@electric-sql/pglite/live";
import { PGliteProvider } from "@electric-sql/pglite-react";
import { Suspense } from "react";
import {
  problemTablesColumnTypesQueryOptions,
  problemTablesRelationsQueryOptions,
} from "@/hooks/use-problem.ts";
import { ProblemDatabase } from "@/components/problems/database/problem-database.tsx";
import { ProblemDatabasePending } from "@/components/problems/database/problem-database-pending.tsx";
import { ProblemDatabaseError } from "@/components/problems/database/problem-database-error.tsx";

const db = await PGlite.create({
  extensions: { live },
});

export const Route = createFileRoute("/_admin/admin/problem/$id/database")({
  loader: async ({ context: { queryClient }, params }) => {
    const relations = await queryClient.ensureQueryData(
      problemTablesRelationsQueryOptions(params.id),
    );
    const tableMetadata = await queryClient.ensureQueryData(
      problemTablesColumnTypesQueryOptions(params.id),
    );

    return {
      relations,
      tableMetadata,
    };
  },
  pendingComponent: ProblemDatabasePending,
  errorComponent: ProblemDatabaseErrorComponent,
  component: RouteComponent,
});

function ProblemDatabaseErrorComponent({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return <ProblemDatabaseError error={error} onRetry={reset} />;
}

function RouteComponent() {
  return (
    <PGliteProvider db={db}>
      <Suspense fallback={<ProblemDatabasePending />}>
        <ProblemDatabase />
      </Suspense>
    </PGliteProvider>
  );
}
