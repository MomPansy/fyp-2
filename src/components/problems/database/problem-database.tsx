import {
  ActionIcon,
  Button,
  Code,
  Drawer,
  DrawerBody,
  Group,
  Paper,
  Skeleton,
  Stack,
  Table,
  Title,
} from "@mantine/core";
import { TableManager } from "./table-manager /table-manager.tsx";
import { ForeignKeyMapping } from "./database-types.ts";
import { TableMetadata } from "../types.ts";
import { useProblemContext } from "../problem-context.ts";
import { useNavigate } from "@tanstack/react-router";
import { IconCheck, IconEdit, IconX } from "@tabler/icons-react";
import { ColumnType } from "server/drizzle/_custom.ts";
import { useDisclosure } from "@mantine/hooks";

interface ProblemDatabaseProps {
  tableMetadata: TableMetadata[];
  groupedMappings: Record<string, ForeignKeyMapping[]>;
  isLoading?: boolean;
}

export function ProblemDatabase({ tableMetadata, groupedMappings, isLoading }: ProblemDatabaseProps) {
  const [opened, { open, close }] = useDisclosure()
  const problemId = useProblemContext().problemId;

  const navigate = useNavigate();

  const handleSaveAndNavigate = async () => {
    try {
      // Navigation will be handled by the success case
      navigate({
        to: `/admin/problem/$id/create`,
        params: { id: problemId },
      })
    } catch (error) {
      // Error handling - stay on current page
      console.error("Save failed, not navigating:", error);
    }
  };


  return (
    <Paper p={20} >
      <Stack>
        <Title>Database Tables</Title>
        <TableManager />
        <DatabaseTable
          tableMetadata={tableMetadata}
          isLoading={isLoading}
          onViewColumns={open}
        />
      </Stack>
      <Group justify="flex-end" align='center' mt={20}>
        <Button
          color="blue"
          onClick={handleSaveAndNavigate}
        >
          Next Step
        </Button>
      </Group>
      <ColumnMetadataDrawer columnTypes={tableMetadata[0]?.columnTypes || []} opened={opened} onClose={close} />
    </Paper >
  );
}

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 3 }).map((_, index) => (
        <Table.Tr key={index}>
          <Table.Td>
            <Skeleton height={20} width="80%" />
          </Table.Td>
          <Table.Td>
            <Skeleton height={20} width="90%" />
          </Table.Td>
          <Table.Td>
            <Skeleton height={20} width="50%" />
          </Table.Td>
          <Table.Td>
            <Skeleton height={32} width="120px" />
          </Table.Td>
          <Table.Td>
            <Skeleton height={32} width={32} />
          </Table.Td>
        </Table.Tr>
      ))}
    </>
  );
}

interface DatabaseTableProps {
  tableMetadata: TableMetadata[];
  isLoading?: boolean;
  onViewColumns: () => void;
}

function DatabaseTable({ tableMetadata, isLoading, onViewColumns }: DatabaseTableProps) {
  return (
    <Table withTableBorder>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Table Name</Table.Th>
          <Table.Th>Description</Table.Th>
          <Table.Th>Rows</Table.Th>
          <Table.Th>Columns</Table.Th>
          <Table.Th>Action</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody bg='hf-grey'>
        {isLoading ? (
          <TableSkeleton />
        ) : (
          tableMetadata.map((table) => (
            <Table.Tr key={table.tableName}>
              <Table.Td>{table.tableName}</Table.Td>
              <Table.Td>{table.description}</Table.Td>
              <Table.Td>{table.numberOfRows || "N/A"}</Table.Td>
              <Table.Td>
                <Button variant="gradient" onClick={onViewColumns}>
                  {table.columnTypes.length} Columns
                </Button>
              </Table.Td>
              <Table.Td>
                <ActionIcon variant="subtle" >
                  <IconEdit />
                </ActionIcon>
              </Table.Td>
            </Table.Tr>
          ))
        )}
      </Table.Tbody>
    </Table>
  );
}

interface ColumnMetadataDrawerProps {
  columnTypes: ColumnType[];
  opened: boolean;
  onClose: () => void;
}

function ColumnMetadataDrawer({ columnTypes, opened, onClose }: ColumnMetadataDrawerProps) {
  return (
    <Drawer
      title="Column Metadata"
      opened={opened}
      onClose={onClose}
      position='right'
      size='lg'
    >
      <DrawerBody>
        <Table withTableBorder >
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Column Name</Table.Th>
              <Table.Th>Data Type</Table.Th>
              <Table.Th>Primary Key</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody bg='hf-grey'>
            {columnTypes.map((column) => (
              <Table.Tr key={column.column}>
                <Table.Td>{column.column}</Table.Td>
                <Table.Td><Code>
                  {column.type}
                </Code></Table.Td>
                <Table.Td>{column.isPrimaryKey ? <IconCheck /> : <IconX />}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </DrawerBody>
    </Drawer>
  )
}
