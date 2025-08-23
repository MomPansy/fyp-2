import { PGliteWithLive } from "@electric-sql/pglite/live";
import { ColumnType, ForeignKeyMapping } from "server/drizzle/_custom";
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { createTablesColumns, seedTableData, setRelations } from "./utils";

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
  relations: ForeignKeyMapping[];
  description: string;
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

  // local relations
  addRelation: (foreignTableName: string) => void;
  removeRelation: (index: number) => void;
  updateRelation: (
    index: number,
    columnName: string,
    isBase: boolean,
    foreignColumnTypes: ColumnType[],
  ) => void;
  cleanRelations: () => ForeignKeyMapping[];
  setDescription: (desc: string) => void;
  // derived
  getFilteredData: () => Row[];
  save: (db: PGliteWithLive) => Promise<void>;
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
    relations: [],
    description: "",
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
        relations: [],
        description: "",
        isLoading: false,
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
    addRelation: (foreignTableName) => {
      set((state) => ({
        relations: [...state.relations, {
          baseTableName: state.fileName || "",
          baseColumnName: "",
          baseColumnType: "",
          foreignTableName: foreignTableName,
          foreignTableColumn: "",
          foreignTableType: "",
        }],
      }));
    },
    removeRelation: (index: number) => {
      set((state) => ({
        relations: state.relations.filter((_, i) => i !== index),
      }));
    },
    updateRelation: (index, columnName, isBase, foreignColumnTypes) => {
      const columnData = isBase
        ? get().columnTypes.find((c) => c.column === columnName)
        : foreignColumnTypes.find((c) => c.column === columnName);
      if (!columnData) return;
      set((state) => ({
        relations: state.relations.map((rel, i) =>
          i === index
            ? {
              ...rel,
              ...(isBase
                ? {
                  baseColumnName: columnName,
                  baseColumnType: columnData.type,
                }
                : {
                  foreignTableColumn: columnName,
                  foreignTableType: columnData.type,
                }),
            }
            : rel
        ),
      }));
    },
    cleanRelations: () => {
      const cleanedRelations = get().relations.filter((rel) =>
        rel.baseColumnName &&
        rel.foreignTableName &&
        rel.foreignTableColumn &&
        rel.baseColumnName.trim() !== "" &&
        rel.foreignTableName.trim() !== "" &&
        rel.foreignTableColumn.trim() !== ""
      );
      set({ relations: cleanedRelations });
      return cleanedRelations;
    },
    setDescription: (desc: string) => set({ description: desc }),
    setLoading: (v) => set({ isLoading: v }),

    // derived
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

    save: async (db) => {
      const filteredData = get().getFilteredData();
      const baseFilteredColumnsTypes = get().columnTypes;
      const baseTableName = get().fileName;
      if (!baseTableName) {
        throw new Error("File name is required to create tables");
      }
      await createTablesColumns(db, baseTableName, baseFilteredColumnsTypes);

      // get relations
      const cleanedRelations = get().cleanRelations();

      await setRelations(
        db,
        baseTableName,
        cleanedRelations,
      );

      await seedTableData(
        db,
        baseTableName,
        filteredData,
        baseFilteredColumnsTypes,
      );
    },
  })),
);

// TODO: test with actual data with relations
