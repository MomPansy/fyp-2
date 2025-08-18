import { ColumnType } from 'server/drizzle/_custom';
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { ForeignKeyMapping } from '../database-types';

export type Row = Record<string, unknown>

type CsvImportState = {
  // modal 
  isOpen: boolean;
  step: number; // 0 = data config, 1 = column config
  fileName?: string;

  // data 
  initialColumns: string[];
  rawData: Row[];
  filteredColumns: string[];
  columnTypes: ColumnType[];
  foreignKeyMappings: ForeignKeyMapping[];

  // UI flags 
  isLoading: boolean;

  // actions (pure)
  open: (p: { fileName: string; columns: string[]; rawData: Row[] }) => void;
  close: () => void;
  reset: () => void;
  next: () => void;
  setFilteredColumns: (cols: string[]) => void;
  setColumnTypes: (cols: ColumnType[]) => void;
  setForeignKeyMappings: (mappings: ForeignKeyMapping[]) => void;
  setLoading: (v: boolean) => void;
};

export const useCsvImportStore = create<CsvImportState>()(
  subscribeWithSelector((set) => ({
    // initial 
    isOpen: false,
    step: 0,
    fileName: undefined,
    initialColumns: [],
    rawData: [],
    filteredColumns: [],
    columnTypes: [],
    foreignKeyMappings: [],
    isLoading: false,

    // actions 
    open: ({ fileName, columns, rawData }) => {
      set({
        isOpen: true,
        fileName,
        initialColumns: columns,
        rawData,
        filteredColumns: columns,
        columnTypes: [],
        foreignKeyMappings: [],
      });
    },
    reset: () => {
      set({
        isOpen: false,
        step: 0,
        fileName: undefined,
        initialColumns: [],
        rawData: [],
        filteredColumns: [],
        columnTypes: [],
        foreignKeyMappings: [],
      });
    },
    close: () => {
      set({ isOpen: false });
    },
    next: () => {
      set(state => ({ step: Math.min(state.step + 1, 1) }));
    },
    setFilteredColumns: (filteredCols) => set({ filteredColumns: filteredCols }),
    setColumnTypes: (cols) => set({ columnTypes: cols }),
    setForeignKeyMappings: (mappings) => set({ foreignKeyMappings: mappings }),
    setLoading: (v) => set({ isLoading: v }),
  }))
)

// derived selector 
export const selectFilteredData = (state: CsvImportState) => {
  const set = new Set(state.filteredColumns);
  if (state.filteredColumns.length === state.initialColumns.length) {
    return state.rawData;
  }
  return state.rawData.map(row => {
    const entries = Object.entries(row).filter(([key]) => set.has(key));
    return Object.fromEntries(entries);
  });
};