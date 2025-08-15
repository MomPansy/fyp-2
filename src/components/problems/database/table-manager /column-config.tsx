import { Stack, SimpleGrid, TextInput, Checkbox, Text, Alert, ActionIcon, Flex, Button, ModalBody } from "@mantine/core";
import { IconAlertCircle, IconLink } from "@tabler/icons-react";
import { useCsvImport } from "./csv-import-context";

export function ColumnConfig() {
  const { columnTypes, setColumnTypes, filteredColumns, filteredData, finalizeUpload, onClose } = useCsvImport();

  const list = columnTypes;
  const isPrimaryKeySelected = list.some(c => c.isPrimaryKey);

  return (
    <ModalBody p={0}>
      <Stack>
        {!isPrimaryKeySelected && (
          <Alert icon={<IconAlertCircle />} color="red" title="Warning: No Primary Key Selected">
            Tables should have at least one column as the primary key to identify each row.
          </Alert>
        )}
        <Text size="sm">
          Your table will be created with {filteredData.length} rows and the following {filteredColumns.length} columns.
        </Text>
        <SimpleGrid cols={3}>
          <Text size="sm" fw={400}>Name</Text>
          <Text size="sm" fw={400}>Type</Text>
          <Text size="sm" fw={400}>Primary</Text>
          {list.map((columnConfig, index) => (
            <>
              <TextInput key={`name-${index}`} size="sm" value={columnConfig.column} readOnly rightSection={<ActionIcon variant="light" c='indigo' size='sm'>
                <IconLink />
              </ActionIcon>} />
              <TextInput key={`type-${index}`} size="sm" value={columnConfig.type} readOnly />
              <Stack justify="center" align="flex-start" key={`pk-${index}`}>
                <Checkbox key={`pk-${index}`} size="sm" checked={!!columnConfig.isPrimaryKey} onChange={() => {
                  const updated = [...list];
                  updated[index] = { ...updated[index], isPrimaryKey: !updated[index].isPrimaryKey };
                  setColumnTypes(updated);
                }} />
              </Stack>
            </>
          ))}
        </SimpleGrid>
        <Flex gap="sm" justify="flex-end">
          <Button onClick={() => finalizeUpload(filteredData, filteredColumns, list)}>Save</Button>
          <Button variant="subtle" color="red" onClick={onClose}>Cancel</Button>
        </Flex>
      </Stack>
    </ModalBody>
  );
}
