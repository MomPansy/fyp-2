import { Divider, Group, Paper, Stack, TextInput, Title } from "@mantine/core";
import { IconFilter } from "@tabler/icons-react";
import { ProblemBankFiltersProps } from "./types.ts";

export function ProblemBankFilters({
  filters,
  setFilters,
  ...props
}: ProblemBankFiltersProps) {
  return (
    <Paper withBorder p="md" {...props}>
      <Group gap="xs">
        <Title order={3}>Filters</Title>
        <IconFilter />
      </Group>
      <Divider my="xs" />
      <Stack>
        <TextInput
          label="Search problems"
          placeholder="Search for a problem"
          value={filters.search ?? ""}
          onChange={(e) =>
            setFilters({ ...filters, search: e.currentTarget.value })
          }
        />
      </Stack>
    </Paper>
  );
}
