import { Stack, Text, Group, Button, Alert, Badge } from "@mantine/core";
import { FileWithPath, MIME_TYPES } from "@mantine/dropzone";
import { notifications } from "@mantine/notifications";
import { IconInfoCircle, IconSend } from "@tabler/icons-react";
import { useParams } from "@tanstack/react-router";
import { MantineReactTable } from "mantine-react-table";
import { parse } from "papaparse";

import {
  useFetchAssessmentCandidateInvitations,
  useSyncAssessmentCandidatesMutation,
  useSendInvitationsMutation,
  useFetchAssessmentById,
} from "../../hooks.ts";
import { DeleteConfirmationModal } from "./delete-confirmation-modal.tsx";
import { useCandidatesTable } from "./use-candidates-table.tsx";
import { validateCandidates, mapCandidatesForSync } from "./validation.ts";
import { showErrorNotification } from "@/components/notifications.ts";
import { DropCSV } from "@/components/problems/dropzone.tsx";
import type { Row } from "@/components/problems/database/table-manager/csv-import.store.ts";

export function CandidatesTab() {
  const { id: assessmentId } = useParams({
    from: "/_admin/admin/assessment/$id/details",
  });

  // Data fetching
  const { data: invitations } =
    useFetchAssessmentCandidateInvitations(assessmentId);
  const { data: assessmentData } = useFetchAssessmentById(assessmentId);

  // Mutations
  const { mutate: syncCandidates } = useSyncAssessmentCandidatesMutation();
  const { mutate: sendInvitations, isPending: isSending } =
    useSendInvitationsMutation();

  // Table state and handlers
  const { table, candidates, setCandidates, isDirty, setIsDirty, deleteModal } =
    useCandidatesTable({
      initialData: invitations as Row[],
    });

  const isCancelled = !!assessmentData?.archived_at;
  const hasActiveCandidates = invitations.some((row) => row.active);
  const activeCandidatesCount = invitations.filter((row) => row.active).length;

  const handleCsvDrop = (files: FileWithPath[]) => {
    const file = files[0];
    parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => setCandidates(results.data as Row[]),
    });
  };

  const handleSave = () => {
    // If no candidates, just sync (this will delete all existing)
    if (candidates.length === 0) {
      syncCandidates(
        { assessmentId, candidates: [] },
        {
          onSuccess: () => {
            setIsDirty(false);
            showErrorNotification({
              title: "Success",
              message: "All candidates have been removed.",
              color: "green",
            });
          },
          onError: (error: Error) => {
            showErrorNotification({
              title: "Error Saving Candidates",
              message: error.message,
            });
          },
        },
      );
      return;
    }

    const validation = validateCandidates(candidates);

    if (!validation.valid) {
      showErrorNotification({
        title: "Invalid Candidate Data",
        message: validation.error,
      });
      return;
    }

    syncCandidates(
      {
        assessmentId,
        candidates: mapCandidatesForSync(validation.candidates),
      },
      {
        onSuccess: () => {
          setIsDirty(false);
          showErrorNotification({
            title: "Success",
            message: "Candidates have been successfully saved.",
            color: "green",
          });
        },
        onError: (error: Error) => {
          showErrorNotification({
            title: "Error Saving Candidates",
            message: error.message,
          });
        },
      },
    );
  };

  const handleSendInvitations = () => {
    const validation = validateCandidates(candidates);

    if (!validation.valid) {
      showErrorNotification({
        title: "Invalid Candidate Data",
        message: validation.error,
      });
      return;
    }

    // Save candidates first, then send invitations
    syncCandidates(
      {
        assessmentId,
        candidates: mapCandidatesForSync(validation.candidates),
      },
      {
        onSuccess: () => {
          setIsDirty(false);
          sendInvitations(assessmentId, {
            onSuccess: (result) => {
              notifications.show({
                title: "Invitations Sent!",
                message: `Successfully sent ${result.sent} invitation email(s).`,
                color: "green",
                icon: <IconSend size={16} />,
              });
            },
            onError: (error: Error) => {
              showErrorNotification({
                title: "Error Sending Invitations",
                message: error.message,
              });
            },
          });
        },
        onError: (error: Error) => {
          showErrorNotification({
            title: "Error Saving Candidates",
            message: error.message,
          });
        },
      },
    );
  };

  return (
    <Stack>
      {isCancelled && (
        <Alert variant="light" color="red" title="Assessment Cancelled">
          This assessment is cancelled. Restore it to manage candidates or send
          invitations.
        </Alert>
      )}

      <Alert
        variant="light"
        color="blue"
        title="CSV Schema Requirement"
        icon={<IconInfoCircle />}
      >
        You must ensure that the CSV file contains the following columns:{" "}
        <strong>email</strong>, <strong>full_name</strong>, and{" "}
        <strong>matriculation_number</strong>.
      </Alert>

      <DropCSV
        onDrop={handleCsvDrop}
        accept={[MIME_TYPES.csv]}
        maxFiles={1}
        disabled={isCancelled}
      />

      <Stack gap="md">
        <Group justify="space-between">
          <Group gap="xs">
            <Text size="sm" c="dimmed">
              {candidates.length} candidate{candidates.length !== 1 ? "s" : ""}
            </Text>
            {isDirty && (
              <Badge color="yellow" variant="light" size="sm">
                Unsaved changes
              </Badge>
            )}
          </Group>
          {hasActiveCandidates && (
            <Badge color="green" variant="light">
              {activeCandidatesCount} invitation
              {activeCandidatesCount !== 1 ? "s" : ""} sent
            </Badge>
          )}
        </Group>

        <MantineReactTable table={table} />

        <Group justify="flex-end">
          {(candidates.length > 0 || isDirty) && (
            <Button onClick={handleSave} variant="light" disabled={isCancelled}>
              Save Candidates
            </Button>
          )}
          <Button
            onClick={handleSendInvitations}
            disabled={candidates.length === 0 || isSending || isCancelled}
            loading={isSending}
            leftSection={<IconSend size={16} />}
          >
            Send Invitations
          </Button>
        </Group>
      </Stack>

      <DeleteConfirmationModal
        opened={deleteModal.opened}
        onClose={deleteModal.close}
        onConfirm={deleteModal.onConfirm}
      />
    </Stack>
  );
}
