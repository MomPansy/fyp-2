export interface ColumnType {
    column: string;
    type: string;
}

export interface TableData {
    tableName: string;
    columnTypes: ColumnType[];
}

export interface ForeignKeyMapping {
    table1Name: string;
    table1Column: string;
    table1ColumnType: string;
    table2Name: string;
    table2Column: string;
    table2ColumnType: string;
}

export interface TableSelectionState {
    selectedTable1Index: number | null;
    selectedTable2Index: number | null;
}
