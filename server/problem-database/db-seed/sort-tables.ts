import type { SeedTable } from "./types.ts";

export function sortTablesByDependencies(tables: SeedTable[]): SeedTable[] {
  const sorted: SeedTable[] = [];
  const remaining = [...tables];
  const tableNames = new Set(tables.map((t) => t.table_name));

  while (remaining.length > 0) {
    const beforeLength = remaining.length;

    // Find tables that can be created (no unresolved dependencies)
    for (let i = remaining.length - 1; i >= 0; i--) {
      const table = remaining[i];
      const hasUnresolvedDependencies =
        table.relations?.some((relation) => {
          // Check if the foreign table is in our set and not yet created
          return (
            tableNames.has(relation.foreignTableName) &&
            !sorted.some((t) => t.table_name === relation.foreignTableName)
          );
        }) ?? false;

      if (!hasUnresolvedDependencies) {
        sorted.push(table);
        remaining.splice(i, 1);
      }
    }

    // If no progress was made, we have circular dependencies or missing tables
    if (remaining.length === beforeLength) {
      console.warn(
        "⚠️ Circular dependencies detected or missing foreign tables. Creating remaining tables in original order.",
      );
      sorted.push(...remaining);
      break;
    }
  }

  return sorted;
}
