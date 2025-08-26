import { Skeleton, Table, } from "@mantine/core";

export function ProblemDatabasePending() {
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
