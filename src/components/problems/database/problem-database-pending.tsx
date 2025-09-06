import { Skeleton, Table } from "@mantine/core";

export function ProblemDatabasePending() {
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
      <Table.Tbody bg="hf-grey">
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
      </Table.Tbody>
    </Table>
  );
}
