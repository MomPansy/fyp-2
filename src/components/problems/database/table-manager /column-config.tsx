import { Stack, SimpleGrid, TextInput, Checkbox, Text, Alert, ActionIcon, Flex, Button, ModalBody, Accordion, Select, AccordionPanel, Title, Code, Group, Table, Grid, SelectProps } from "@mantine/core";
import { IconAlertCircle, IconArrowRight, IconLink, IconTrash } from "@tabler/icons-react";
import { selectFilteredData, useCsvImportStore } from "./csv-import.store";
import { useDataStorage } from "@/hooks/use-storage";
import { useProblemContext } from "../../problem-context";
import { showSuccessNotification, showErrorNotification } from "@/components/notifications";
import { unparse } from "papaparse";
import { useState, useEffect, useMemo, memo } from "react";

import { useFetchColumnConfig, useFetchProblemTables } from "./hooks";
import { ForeignKeyMapping } from "../database-types";

export function ColumnConfig() {
  const { uploadFile } = useDataStorage();
  const { problemId } = useProblemContext();

  const { fileName, filteredColumns, columnTypes, setColumnTypes, close, reset } = useCsvImportStore();
  const rawDataLength = useCsvImportStore.getState().rawData.length;
  const onClose = () => {
    reset();
    close();
  };

  // Called at final save (after column config)
  const finalizeUpload = async () => {
    if (!fileName) return;

    const filteredData = selectFilteredData(useCsvImportStore.getState());
    const csvString = unparse(filteredData, { header: true, columns: filteredColumns });

    await uploadFile({
      csvString,
      tableName: fileName,
      problemId,
      columnTypes: columnTypes,
    }, {
      onSuccess: () => {
        showSuccessNotification({ title: "Save successful", message: `Table ${fileName} has been saved successfully.` });
        reset();
        close();
      },
      onError: (e) => {
        showErrorNotification({ title: "Save failed", message: e?.message ?? "Unexpected error." });
      }
    });
  };

  const list = columnTypes;
  const isPrimaryKeySelected = list.some(c => c.isPrimaryKey);

  return (
    <ModalBody p={0}>
      <Stack>
        <Text size="sm">
          Your table will be created with {rawDataLength} rows and the following {filteredColumns.length} columns.
        </Text>
        {!isPrimaryKeySelected && (
          <Alert icon={<IconAlertCircle />} color="red" title="Warning: No Primary Key Selected">
            Tables should have at least one column as the primary key to identify each row.
          </Alert>
        )}
        <Accordion
          multiple
          styles={{
            control: { paddingLeft: 0, paddingRight: 0 },
            content: { paddingLeft: 0, paddingRight: 0 },
          }}
        >
          <Accordion.Item value="column-config">
            <Accordion.Control>
              <Text size="sm" fw={500}>Configure Columns</Text>
            </Accordion.Control>
            <Accordion.Panel>
              <SimpleGrid cols={3} verticalSpacing='xs'>
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
            </Accordion.Panel>
          </Accordion.Item>
          <Accordion.Item value="Foreign Keys">
            <Accordion.Control>
              <Text size="sm" fw={500}>Configure Foreign Keys</Text>
            </Accordion.Control>
            <ConfigureForeignKeys />
          </Accordion.Item>
        </Accordion>
        <Flex gap="sm" justify="flex-end">
          <Button onClick={finalizeUpload}>Save</Button>
          <Button variant="subtle" color="red" onClick={onClose}>Cancel</Button>
        </Flex>
      </Stack>
    </ModalBody>
  );
}

