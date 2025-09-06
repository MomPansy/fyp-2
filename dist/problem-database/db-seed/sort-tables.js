function sortTablesByDependencies(tables) {
  const sorted = [];
  const remaining = [...tables];
  const tableNames = new Set(tables.map((t) => t.table_name));
  while (remaining.length > 0) {
    const beforeLength = remaining.length;
    for (let i = remaining.length - 1; i >= 0; i--) {
      const table = remaining[i];
      const hasUnresolvedDependencies = table.relations?.some((relation) => {
        return tableNames.has(relation.foreignTableName) && !sorted.some((t) => t.table_name === relation.foreignTableName);
      }) ?? false;
      if (!hasUnresolvedDependencies) {
        sorted.push(table);
        remaining.splice(i, 1);
      }
    }
    if (remaining.length === beforeLength) {
      console.warn(
        "\u26A0\uFE0F Circular dependencies detected or missing foreign tables. Creating remaining tables in original order."
      );
      sorted.push(...remaining);
      break;
    }
  }
  return sorted;
}
export {
  sortTablesByDependencies
};
