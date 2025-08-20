import { ColumnType } from "server/drizzle/_custom";
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

export type Row = Record<string, unknown>;

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

  // UI flags
  isLoading: boolean;

  // actions (pure)
  open: (p: { fileName: string; columns: string[]; rawData: Row[] }) => void;
  close: () => void;
  reset: () => void;
  next: () => void;
  setFilteredColumns: (cols: string[]) => void;
  setColumnTypes: (cols: ColumnType[]) => void;
  setLoading: (v: boolean) => void;

  // derived
  getFilteredData: () => Row[];
};

export const useCsvImportStore = create<CsvImportState>()(
  subscribeWithSelector((set, get) => ({
    // initial
    isOpen: false,
    step: 0,
    fileName: undefined,
    initialColumns: [],
    rawData: [],
    filteredColumns: [],
    columnTypes: [],
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
      });
    },
    close: () => {
      set({ isOpen: false });
    },
    next: () => {
      set((state) => ({ step: Math.min(state.step + 1, 1) }));
    },
    setFilteredColumns: (filteredCols) =>
      set({ filteredColumns: filteredCols }),
    setColumnTypes: (cols) => set({ columnTypes: cols }),
    setLoading: (v) => set({ isLoading: v }),
    getFilteredData: () => {
      const filteredCols = get().filteredColumns;
      const initialCols = get().initialColumns;
      const rawData = get().rawData;
      if (filteredCols.length === initialCols.length) {
        return rawData;
      }
      return rawData.map((row) => {
        const entries = Object.entries(row).filter(([key]) =>
          filteredCols.includes(key)
        );
        return Object.fromEntries(entries);
      });
    },
  })),
);
