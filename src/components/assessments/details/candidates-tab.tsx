import {
  Stack,
  Table,
  Text,
  ScrollArea,
  Group,
  Button,
  Alert,
  Badge,
} from "@mantine/core";
import { FileWithPath, MIME_TYPES } from "@mantine/dropzone";
import { parse } from "papaparse";
import { useState } from "react";
import { useParams } from "@tanstack/react-router";
import { IconInfoCircle, IconSend } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import {
  useFetchAssessmentCandidateInvitations,
  useUpsertAssessmentCandidateMutation,
  useSendInvitationsMutation,
} from "../hooks.ts";
import { DropCSV } from "@/components/problems/dropzone.tsx";
import { Row } from "@/components/problems/database/table-manager/csv-import.store.ts";
import { showErrorNotification } from "@/components/notifications.ts";

interface CandidateRow {
  email: string;
  full_name: string;
  matriculation_number: string;
  active?: boolean;
  [key: string]: unknown;
}

export function CandidatesTab() {
  const [candidates, setCandidates] = useState<Row[]>([]);
  const { mutate } = useUpsertAssessmentCandidateMutation();
  const { mutate: sendInvitations, isPending: isSending } =
    useSendInvitationsMutation();
  const { id: assessment_id } = useParams({
    from: "/_admin/admin/assessment/$id/details",
  });
  const { data } = useFetchAssessmentCandidateInvitations(assessment_id);
  const displayCandidates: Row[] =
    candidates.length > 0 ? candidates : (data as Row[]);

  const onDrop = (files: FileWithPath[]) => {
    const file = files[0];
    parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as Row[];
        setCandidates(rows);
      },
    });
  };

  const validateCandidateSchema = (
    candidate: Row,
  ): candidate is CandidateRow => {
    return (
      typeof candidate.email === "string" &&
      candidate.email.length > 0 &&
      typeof candidate.full_name === "string" &&
      candidate.full_name.length > 0 &&
      typeof candidate.matriculation_number === "string" &&
      candidate.matriculation_number.length > 0
    );
  };

  const validateCandidates = (
    candidatesToValidate: Row[],
  ):
    | { valid: true; candidates: CandidateRow[] }
    | { valid: false; error: string } => {
    const invalidCandidates: number[] = [];
    const missingFields = new Set<string>();

    candidatesToValidate.forEach((candidate, index) => {
      if (!validateCandidateSchema(candidate)) {
        invalidCandidates.push(index + 1); // 1-indexed for user display

        // Track which fields are missing or invalid
        if (typeof candidate.email !== "string" || !candidate.email) {
          missingFields.add("email");
        }
        if (typeof candidate.full_name !== "string" || !candidate.full_name) {
          missingFields.add("full_name");
        }
        if (
          typeof candidate.matriculation_number !== "string" ||
          !candidate.matriculation_number
        ) {
          missingFields.add("matriculation_number");
        }
      }
    });

    if (invalidCandidates.length > 0) {
      const fieldsList = Array.from(missingFields).join(", ");
      const rowsList =
        invalidCandidates.length <= 5
          ? invalidCandidates.join(", ")
          : `${invalidCandidates.slice(0, 5).join(", ")} and ${invalidCandidates.length - 5} more`;

      return {
        valid: false,
        error: `CSV must contain valid ${fieldsList} columns. Issues found in row(s): ${rowsList}`,
      };
    }

    return {
      valid: true,
      candidates: candidatesToValidate as CandidateRow[],
    };
  };

  const handleSave = () => {
    const validation = validateCandidates(candidates);

    if (!validation.valid) {
      showErrorNotification({
        title: "Invalid Candidate Data",
        message: validation.error,
      });
      return;
    }

    // All candidates are valid, proceed with saving
    mutate(
      validation.candidates.map((candidate) => ({
        assessment_id: assessment_id,
        email: candidate.email,
        full_name: candidate.full_name,
        matriculation_number: candidate.matriculation_number,
      })),
      {
        onSuccess: () => {
          showErrorNotification({
            title: "Success",
            message: "Candidates have been successfully saved.",
            color: "green",
          });
        },
        onError: (error) => {
          showErrorNotification({
            title: "Error Saving Candidates",
            message: error.message,
          });
        },
      },
    );
  };

  const handleSendInvitations = () => {
    // If there are unsaved candidates, save them first
    if (candidates.length > 0) {
      const validation = validateCandidates(candidates);

      if (!validation.valid) {
        showErrorNotification({
          title: "Invalid Candidate Data",
          message: validation.error,
        });
        return;
      }

      // Save candidates first, then send invitations
      mutate(
        validation.candidates.map((candidate) => ({
          assessment_id: assessment_id,
          email: candidate.email,
          full_name: candidate.full_name,
          matriculation_number: candidate.matriculation_number,
        })),
        {
          onSuccess: () => {
            // After saving, send invitations
            sendInvitations(assessment_id, {
              onSuccess: (result) => {
                notifications.show({
                  title: "Invitations Sent!",
                  message: `Successfully sent ${result.sent} invitation email(s).`,
                  color: "green",
                  icon: <IconSend size={16} />,
                });
                // Clear the candidates state after successful send
                setCandidates([]);
              },
              onError: (error) => {
                showErrorNotification({
                  title: "Error Sending Invitations",
                  message: error.message,
                });
              },
            });
          },
          onError: (error) => {
            showErrorNotification({
              title: "Error Saving Candidates",
              message: error.message,
            });
          },
        },
      );
    } else {
      // No unsaved candidates, just send invitations to existing candidates
      sendInvitations(assessment_id, {
        onSuccess: (result) => {
          notifications.show({
            title: "Invitations Sent!",
            message: `Successfully sent ${result.sent} invitation email(s).`,
            color: "green",
            icon: <IconSend size={16} />,
          });
        },
        onError: (error) => {
          showErrorNotification({
            title: "Error Sending Invitations",
            message: error.message,
          });
        },
      });
    }
  };

  // Get column headers from the first row
  const columns =
    candidates.length > 0
      ? Object.keys(candidates[0])
      : data.length > 0
        ? Object.keys(data[0])
        : [];

  // Check if any invitations have been sent (active = true)
  const hasActiveCandidates = data.some((row) => row.active);
  const activeCandidatesCount = data.filter((row) => row.active).length;

  return (
    <Stack>
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
      <DropCSV onDrop={onDrop} accept={[MIME_TYPES.csv]} maxFiles={1} />
      {displayCandidates.length > 0 && (
        <Stack gap="md">
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              {displayCandidates.length} candidate
              {displayCandidates.length !== 1 ? "s" : ""}
            </Text>
            {hasActiveCandidates && (
              <Badge color="green" variant="light">
                {activeCandidatesCount} invitation
                {activeCandidatesCount !== 1 ? "s" : ""} sent
              </Badge>
            )}
          </Group>
          <ScrollArea h="32rem" type="hover">
            <Table
              highlightOnHover
              withTableBorder
              withColumnBorders
              stickyHeader
              striped
            >
              <Table.Thead>
                <Table.Tr>
                  {columns.map((col) => (
                    <Table.Th key={col}>{col}</Table.Th>
                  ))}
                </Table.Tr>
              </Table.Thead>

              <Table.Tbody>
                {displayCandidates.map((row, i) => (
                  <Table.Tr key={i}>
                    {columns.map((col) => {
                      const value: unknown = row[col];
                      let displayValue = "";
                      if (value === null || value === undefined) {
                        displayValue = "";
                      } else if (typeof value === "object") {
                        displayValue = JSON.stringify(value);
                      } else if (
                        typeof value === "string" ||
                        typeof value === "number" ||
                        typeof value === "boolean"
                      ) {
                        displayValue = String(value);
                      }
                      return <Table.Td key={col}>{displayValue}</Table.Td>;
                    })}
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
          <Group justify="flex-end">
            {candidates.length > 0 && (
              <Button onClick={handleSave} variant="light">
                Save Candidates
              </Button>
            )}
            <Button
              onClick={handleSendInvitations}
              disabled={displayCandidates.length === 0 || isSending}
              loading={isSending}
              leftSection={<IconSend size={16} />}
            >
              Send Invitations
            </Button>
          </Group>
        </Stack>
      )}
    </Stack>
  );
}
