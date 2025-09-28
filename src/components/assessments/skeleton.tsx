import { Paper, Skeleton, Table } from "@mantine/core";

export function TableSkeleton() {
  return (
    <Paper withBorder shadow="sm">
      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Problem Name</Table.Th>
            <Table.Th>Description</Table.Th>
            <Table.Th>Created At</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
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
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Paper>
  );
}
