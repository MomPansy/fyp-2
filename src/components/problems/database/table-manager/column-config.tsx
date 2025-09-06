import {
  memo,
  useCallback,
  useMemo,
  useState,
  Fragment,
  Suspense,
} from "react";
import {
  Accordion,
  ActionIcon,
  Alert,
  Button,
  Checkbox,
  Code,
  Flex,
  Grid,
  Group,
  ModalBody,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  SelectProps,
  AccordionPanel,
  Textarea,
  LoadingOverlay,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconArrowRight,
  IconLink,
  IconTrash,
} from "@tabler/icons-react";
import { unparse } from "papaparse";
import { usePGlite } from "@electric-sql/pglite-react";
import { useParams } from "@tanstack/react-router";
import { useCsvImportStore } from "./csv-import.store.ts";
import { useFetchColumnConfig, useFetchProblemTables } from "./hooks.ts";
import { useDataStorage } from "@/hooks/use-storage.ts";
import {
  showErrorNotification,
  showSuccessNotification,
} from "@/components/notifications.ts";
import { ColumnType } from "server/drizzle/_custom.ts";

// ---------------------- Pure Utilities ----------------------
function buildCsvString(filteredData: unknown[], filteredColumns: string[]) {
  return unparse(filteredData, { header: true, columns: filteredColumns });
}

function togglePrimaryKey(
  columnTypes: ColumnType[],
  index: number,
): ColumnType[] {
  const updated = [...columnTypes];
  updated[index] = {
    ...updated[index],
    isPrimaryKey: !updated[index].isPrimaryKey,
  };
  return updated;
}

// ---------------------- Hooks ----------------------
function useColumnConfigUpload() {
  const { uploadFile } = useDataStorage();
  const { id: problemId } = useParams({
    from: "/_admin/admin/problem/$id/database",
  });

  const fileName = useCsvImportStore((s) => s.fileName);
  const filteredColumns = useCsvImportStore((s) => s.filteredColumns);
  const columnTypes = useCsvImportStore((s) => s.columnTypes);
  const getFilteredData = useCsvImportStore.getState().getFilteredData;
  const description = useCsvImportStore((s) => s.description);
  const relations = useCsvImportStore((s) => s.relations);
  const tableId = useCsvImportStore((s) => s.tableId);

  const reset = useCsvImportStore.getState().reset;
  const close = useCsvImportStore.getState().close;

  const finalizeUpload = () => {
    if (!fileName) return;
    const filteredData = getFilteredData();
    const numberOfRows = filteredData.length;
    const csvString = buildCsvString(filteredData, filteredColumns);

    uploadFile(
      {
        tableId,
        csvString,
        tableName: fileName,
        problemId,
        columnTypes,
        numberOfRows,
        description,
        relations,
      },
      {
        onSuccess: () => {
          showSuccessNotification({
            title: "Save successful",
            message: `Table ${fileName} has been saved successfully.`,
          });
          reset();
          close();
        },
        onError: (e) => {
          showErrorNotification({
            title: "Save failed",
            message: e.message,
          });
        },
      },
    );
  };

  return { finalizeUpload };
}

// ---------------------- Presentation Subcomponents ----------------------
interface PrimaryKeyConfiguratorProps {
  columnTypes: ReturnType<typeof useCsvImportStore.getState>["columnTypes"];
  onToggle: (index: number) => void;
}
const PrimaryKeyConfigurator = memo(
  ({ columnTypes, onToggle }: PrimaryKeyConfiguratorProps) => {
    return (
      <SimpleGrid cols={3} verticalSpacing="xs">
        <Text size="sm" fw={400}>
          Name
        </Text>
        <Text size="sm" fw={400}>
          Type
        </Text>
        <Text size="sm" fw={400}>
          Primary
        </Text>
        {columnTypes.map((columnConfig, index) => (
          <Fragment key={columnConfig.column}>
            <TextInput
              size="sm"
              value={columnConfig.column}
              readOnly
              rightSection={
                <ActionIcon variant="light" c="indigo" size="sm">
                  <IconLink />
                </ActionIcon>
              }
            />
            <TextInput size="sm" value={columnConfig.type} readOnly />
            <Stack justify="center" align="flex-start">
              <Checkbox
                size="sm"
                checked={!!columnConfig.isPrimaryKey}
                onChange={() => onToggle(index)}
              />
            </Stack>
          </Fragment>
        ))}
      </SimpleGrid>
    );
  },
);
PrimaryKeyConfigurator.displayName = "PrimaryKeyConfigurator";

