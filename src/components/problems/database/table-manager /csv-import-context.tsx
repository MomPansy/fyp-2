import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { type ColumnType } from 'server/drizzle/_custom';

export interface CsvImportContextValue {
  step: number; // 0 = data config, 1 = column config
  goToNext: () => void;
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  columns: string[];
  rawData: Record<string, unknown>[];
  filteredColumns: string[];
  setFilteredColumns: (cols: string[]) => void;
  // New helper to synchronously compute filtered data when updating columns
  updateFilteredColumns: (cols: string[]) => void; // now void, use ref for immediate data
  filteredData: Record<string, unknown>[];
  filteredDataRef: React.MutableRefObject<Record<string, unknown>[]>; // immediate access
  isLoading: boolean;
  prepareSchema: (data: Record<string, unknown>[]) => Promise<ColumnType[]>;
  columnTypes: ColumnType[];
  setColumnTypes: (cols: ColumnType[]) => void;
  finalizeUpload: (data: Record<string, unknown>[], columns: string[], columnTypes: ColumnType[]) => Promise<void>;
}

const CsvImportContext = createContext<CsvImportContextValue | undefined>(undefined);

interface ProviderProps {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  columns: string[];
  rawData: Record<string, unknown>[];
  isLoading: boolean;
  prepareSchema: (data: Record<string, unknown>[]) => Promise<ColumnType[]>;
  initialColumnTypes: ColumnType[];
  finalizeUpload: (data: Record<string, unknown>[], columns: string[], columnTypes: ColumnType[]) => Promise<void>;
}

export function CsvImportProvider(props: ProviderProps) {
  const { children, isOpen, onClose, fileName, columns, rawData, isLoading, prepareSchema, initialColumnTypes, finalizeUpload } = props;

  const [step, setStep] = useState(0);
  const [filteredColumns, setFilteredColumns] = useState<string[]>(columns);
  const [columnTypes, setColumnTypes] = useState<ColumnType[]>(initialColumnTypes);

  const filteredDataRef = useRef<Record<string, unknown>[]>([]);

  const computeFilteredData = useCallback((cols: string[]) => {
    if (cols.length === columns.length) return rawData;
    return rawData.map(row => {
      const entries = Object.entries(row).filter(([key]) => cols.includes(key));
      return Object.fromEntries(entries);
    });
  }, [rawData, columns]);

  // Initialize and keep ref updated
  filteredDataRef.current = computeFilteredData(filteredColumns);

  const goToNext = useCallback(() => setStep(s => Math.min(s + 1, 1)), []);

  const updateFilteredColumns = useCallback((cols: string[]) => {
    // compute immediately and update ref before state triggers re-render
    filteredDataRef.current = computeFilteredData(cols);
    setFilteredColumns(cols);
  }, [computeFilteredData]);

  const value: CsvImportContextValue = {
    step,
    goToNext,
    isOpen,
    onClose,
    fileName,
    columns,
    rawData,
    filteredColumns,
    setFilteredColumns,
    updateFilteredColumns,
    filteredData: filteredDataRef.current,
    filteredDataRef,
    isLoading,
    prepareSchema,
    columnTypes,
    setColumnTypes: (c) => setColumnTypes(c),
    finalizeUpload,
  };

  return (
    <CsvImportContext.Provider value={value}>
      {children}
    </CsvImportContext.Provider>
  );
}

export function useCsvImport() {
  const ctx = useContext(CsvImportContext);
  if (!ctx) throw new Error('useCsvImport must be used within CsvImportProvider');
  return ctx;
}
