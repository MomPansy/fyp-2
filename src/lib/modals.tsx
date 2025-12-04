import { Text, Stack, List, Alert, ThemeIcon } from "@mantine/core";
import { modals, ConfirmModalProps } from "@mantine/modals";
import { IconAlertTriangle } from "@tabler/icons-react";
import { ReactNode } from "react";

export interface OpenConfirmModalOptions extends ConfirmModalProps {
  title?: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColor?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  loading?: boolean;
}

/**
 * Opens a confirmation modal with customizable options.
 * Uses the Mantine modals manager for consistent modal behavior.
 */
export function openConfirmModal({
  title = "Confirm",
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmColor = "red",
  onConfirm,
  onCancel,
  ...props
}: OpenConfirmModalOptions) {
  modals.openConfirmModal({
    title,
    size: "md",
    centered: true,
    children:
      typeof message === "string" ? <Text size="sm">{message}</Text> : message,
    labels: { confirm: confirmLabel, cancel: cancelLabel },
    confirmProps: { color: confirmColor },
    onConfirm,
    onCancel,
    ...props,
  });
}

export interface OpenDeleteConfirmModalOptions {
  /** The name or description of the item(s) being deleted */
  itemName: string;
  /** Number of items being deleted (for bulk delete) */
  itemCount?: number;
  /** Custom title (defaults to "Delete [itemName]") */
  title?: string;
  /** Custom message (will be auto-generated if not provided) */
  message?: ReactNode;
  /** Callback when deletion is confirmed */
  onConfirm: () => void;
  /** Callback when deletion is cancelled */
  onCancel?: () => void;
}

/**
 * Opens a delete confirmation modal with standard delete styling.
 * Supports both single and bulk delete with auto-generated messages.
 */
export function openDeleteConfirmModal({
  itemName,
  itemCount = 1,
  title,
  message,
  onConfirm,
  onCancel,
}: OpenDeleteConfirmModalOptions) {
  const modalTitle =
    title ??
    (itemCount === 1
      ? `Delete ${itemName}`
      : `Delete ${itemCount} ${itemName}`);

  const defaultMessage =
    itemCount === 1 ? (
      <Text size="sm">
        Are you sure you want to delete <strong>{itemName}</strong>? This action
        cannot be undone.
      </Text>
    ) : (
      <Text size="sm">
        Are you sure you want to delete{" "}
        <strong>
          {itemCount} {itemName}
        </strong>
        ? This action cannot be undone.
      </Text>
    );

  openConfirmModal({
    title: modalTitle,
    message: message ?? defaultMessage,
    confirmLabel: "Delete",
    cancelLabel: "Cancel",
    confirmColor: "red",
    onConfirm,
    onCancel,
  });
}

export interface OpenCancelConfirmModalOptions {
  /** The name of the item being cancelled (e.g., "Assessment") */
  itemName: string;
  /** Custom title */
  title?: string;
  /** Custom message */
  message?: ReactNode;
  /** Callback when cancellation is confirmed */
  onConfirm: () => void;
  /** Callback when cancelled */
  onCancel?: () => void;
}

/**
 * Opens a cancel confirmation modal for cancelling items (e.g., assessments).
 */
export function openCancelConfirmModal({
  itemName,
  title,
  message,
  onConfirm,
  onCancel,
}: OpenCancelConfirmModalOptions) {
  const modalTitle = title ?? `Cancel ${itemName}`;

  const defaultMessage = (
    <Stack gap="sm">
      <Text size="sm">
        Are you sure you want to cancel this {itemName.toLowerCase()}? This
        action may affect users who have access to it.
      </Text>
    </Stack>
  );

  openConfirmModal({
    title: modalTitle,
    message: message ?? defaultMessage,
    confirmLabel: `Cancel ${itemName}`,
    cancelLabel: "Keep",
    confirmColor: "red",
    onConfirm,
    onCancel,
  });
}

export interface AssessmentUsageInfo {
  assessmentId: string;
  assessmentName: string;
}

export interface OpenDeleteProblemWithAssessmentWarningOptions {
  /** The name of the problem being deleted */
  problemName: string;
  /** List of assessments using this problem */
  assessments: AssessmentUsageInfo[];
  /** Callback when deletion is confirmed (will remove problem from assessments) */
  onConfirm: () => void;
  /** Callback when deletion is cancelled */
  onCancel?: () => void;
}

/**
 * Opens a confirmation modal warning that the problem is being used in assessments.
 * If confirmed, the problem will be removed from those assessments and then deleted.
 */
export function openDeleteProblemWithAssessmentWarning({
  problemName,
  assessments,
  onConfirm,
  onCancel,
}: OpenDeleteProblemWithAssessmentWarningOptions) {
  const isSingleAssessment = assessments.length === 1;

  const message = (
    <Stack gap="md">
      <Alert
        color="orange"
        variant="light"
        icon={
          <ThemeIcon color="orange" variant="light" size="lg" radius="xl">
            <IconAlertTriangle size={20} />
          </ThemeIcon>
        }
      >
        <Text size="sm" fw={500}>
          This problem is currently in use
        </Text>
        <Text size="xs" c="dimmed" mt={4}>
          Deleting it will affect{" "}
          {isSingleAssessment
            ? "1 assessment"
            : `${assessments.length} assessments`}
        </Text>
      </Alert>

      <Stack gap="xs">
        <Text size="sm" fw={500}>
          Affected {isSingleAssessment ? "assessment" : "assessments"}:
        </Text>
        <List size="sm" withPadding spacing="xs">
          {assessments.map((assessment) => (
            <List.Item key={assessment.assessmentId}>
              <Text size="sm">{assessment.assessmentName}</Text>
            </List.Item>
          ))}
        </List>
      </Stack>

      <Text size="sm" c="dimmed">
        The problem <strong>{problemName}</strong> will be permanently removed
        from {isSingleAssessment ? "this assessment" : "these assessments"} and
        deleted. This action cannot be undone.
      </Text>
    </Stack>
  );

  openConfirmModal({
    title: "Delete Problem with Dependencies",
    message,
    confirmLabel: "Delete Problem",
    cancelLabel: "Cancel",
    confirmColor: "red",
    onConfirm,
    onCancel,
  });
}

// Re-export modals for direct access when needed
export { modals };
