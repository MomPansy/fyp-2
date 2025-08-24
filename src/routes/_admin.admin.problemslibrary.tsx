import { useProblemsQuery, fetchProblemsPage } from '@/components/problems-library/hooks';
import { ProblemListFilters, ProblemListSorting, problemLibraryKeys } from '@/components/problems-library/query-keys';
import { ActionIcon, Group, Pagination, Paper, Skeleton, Stack, Table, TextInput } from '@mantine/core';
import { useDebouncedValue, usePagination } from '@mantine/hooks';
import { IconArrowsUpDown, IconFilter } from '@tabler/icons-react';
import { createFileRoute } from '@tanstack/react-router';
import { Suspense, useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export const Route = createFileRoute('/_admin/admin/problemslibrary')({
  component: RouteComponent,
});

function RouteComponent() {
  const [filters, setFilters] = useState<ProblemListFilters>({ search: undefined });
  const [sorting, setSorting] = useState<ProblemListSorting>({
    sortOptions: [{ sortBy: 'created_at', order: 'desc' }],
  });

  return (
    <Stack maw='80rem' mx='auto' mt='2rem'>
      <Header filters={filters} setFilters={setFilters} />
      <List filters={filters} sorting={sorting} />
    </Stack>
  );
}

function TableSkeleton() {
  return (
    <Paper withBorder shadow='sm'>
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

interface HeaderProps {
  filters: ProblemListFilters;
  setFilters: (filters: ProblemListFilters) => void;
}

function Header({ filters, setFilters }: HeaderProps) {
  return (
    <Group>
      <TextInput
        placeholder='Search problems...'
        value={filters.search ?? ''}
        onChange={(e) => setFilters({ ...filters, search: e.currentTarget.value })}
        size='sm'
        maw='20rem'
      />
      <ActionIcon variant='subtle'>
        <IconArrowsUpDown />
      </ActionIcon>
      <ActionIcon variant='subtle'>
        <IconFilter />
      </ActionIcon>
    </Group>
  );
}

interface ListProps {
  filters: ProblemListFilters;
  sorting: ProblemListSorting;
}

function List({ filters, sorting }: ListProps) {
  // Suspense boundary now wraps only the data-dependent subtree; fallback provides full Table structure
  return (
    <Suspense fallback={<TableSkeleton />}>
      <ListContent filters={filters} sorting={sorting} />
    </Suspense>
  );
}

function ListContent({ filters, sorting }: ListProps) {
  const pageSize = 20; //can be adjusted 
  const [debouncedSearch] = useDebouncedValue(filters.search, 300);
  const debouncedFilters = filters.search === debouncedSearch ? filters : { ...filters, search: debouncedSearch };
  const [currentPage, setCurrentPage] = useState(1);
  const { data } = useProblemsQuery(debouncedFilters, sorting, pageSize, currentPage - 1);
  const { items, totalCount, totalPages } = data;

  const queryClient = useQueryClient();

  const handlePageHover = (page: number) => {
    // Only prefetch if it's not the current page
    if (page !== currentPage) {
      const pageIndex = page - 1; // Convert to 0-based index
      queryClient.prefetchQuery({
        queryKey: problemLibraryKeys.listParams(debouncedFilters, sorting, pageIndex),
        queryFn: () =>
          fetchProblemsPage({
            filters: debouncedFilters,
            sorting,
            pageIndex,
            pageSize,
          }),
      });
    }
  };

  const handleControlHover = (control: string) => {
    let targetPage: number | null = null;

    if (control === 'next' && currentPage < totalPages) {
      targetPage = currentPage + 1;
    } else if (control === 'previous' && currentPage > 1) {
      targetPage = currentPage - 1;
    } else if (control === 'first') {
      targetPage = 1;
    } else if (control === 'last') {
      targetPage = totalPages;
    }

    if (targetPage && targetPage !== currentPage) {
      const pageIndex = targetPage - 1; // Convert to 0-based index
      queryClient.prefetchQuery({
        queryKey: problemLibraryKeys.listParams(debouncedFilters, sorting, pageIndex),
        queryFn: () =>
          fetchProblemsPage({
            filters: debouncedFilters,
            sorting,
            pageIndex,
            pageSize,
          }),
      });
    }
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedFilters.search]);
  return (
    <Paper withBorder shadow='sm'>
      <Table highlightOnHover striped>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Problem Name</Table.Th>
            <Table.Th>Description</Table.Th>
            <Table.Th>Created At</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {items.map((problem) => (
            <Table.Tr key={problem.id}>
              <Table.Td>{problem.name}</Table.Td>
              <Table.Td>Summary</Table.Td>
              <Table.Td>231231</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
        <Table.Caption >
          <Group justify='flex-end'>
            <Pagination
              total={totalPages}
              onChange={setCurrentPage}
              value={currentPage}
              p='xs'
              withEdges
              getItemProps={(page) => ({
                onMouseEnter: () => handlePageHover(page),
              })}
              getControlProps={(control) => ({
                onMouseEnter: () => handleControlHover(control),
              })}
            />
          </Group>
        </Table.Caption>
      </Table>
    </Paper>
  );
}
