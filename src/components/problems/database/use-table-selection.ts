import { useState } from "react";
import { type TableSelectionState } from "./database-types.ts";

export type { TableSelectionState };

export function useTableSelection() {
    const [selectedTable1Index, setSelectedTable1Index] = useState<
        number | null
    >(null);
    const [selectedTable2Index, setSelectedTable2Index] = useState<
        number | null
    >(null);

    const handleTable1Toggle = (
        _label: string,
        isSelected: boolean,
        index?: number,
    ) => {
        if (isSelected) {
            setSelectedTable1Index(index ?? 0);
            // If this table was selected in table2, remove it
            if (selectedTable2Index === index) {
                setSelectedTable2Index(null);
            }
        } else {
            setSelectedTable1Index(null);
        }
    };

    const handleTable2Toggle = (
        _label: string,
        isSelected: boolean,
        index?: number,
    ) => {
        if (isSelected) {
            setSelectedTable2Index(index ?? 0);
            // If this table was selected in table1, remove it
            if (selectedTable1Index === index) {
                setSelectedTable1Index(null);
            }
        } else {
            setSelectedTable2Index(null);
        }
    };

    return {
        selectedTable1Index,
        selectedTable2Index,
        handleTable1Toggle,
        handleTable2Toggle,
    };
}
