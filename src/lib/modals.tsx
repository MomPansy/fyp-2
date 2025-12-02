import { Text, Stack } from "@mantine/core";
import { modals } from "@mantine/modals";
import { ReactNode } from "react";

export interface OpenConfirmModalOptions {
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
}: OpenConfirmModalOptions) {
  modals.openConfirmModal({
    title,
    centered: true,
    children:
      typeof message === "string" ? <Text size="sm">{message}</Text> : message,
    labels: { confirm: confirmLabel, cancel: cancelLabel },
    confirmProps: { color: confirmColor },
    onConfirm,
    onCancel,
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

// Re-export modals for direct access when needed
export { modals };
