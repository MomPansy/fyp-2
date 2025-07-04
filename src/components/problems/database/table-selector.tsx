import { Fieldset, Group } from "@mantine/core";
import { ToggleButton } from "../../buttons/toggle-button.tsx";
import { TableData } from "./database-types.ts";

interface TableSelectorProps {
  tables: TableData[];
  legend: string;
  onToggle: (label: string, isSelected: boolean, index?: number) => void;
  selectedIndex: number | null;
  disabledIndex: number | null;
}

export function TableSelector({
  tables,
  legend,
  onToggle,
  selectedIndex,
  disabledIndex,
}: TableSelectorProps) {
  return (
    <Fieldset legend={legend}>
      <Group gap="xs">
        {tables.map(({ tableName }, index) => (
          <ToggleButton
            key={index}
            label={tableName}
            index={index}
            onToggle={onToggle}
            disabled={disabledIndex === index}
            isSelected={selectedIndex === index}
            defaultSelected={false}
          />
        ))}
      </Group>
    </Fieldset>
  );
}
