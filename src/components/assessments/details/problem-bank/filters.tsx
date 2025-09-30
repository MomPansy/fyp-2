import { Divider, Group, Paper, Stack, TextInput, Title } from "@mantine/core";
import { IconFilter } from "@tabler/icons-react";
import { useState } from "react";
import { useDebouncedCallback } from "@mantine/hooks";
import { ProblemBankFiltersProps } from "./types.ts";

export function ProblemBankFilters({
  filters,
  setFilters,
  ...props
}: ProblemBankFiltersProps) {
  const [searchValue, setSearchValue] = useState<string | undefined>(undefined);
  const debouncedSetFilters = useDebouncedCallback(
    (value: string | undefined) => {
      setFilters({ ...filters, search: value });
    },
    200,
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.currentTarget.value;
    setSearchValue(value);
    debouncedSetFilters(value);
  };

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
          value={searchValue}
          onChange={handleSearchChange}
        />
      </Stack>
    </Paper>
  );
}
