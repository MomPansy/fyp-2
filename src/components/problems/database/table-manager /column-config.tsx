import { memo, useCallback, useEffect, useMemo, useState, Fragment } from 'react';
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
} from '@mantine/core';
import { IconAlertCircle, IconArrowRight, IconLink, IconTrash } from '@tabler/icons-react';
import { unparse } from 'papaparse';
import { useCsvImportStore } from './csv-import.store';
import { useDataStorage } from '@/hooks/use-storage';
import { useProblemContext } from '../../problem-context';
import { showErrorNotification, showSuccessNotification } from '@/components/notifications';
import { useFetchColumnConfig, useFetchProblemTables } from './hooks';
import { ForeignKeyMapping } from '../database-types';
import { ColumnType } from 'server/drizzle/_custom';

// ---------------------- Pure Utilities ----------------------
function buildCsvString(filteredData: unknown[], filteredColumns: string[]) {
  return unparse(filteredData, { header: true, columns: filteredColumns });
}

function togglePrimaryKey(columnTypes: ColumnType[], index: number): ColumnType[] {
  const updated = [...columnTypes];
  updated[index] = { ...updated[index], isPrimaryKey: !updated[index].isPrimaryKey };
  return updated;
}

// ---------------------- Hooks ----------------------
function useColumnConfigUpload() {
  const { uploadFile } = useDataStorage();
  const { problemId } = useProblemContext();

  const fileName = useCsvImportStore(s => s.fileName);
  const filteredColumns = useCsvImportStore(s => s.filteredColumns);
  const columnTypes = useCsvImportStore(s => s.columnTypes);
  const getFilteredData = useCsvImportStore.getState().getFilteredData; // pure, safe to use directly

  const reset = useCsvImportStore.getState().reset;
  const close = useCsvImportStore.getState().close;

  const finalizeUpload = useCallback(async () => {
    if (!fileName) return;
    const filteredData = getFilteredData();
    const csvString = buildCsvString(filteredData, filteredColumns);

    await uploadFile({
      csvString,
      tableName: fileName,
      problemId,
      columnTypes,
    }, {
      onSuccess: () => {
        showSuccessNotification({ title: 'Save successful', message: `Table ${fileName} has been saved successfully.` });
        reset();
        close();
      },
      onError: (e) => {
        showErrorNotification({ title: 'Save failed', message: (e as Error)?.message ?? 'Unexpected error.' });
      },
    });
  }, [fileName, filteredColumns, columnTypes, uploadFile, problemId, getFilteredData, reset, close]);

  return { finalizeUpload };
}

// Manage foreign key relation local state for a target table
function useForeignKeyRelations(baseTableName: string | undefined, foreignTableName: string, baseColumnTypes: ColumnType[], foreignColumnTypes: { column: string; type: string }[]) {
  const [relations, setRelations] = useState<ForeignKeyMapping[]>([{
    baseTableName: baseTableName || '',
    baseColumnName: '',
    baseColumnType: '',
    foreignTableName,
    foreignTableColumn: '',
    foreignTableType: '',
  }]);

  const addRelation = useCallback(() => {
    setRelations(prev => ([...prev, {
      baseTableName: baseTableName || '',
      baseColumnName: '',
      baseColumnType: '',
      foreignTableName,
      foreignTableColumn: '',
      foreignTableType: '',
    }]));
  }, [foreignTableName, baseTableName]);

  const removeRelation = useCallback((index: number) => {
    setRelations(prev => prev.filter((_, i) => i !== index));
  }, []);

  const updateRelationWithType = useCallback((index: number, columnName: string, isBase: boolean) => {
    const columnData = isBase
      ? baseColumnTypes.find(c => c.column === columnName)
      : foreignColumnTypes.find(c => c.column === columnName);
    if (!columnData) return;
    setRelations(prev => prev.map((relation, i) => i === index ? {
      ...relation,
      ...(isBase ? {
        baseColumnName: columnName,
        baseColumnType: columnData.type,
      } : {
        foreignTableColumn: columnName,
        foreignTableType: columnData.type,
      }),
    } : relation));
  }, [baseColumnTypes, foreignColumnTypes]);

  return { relations, addRelation, removeRelation, updateRelationWithType };
}

