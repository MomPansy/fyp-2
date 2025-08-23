import { customType } from "drizzle-orm/pg-core";

export const citext = customType<{
    data: string;
    notNull: true;
    default: false;
}>({
    dataType() {
        return "citext";
    },
});

export type ColumnType = {
    column: string;
    type: string;
    isPrimaryKey: boolean;
};

export type TableMetadata = {
    tableName: string;
    columnTypes: ColumnType[];
    numberOfRows: number;
    description: string;
};

export type ForeignKeyMapping = {
    baseTableName: string;
    baseColumnName: string;
    baseColumnType: string;
    foreignTableName: string;
    foreignTableColumn: string;
    foreignTableType: string;
};