interface ForeignTableSelectorProps {
  problemId: string;
}
const ForeignTableSelector = ({ problemId }: ForeignTableSelectorProps) => {
  const [selectedTableId, setSelectedTableId] = useState<string | undefined>();
  const tableName = useCsvImportStore((s) => s.fileName);
  const { data } = useFetchProblemTables(problemId);
  const tableOptions = data
    .map((t) => ({ value: t.tableId, label: t.tableName }))
    .filter((t) => t.label !== tableName); // exclude self
  const handleChange = (value: string | null) => {
    setSelectedTableId(value ?? undefined);
  };

  const getTableNameById = (tableId: string) => {
    const table = data.find((t) => t.tableId === tableId);
    return table ? table.tableName : tableId;
  };

  return (
    <AccordionPanel>
      <Stack>
        <Select
          label="Select a table"
          data={tableOptions}
          placeholder={
            tableOptions.length > 0 ? "Select a table" : "No tables available"
          }
          disabled={tableOptions.length === 0}
          onChange={handleChange}
          clearable
        />
        {selectedTableId && (
          <RelationConfig
            foreignTableId={selectedTableId}
            foreignTableName={getTableNameById(selectedTableId)}
            problemId={problemId}
          />
        )}
      </Stack>
    </AccordionPanel>
  );
};

interface RelationConfigProps {
  foreignTableId: string;
  foreignTableName: string;
  problemId: string;
}

const RelationConfig = memo(
  ({ foreignTableId, foreignTableName, problemId }: RelationConfigProps) => {
    const { data: foreignTableConfig } = useFetchColumnConfig(
      problemId,
      foreignTableId,
    );
    const { column_types: foreignTableTypes } = foreignTableConfig;
    const baseColumnTypes = useCsvImportStore((s) => s.columnTypes);

    const relations = useCsvImportStore((s) => s.relations);
    const addRelation = useCsvImportStore((s) => s.addRelation);
    const removeRelation = useCsvImportStore((s) => s.removeRelation);
    const updateRelations = useCsvImportStore((s) => s.updateRelation);

    const baseColumnSelectData = useMemo(
      () =>
        baseColumnTypes.map((c) => ({
          value: c.column,
          label: c.column,
          disabled: relations.some((r) => r.baseColumnName === c.column),
        })),
      [baseColumnTypes, relations],
    );

    const renderForeignOption: SelectProps["renderOption"] = useCallback(
      (props: { option: { value: string; label: string } }) => {
        const { option } = props;
        const columnData = foreignTableTypes.find(
          (c) => c.column === option.value,
        );
        return (
          <Group>
            <Text size="sm">{option.label}</Text>
            <Code>{columnData?.type}</Code>
          </Group>
        );
      },
      [foreignTableTypes],
    );

    const renderBaseOption: SelectProps["renderOption"] = useCallback(
      (props: { option: { value: string; label: string } }) => {
        const { option } = props;
        const columnData = baseColumnTypes.find(
          (c) => c.column === option.value,
        );
        return (
          <Group>
            <Text size="sm">{option.label}</Text>
            <Code>{columnData?.type}</Code>
          </Group>
        );
      },
      [baseColumnTypes],
    );

    return (
      <Stack>
        <Text size="sm">
          Select columns from <Code>{foreignTableName}</Code> to reference
        </Text>
        <Stack gap="xs">
          <Grid>
            <Grid.Col span={5}>
              <Text size="xs" fw={400}>
                Base Column
              </Text>
            </Grid.Col>
            <Grid.Col span={1} />
            <Grid.Col span={5}>
              <Group justify="flex-end">
                <Text size="xs" fw={400}>
                  Foreign Column
                </Text>
              </Group>
            </Grid.Col>
            <Grid.Col span={1} />
          </Grid>
          {relations.map((relation, index) => (
            <Grid key={index} justify="center" align="center">
              <Grid.Col span={5}>
                <Select
                  data={baseColumnSelectData}
                  renderOption={renderBaseOption}
                  placeholder="Select base column"
                  value={relation.baseColumnName}
                  onChange={(value) =>
                    updateRelations(index, value ?? "", true, foreignTableTypes)
                  }
                />
              </Grid.Col>
              <Grid.Col span={1}>
                <IconArrowRight />
              </Grid.Col>
              <Grid.Col span={5}>
                <Select
                  data={foreignTableTypes.map((c) => c.column)}
                  renderOption={renderForeignOption}
                  placeholder="Select foreign column"
                  value={relation.foreignTableColumn}
                  onChange={(value) =>
                    updateRelations(
                      index,
                      value ?? "",
                      false,
                      foreignTableTypes,
                    )
                  }
                />
              </Grid.Col>
              <Grid.Col span={1}>
                <ActionIcon
                  variant="light"
                  color="red"
                  size="sm"
                  onClick={() => removeRelation(index)}
                >
                  <IconTrash />
                </ActionIcon>
              </Grid.Col>
            </Grid>
          ))}
          <Group justify="space-between">
            <Button
              variant="light"
              size="sm"
              onClick={() => addRelation(foreignTableName)}
              leftSection={<IconLink size={16} />}
            >
              Add Relation
            </Button>
          </Group>
        </Stack>
      </Stack>
    );
  },
);
RelationConfig.displayName = "RelationConfig";

