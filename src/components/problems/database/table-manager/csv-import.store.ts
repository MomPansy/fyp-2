import { PGliteWithLive } from "@electric-sql/pglite/live";
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import {
  createTablesColumns,
  dropAllTables,
  seedTableData,
  setRelations,
  sortTablesByDependencies,
} from "./utils.ts";
import { ColumnType, ForeignKeyMapping } from "server/drizzle/_custom.ts";
import { TableMetadata } from "@/hooks/use-problem.ts";
import { downloadAndParseCsvSafe } from "@/utils/csv-storage.ts";

export type Row = Record<string, unknown>;

interface CsvImportState {
  // modal
  isOpen: boolean;
  step: number; // 0 = data config, 1 = column config
  fileName?: string;
  mode: "create" | "edit";
  // data
  tableId?: string;
  initialColumns: string[];
  rawData: Row[];
  filteredColumns: string[];
  columnTypes: ColumnType[];
  relations: ForeignKeyMapping[];
  description: string;
  // UI flags
  isLoading: boolean;
  tableMetadata?: TableMetadata[];

  // actions (pure)
  open: (p: { fileName: string; columns: string[]; rawData: Row[] }) => void;
  openExisting: (p: {
    tableId: string;
    fileName: string;
    columns: string[];
    rawData: Row[];
    columnTypes: ColumnType[];
    relations: ForeignKeyMapping[];
    description: string;
    tableMetadata: TableMetadata[];
  }) => void;
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
}

export const useCsvImportStore = create<CsvImportState>()(
  subscribeWithSelector((set, get) => ({
    // initial
    isOpen: false,
    step: 0,
    fileName: undefined,
    tableId: undefined,
    initialColumns: [],
    rawData: [],
    filteredColumns: [],
    columnTypes: [],
    relations: [],
    description: "",
    isLoading: false,
    mode: "create",
    // actions
    open: ({ fileName, columns, rawData }) => {
      set({
        isOpen: true,
        fileName,
        initialColumns: columns,
        rawData,
        filteredColumns: columns,
        columnTypes: [],
        relations: [],
        description: "",
        mode: "create",
      });
    },
    openExisting: ({
      tableId,
      fileName,
      columns,
      rawData,
      columnTypes,
      relations,
      description,
      tableMetadata,
    }) => {
      set({
        isOpen: true,
        fileName,
        initialColumns: columns,
        rawData,
        filteredColumns: columns,
        columnTypes,
        relations,
        description,
        mode: "edit",
        tableMetadata,
        tableId,
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
        relations: [
          ...state.relations,
          {
            baseTableName: state.fileName ?? "",
            baseColumnName: "",
            baseColumnType: "",
            foreignTableName: foreignTableName,
            foreignTableColumn: "",
            foreignTableType: "",
          },
        ],
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
            : rel,
        ),
      }));
    },
    cleanRelations: () => {
      const cleanedRelations = get().relations.filter(
        (rel) =>
          rel.baseColumnName &&
          rel.foreignTableName &&
          rel.foreignTableColumn &&
          rel.baseColumnName.trim() !== "" &&
          rel.foreignTableName.trim() !== "" &&
          rel.foreignTableColumn.trim() !== "",
      );
      set({ relations: cleanedRelations });
      return cleanedRelations;
    },
    setDescription: (desc: string) => set({ description: desc }),
    setLoading: (v) => set({ isLoading: v }),
    setTableMetadata: (metadata: TableMetadata[]) => {
      set({ tableMetadata: metadata });
    },

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
          filteredCols.includes(key),
        );
        return Object.fromEntries(entries);
      });
    },

    save: async (db) => {
      const filteredData = get().getFilteredData();
      const baseFilteredColumnsTypes = get().columnTypes;
      const baseTableName = get().fileName;
      const mode = get().mode;

      if (!baseTableName) {
        throw new Error("File name is required to create tables");
      }

      const createAndSeedTable = async (
        tableName: string,
        columnTypes: ColumnType[],
        relations: ForeignKeyMapping[] | undefined,
        data: Row[],
      ) => {
        await createTablesColumns(db, tableName, columnTypes);
        if (relations && relations.length > 0) {
          await setRelations(db, tableName, relations);
        }

        await seedTableData(db, tableName, data, columnTypes);
      };

      if (mode === "edit") {
        console.info(
          `🔄 Edit mode: Recreating table '${baseTableName}' with updated schema`,
        );

        // Drop the existing table (CASCADE handles FK dependencies)
        await dropAllTables(db);

        // Sort tables and recreate them in dependency order
        const sorted = sortTablesByDependencies(get().tableMetadata ?? []);

        for (const tableMeta of sorted) {
          if (tableMeta.tableName !== baseTableName) {
            console.info(
              `🔧 Ensuring dependent table '${tableMeta.tableName}' exists`,
            );

            // Download and parse CSV data for dependent table
            const csvResult = await downloadAndParseCsvSafe<Row>(
              tableMeta.dataPath,
              "tables",
              {},
              tableMeta.tableName,
            );

            if (!csvResult) {
              console.error(
                `Failed to download/parse CSV for table: ${tableMeta.tableName}`,
              );
              continue;
            }

            await createAndSeedTable(
              tableMeta.tableName,
              tableMeta.columnTypes,
              tableMeta.relations,
              csvResult.data,
            );

            console.info(
              `✅ Dependent table '${tableMeta.tableName}' is ready`,
            );
          } else {
            // Recreate the main table with new schema
            const cleanedRelations = get().cleanRelations();
            await createAndSeedTable(
              baseTableName,
              baseFilteredColumnsTypes,
              cleanedRelations,
              filteredData,
            );
          }
        }

        console.info(
          `✅ Successfully recreated table '${baseTableName}' with updated schema`,
        );
      } else {
        console.info(`🔧 Create mode: Creating table '${baseTableName}'`);

        const cleanedRelations = get().cleanRelations();
        await createAndSeedTable(
          baseTableName,
          baseFilteredColumnsTypes,
          cleanedRelations,
          filteredData,
        );

        console.info(`✅ Successfully created table '${baseTableName}'`);
      }
    },
  })),
);
