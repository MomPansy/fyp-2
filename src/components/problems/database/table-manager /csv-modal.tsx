/* eslint-disable @typescript-eslint/no-base-to-string */
import { Modal, LoadingOverlay } from "@mantine/core";
import { DataConfig } from "./data-config";
import { ColumnConfig } from "./column-config";
import { useCsvImportStore } from "./csv-import.store";

export function CSVModal() {
  const isOpen = useCsvImportStore().isOpen;
  const onClose = () => {
    useCsvImportStore.getState().reset();
    useCsvImportStore.getState().close();
  };
  const step = useCsvImportStore().step;

  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      size={step === 0 ? "xl" : "lg"}
      title={step === 0 ? "Add content to new table" : "Configure Columns"}
    >
      {step === 0 && <DataConfig />}
      {step === 1 && <ColumnConfig />}
    </Modal>
  );
}