// ---------------------- Root Component ----------------------
export function ColumnConfig() {
  const db = usePGlite();
  const rawDataLength = useCsvImportStore((s) => s.rawData.length);
  const filteredColumns = useCsvImportStore((s) => s.filteredColumns);
  const columnTypes = useCsvImportStore((s) => s.columnTypes);
  const setColumnTypes = useCsvImportStore.getState().setColumnTypes; // action: no subscription needed
  const isPrimaryKeySelected = useCsvImportStore((s) =>
    s.columnTypes.some((c) => c.isPrimaryKey),
  );
  const fileName = useCsvImportStore((s) => s.fileName);
  const tableDescription = useCsvImportStore((s) => s.description);
  const setTableDescription = useCsvImportStore((s) => s.setDescription);

  const close = useCsvImportStore.getState().close;
  const reset = useCsvImportStore.getState().reset;
  const save = useCsvImportStore.getState().save;

  const { id: problemId } = useParams({
    from: "/_admin/admin/problem/$id/database",
  });

  const { finalizeUpload } = useColumnConfigUpload();

  const onClose = useCallback(() => {
    reset();
    close();
  }, [reset, close]);

  const handleTogglePrimaryKey = useCallback(
    (index: number) => {
      setColumnTypes(togglePrimaryKey(columnTypes, index));
    },
    [columnTypes, setColumnTypes],
  );

  const onSave = async () => {
    try {
      await save(db);
      finalizeUpload();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      // do nothing
    }
  };
  return (
    <ModalBody p={0}>
      <Stack>
        <Text size="sm">
          Your table will be created with {rawDataLength} rows and the following{" "}
          {filteredColumns.length} columns.
        </Text>
        {!isPrimaryKeySelected && (
          <Alert
            icon={<IconAlertCircle />}
            color="red"
            title="Warning: No Primary Key Selected"
          >
            Tables should have at least one column as the primary key to
            identify each row.
          </Alert>
        )}
        <Textarea
          label="Table Description"
          value={tableDescription}
          onChange={(e) => setTableDescription(e.currentTarget.value)}
          placeholder="Set table description"
        />
        <Accordion
          multiple
          styles={{
            control: { paddingLeft: 0, paddingRight: 0 },
            content: { paddingLeft: 0, paddingRight: 0 },
          }}
          defaultValue={["column-config"]}
        >
          <Accordion.Item value="column-config">
            <Accordion.Control>
              <Text size="sm" fw={500}>
                Configure Columns
              </Text>
            </Accordion.Control>
            <Accordion.Panel>
              <PrimaryKeyConfigurator
                columnTypes={columnTypes}
                onToggle={handleTogglePrimaryKey}
              />
            </Accordion.Panel>
          </Accordion.Item>
          <Accordion.Item value="foreign-keys">
            <Accordion.Control>
              <Text size="sm" fw={500}>
                Configure Foreign Keys
              </Text>
            </Accordion.Control>
            <Suspense fallback={<LoadingOverlay />}>
              <ForeignTableSelector problemId={problemId} />
            </Suspense>
          </Accordion.Item>
        </Accordion>
        <Flex gap="sm" justify="flex-end">
          <Button
            onClick={onSave}
            disabled={!fileName || !isPrimaryKeySelected}
          >
            Save
          </Button>
          <Button variant="subtle" color="red" onClick={onClose}>
            Cancel
          </Button>
        </Flex>
      </Stack>
    </ModalBody>
  );
}