function ConfigureForeignKeys() {
  // Fine-grained selectors to avoid re-renders
  const fileName = useCsvImportStore(s => s.fileName);
  const close = useCsvImportStore(s => s.close);

  // If fileName becomes falsy, close modal via effect (not during render)
  useEffect(() => {
    if (!fileName) {
      close();
    }
  }, [fileName, close]);

  const [table, setTable] = useState<string | undefined>(undefined);
  const problemId = useProblemContext().problemId;
  const { data } = useFetchProblemTables(problemId);

  // Memoize the table options to prevent unnecessary re-renders
  const tableOptions = useMemo(() => data.map(t => t.table_name), [data]);

  const handleTableChange = useMemo(() => (value: string | null) => {
    setTable(value || undefined);
  }, []);

  return (
    <AccordionPanel>
      <Stack>
        <Select
          label="Select a table"
          data={tableOptions}
          placeholder={tableOptions.length > 0 ? "Select a table" : "No tables available"}
          disabled={tableOptions.length === 0}
          onChange={handleTableChange}
          clearable
        />
        {table && (
          <RelationConfig tableName={table} problemId={problemId} />
        )}
      </Stack>
    </AccordionPanel>
  );
}
interface RelationConfigProps {
  tableName: string;
  problemId: string;
}
// TODO: Figure out rerendering issues with this component
const RelationConfig = memo(({ tableName, problemId }: RelationConfigProps) => {
  const { data } = useFetchColumnConfig(problemId, tableName);
  const [localRelations, setLocalRelations] = useState<ForeignKeyMapping[]>([]);

  // Extract column types from the first row if available
  const { column_types } = data
  const baseColumnTypes = useCsvImportStore(s => s.columnTypes);
  const baseTableName = useCsvImportStore(s => s.fileName);

  const renderSelectOption: SelectProps["renderOption"] = ({ option }) => {
    const columnData = column_types.find(c => c.column === option.value);
    return (
      <Group>
        <Text size="sm">{option.label}</Text>
        <Code>{columnData?.type}</Code>
      </Group>
    );
  };

  const addRelation = () => {
    setLocalRelations(prev => [...prev, {
      baseTableName: baseTableName || '',
      baseColumnName: '',
      baseColumnType: '',
      foreignTableName: tableName,
      foreignTableColumn: '',
      foreignTableType: ''
    }]);
  };

  // Update a specific relation
  const updateRelation = (index: number, field: keyof ForeignKeyMapping, value: string) => {
    setLocalRelations(prev => prev.map((relation, i) =>
      i === index ? { ...relation, [field]: value } : relation
    ));
  };

  // Update relation with type information
  const updateRelationWithType = (index: number, columnName: string, isBase: boolean) => {
    const columnData = isBase
      ? baseColumnTypes.find(c => c.column === columnName)
      : column_types.find(c => c.column === columnName);

    if (!columnData) return;

    setLocalRelations(prev => prev.map((relation, i) =>
      i === index ? {
        ...relation,
        ...(isBase ? {
          baseColumnName: columnName,
          baseColumnType: columnData.type
        } : {
          foreignTableColumn: columnName,
          foreignTableType: columnData.type
        })
      } : relation
    ));
  };

  // Remove a relation
  const removeRelation = (index: number) => {
    setLocalRelations(prev => prev.filter((_, i) => i !== index));
  };

  // Initialize with one empty relation if none exist
  useEffect(() => {
    if (localRelations.length === 0) {
      addRelation();
    }
  }, [localRelations.length]);

  return (
    <Stack>
      <Text size='sm'>Select columns from <Code>{tableName}</Code> to reference</Text>
      <Stack gap='xs'>
        <Grid >
          <Grid.Col span={5}>
            <Text size="xs" fw={400}>Base Column</Text>
          </Grid.Col>
          <Grid.Col span={1} />
          <Grid.Col span={5} >
            <Group justify="flex-end" >
              <Text size="xs" fw={400} >Foreign Column</Text>
            </Group>
          </Grid.Col>
          <Grid.Col span={1} />
        </Grid>
        {localRelations.map((relation, index) => (
          <Grid key={index} justify="center" align="center">
            <Grid.Col span={5}>
              <Select
                data={baseColumnTypes.map(c => ({ value: c.column, label: c.column }))}
                renderOption={renderSelectOption}
                placeholder="Select base column"
                value={relation.baseColumnName}
                onChange={(value) => updateRelationWithType(index, value || '', true)}
              />
            </Grid.Col>
            <Grid.Col span={1}>
              <IconArrowRight />
            </Grid.Col>
            <Grid.Col span={5}>
              <Select
                data={column_types.map((c) => c.column)}
                renderOption={renderSelectOption}
                placeholder="Select foreign column"
                value={relation.foreignTableColumn}
                onChange={(value) => updateRelationWithType(index, value || '', false)}
              />
            </Grid.Col>
            <Grid.Col span={1}>
              <ActionIcon
                variant="light"
                color="red"
                size='sm'
                onClick={() => removeRelation(index)}
              >
                <IconTrash />
              </ActionIcon>
            </Grid.Col>
          </Grid>
        ))}
        <Button
          variant="light"
          size="sm"
          onClick={addRelation}
          leftSection={<IconLink size={16} />}
        >
          Add Foreign Key Relation
        </Button>
      </Stack>
    </Stack>
  );
});