// ---------------------- Presentation Subcomponents ----------------------
interface PrimaryKeyConfiguratorProps {
  columnTypes: ReturnType<typeof useCsvImportStore.getState>['columnTypes'];
  onToggle: (index: number) => void;
}
const PrimaryKeyConfigurator = memo(({ columnTypes, onToggle }: PrimaryKeyConfiguratorProps) => {
  return (
    <SimpleGrid cols={3} verticalSpacing="xs">
      <Text size="sm" fw={400}>Name</Text>
      <Text size="sm" fw={400}>Type</Text>
      <Text size="sm" fw={400}>Primary</Text>
      {columnTypes.map((columnConfig, index) => (
        <Fragment key={columnConfig.column}>
          <TextInput
            size="sm"
            value={columnConfig.column}
            readOnly
            rightSection={<ActionIcon variant="light" c="indigo" size="sm"><IconLink /></ActionIcon>}
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
});
PrimaryKeyConfigurator.displayName = 'PrimaryKeyConfigurator';

interface ForeignTableSelectorProps { problemId: string; }
const ForeignTableSelector = ({ problemId }: ForeignTableSelectorProps) => {
  const [selectedTable, setSelectedTable] = useState<string | undefined>();
  const { data } = useFetchProblemTables(problemId);
  const tableOptions = useMemo(() => data.map(t => t.table_name), [data]);
  const handleChange = useCallback((value: string | null) => setSelectedTable(value || undefined), []);

  return (
    <AccordionPanel>
      <Stack>
        <Select
          label="Select a table"
          data={tableOptions}
          placeholder={tableOptions.length > 0 ? 'Select a table' : 'No tables available'}
          disabled={tableOptions.length === 0}
          onChange={handleChange}
          clearable
          value={selectedTable}
        />
        {selectedTable && <RelationConfig tableName={selectedTable} problemId={problemId} />}
      </Stack>
    </AccordionPanel>
  );
};

interface RelationConfigProps { tableName: string; problemId: string; }

const RelationConfig = memo(({ tableName, problemId }: RelationConfigProps) => {
  const { data } = useFetchColumnConfig(problemId, tableName);
  const { column_types } = data;
  const baseColumnTypes = useCsvImportStore(s => s.columnTypes);
  const baseTableName = useCsvImportStore(s => s.fileName);

  const { relations, addRelation, removeRelation, updateRelationWithType } = useForeignKeyRelations(baseTableName, tableName, baseColumnTypes, column_types);

  const baseColumnSelectData = useMemo(() => baseColumnTypes.map(c => ({
    value: c.column,
    label: c.column,
    disabled: relations.some(r => r.baseColumnName === c.column),
  })), [baseColumnTypes, relations]);

  const renderForeignOption: SelectProps['renderOption'] = useCallback((props: { option: { value: string; label: string } }) => {
    const { option } = props;
    const columnData = column_types.find(c => c.column === option.value);
    return (
      <Group>
        <Text size="sm">{option.label}</Text>
        <Code>{columnData?.type}</Code>
      </Group>
    );
  }, [column_types]);

  const renderBaseOption: SelectProps['renderOption'] = useCallback((props: { option: { value: string; label: string } }) => {
    const { option } = props;
    const columnData = baseColumnTypes.find(c => c.column === option.value);
    return (
      <Group>
        <Text size="sm">{option.label}</Text>
        <Code>{columnData?.type}</Code>
      </Group>
    );
  }, [baseColumnTypes]);

  const handleAddRelation = useCallback(() => addRelation(), [addRelation]);

  const handleSaveRelations = useCallback(() => {
    // TODO: integrate with API call to persist relations
    // For now just log.
    // eslint-disable-next-line no-console
    console.log('Saving relations', relations);
  }, [relations]);

  return (
    <Stack>
      <Text size="sm">Select columns from <Code>{tableName}</Code> to reference</Text>
      <Stack gap="xs">
        <Grid>
          <Grid.Col span={5}><Text size="xs" fw={400}>Base Column</Text></Grid.Col>
          <Grid.Col span={1} />
          <Grid.Col span={5}>
            <Group justify="flex-end"><Text size="xs" fw={400}>Foreign Column</Text></Group>
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
                onChange={(value) => updateRelationWithType(index, value || '', true)}
              />
            </Grid.Col>
            <Grid.Col span={1}><IconArrowRight /></Grid.Col>
            <Grid.Col span={5}>
              <Select
                data={column_types.map(c => c.column)}
                renderOption={renderForeignOption}
                placeholder="Select foreign column"
                value={relation.foreignTableColumn}
                onChange={(value) => updateRelationWithType(index, value || '', false)}
              />
            </Grid.Col>
            <Grid.Col span={1}>
              <ActionIcon variant="light" color="red" size="sm" onClick={() => removeRelation(index)}>
                <IconTrash />
              </ActionIcon>
            </Grid.Col>
          </Grid>
        ))}
        <Group justify="space-between">
          <Button variant="light" size="sm" onClick={handleAddRelation} leftSection={<IconLink size={16} />}>Add Relation</Button>
          <Button variant="default" size="sm" onClick={handleSaveRelations}>Save Relations</Button>
        </Group>
      </Stack>
    </Stack>
  );
});
RelationConfig.displayName = 'RelationConfig';

// ---------------------- Root Component ----------------------
export function ColumnConfig() {
  const rawDataLength = useCsvImportStore(s => s.rawData.length);
  const filteredColumns = useCsvImportStore(s => s.filteredColumns);
  const columnTypes = useCsvImportStore(s => s.columnTypes);
  const setColumnTypes = useCsvImportStore.getState().setColumnTypes; // action: no subscription needed
  const isPrimaryKeySelected = useCsvImportStore(s => s.columnTypes.some(c => c.isPrimaryKey));
  const fileName = useCsvImportStore(s => s.fileName);

  const close = useCsvImportStore.getState().close;
  const reset = useCsvImportStore.getState().reset;

  const { problemId } = useProblemContext();
  const { finalizeUpload } = useColumnConfigUpload();

  const onClose = useCallback(() => { reset(); close(); }, [reset, close]);

  const handleTogglePrimaryKey = useCallback((index: number) => {
    setColumnTypes(togglePrimaryKey(columnTypes, index));
  }, [columnTypes, setColumnTypes]);

  return (
    <ModalBody p={0}>
      <Stack>
        <Text size="sm">Your table will be created with {rawDataLength} rows and the following {filteredColumns.length} columns.</Text>
        {!isPrimaryKeySelected && (
          <Alert icon={<IconAlertCircle />} color="red" title="Warning: No Primary Key Selected">
            Tables should have at least one column as the primary key to identify each row.
          </Alert>
        )}
        <Accordion multiple styles={{ control: { paddingLeft: 0, paddingRight: 0 }, content: { paddingLeft: 0, paddingRight: 0 } }}>
          <Accordion.Item value="column-config">
            <Accordion.Control><Text size="sm" fw={500}>Configure Columns</Text></Accordion.Control>
            <Accordion.Panel>
              <PrimaryKeyConfigurator columnTypes={columnTypes} onToggle={handleTogglePrimaryKey} />
            </Accordion.Panel>
          </Accordion.Item>
          <Accordion.Item value="foreign-keys">
            <Accordion.Control><Text size="sm" fw={500}>Configure Foreign Keys</Text></Accordion.Control>
            <ForeignTableSelector problemId={problemId} />
          </Accordion.Item>
        </Accordion>
        <Flex gap="sm" justify="flex-end">
          <Button onClick={finalizeUpload} disabled={!fileName}>Save</Button>
          <Button variant="subtle" color="red" onClick={onClose}>Cancel</Button>
        </Flex>
      </Stack>
    </ModalBody>
  );
}

