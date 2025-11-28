import { useState } from "react";
import { Group, Modal } from "@mantine/core";
import { ProblemBankModalProps } from "./types.ts";
import { ProblemBankFilters } from "./filters.tsx";
import { ProblemBankList } from "./list.tsx";
import {
  ProblemListFilters,
  ProblemListSorting,
} from "@/components/my-problems/query-keys.ts";

export function ProblemBankModal({
  close,
  existingProblemIds,
}: ProblemBankModalProps) {
  const [filters, setFilters] = useState<ProblemListFilters>({});
  const [sorting] = useState<ProblemListSorting>({
    sortOptions: [{ sortBy: "created_at", order: "desc" }],
  });

  return (
    <Modal opened onClose={close} title="Add Problem" size="80%">
      <Modal.Body h="70vh" p={0}>
        <Group w="full" h="100%" align="flex-start">
          <ProblemBankFilters
            filters={filters}
            setFilters={setFilters}
            w="20rem"
            h="100%"
          />
          <ProblemBankList
            filters={filters}
            sorting={sorting}
            existingProblemIds={existingProblemIds}
            onClose={close}
            flex={1}
          />
        </Group>
      </Modal.Body>
    </Modal>
  );
}
