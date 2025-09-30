import {
  Group,
  Paper,
  Stack,
  TagsInput,
  TagsInputProps,
  TextInput,
  Highlight,
  Text,
  PaperProps,
  Title,
  Divider,
} from "@mantine/core";
import { useCallback, useState } from "react";
import {
  useDebouncedValue,
  useFocusWithin,
  useDebouncedCallback,
} from "@mantine/hooks";
import { IconFilter } from "@tabler/icons-react";
import { AssessmentListFilters } from "@/components/assessments/query-keys.ts";
import { useFetchUsers } from "@/components/assessments/hooks.ts";

interface FiltersProps extends PaperProps {
  filters: AssessmentListFilters;
  setFilters: (filters: AssessmentListFilters) => void;
}

interface UserFilterProps {
  filters: AssessmentListFilters;
  setFilters: (filters: AssessmentListFilters) => void;
}

export function Filters({ filters, setFilters, ...props }: FiltersProps) {
  const [searchValue, setSearchValue] = useState<string | undefined>(undefined);

  const debouncedSetFilters = useDebouncedCallback(
    (value: string | undefined) => {
      setFilters({ ...filters, name: value });
    },
    200,
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.currentTarget.value;
    setSearchValue(value);
    debouncedSetFilters(value);
  };

  return (
    <Paper withBorder p="md" h="100%" {...props}>
      <Group gap="xs">
        <Title order={3}>Filters</Title>
        <IconFilter />
      </Group>
      <Divider my="xs" />
      <Stack>
        <TextInput
          label="Search assessment"
          placeholder="Search for an assessment"
          value={searchValue}
          onChange={handleSearchChange}
        />
        <UserFilter filters={filters} setFilters={setFilters} />
      </Stack>
    </Paper>
  );
}

export function UserFilter({ filters, setFilters }: UserFilterProps) {
  const [searchValue, setSearchValue] = useState<string | undefined>(undefined);
  const [debouncedSearchValue] = useDebouncedValue(searchValue, 200);
  const { ref, focused } = useFocusWithin();

  const { data: users } = useFetchUsers(
    focused,
    debouncedSearchValue,
    // Transform the data into the format TagsInput expects
    (data) =>
      data.map((user) => ({
        value: user.id,
        label: user.email,
      })),
  );

  const renderTagsInputOption: TagsInputProps["renderOption"] = ({
    option,
  }) => (
    <Group>
      <Text size="sm">
        <Highlight highlight={searchValue ?? ""}>
          {String(
            (option as { label?: string; value: string }).label ?? option.value,
          )}
        </Highlight>
      </Text>
    </Group>
  );

  const handleUserChange = useCallback(
    (value: string[]) => {
      setFilters({ ...filters, users: value });
    },
    [filters, setFilters],
  );

  return (
    <TagsInput
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      placeholder="Search for users"
      clearable
      ref={ref}
      data={users}
      acceptValueOnBlur={false}
      renderOption={renderTagsInputOption}
      label="Filter by users"
      onChange={handleUserChange}
    />
  );
}
