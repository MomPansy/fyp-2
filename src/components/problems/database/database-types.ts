import { ForeignKeyMapping } from "server/drizzle/_custom";

export interface ColumnType {
    column: string;
    type: string;
}
export interface TableData {
    tableName: string;
    columnTypes: ColumnType[];
}
export interface TableSelectionState {
    selectedTable1Index: number | null;
    selectedTable2Index: number | null;
}

export type { ForeignKeyMapping };
