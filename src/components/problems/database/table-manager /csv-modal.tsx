/* eslint-disable @typescript-eslint/no-base-to-string */
import { Modal, LoadingOverlay } from "@mantine/core";
import { DataConfig } from "./data-config";
import { useCsvImport } from "./csv-import-context";
import { ColumnConfig } from "./column-config";

export function CSVModal() {
  const { isOpen, onClose, step } = useCsvImport();

  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      size={step === 0 ? "xl" : "lg"}
      title={step === 0 ? "Add content to new table" : "Configure Columns"}
    >
      {step === 0 && <DataConfig />}
      {step === 1 && <ColumnConfig />}
      <LoadingOverlay visible={false} />
    </Modal>
  );
}
