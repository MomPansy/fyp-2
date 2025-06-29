import { Button, ButtonProps } from "@mantine/core";
import { useState } from "react";

export type OnToggleProps = (label: string, isSelected: boolean, index?: number,) => void;

interface ToggleButtonProps extends ButtonProps {
  label: string;
  onToggle: OnToggleProps;
  isSelected?: boolean;
  defaultSelected?: boolean;
  index?: number;
}

export function ToggleButton({ label, onToggle, defaultSelected = true, isSelected: externalIsSelected, index, ...props }: ToggleButtonProps) {
  const [internalIsSelected, setInternalIsSelected] = useState(defaultSelected);
  const selectedState = externalIsSelected ?? internalIsSelected;

  const handleClick = () => {
    const newSelectedState = !selectedState;
    setInternalIsSelected(newSelectedState);
    onToggle(label, newSelectedState, index);
  };

  return (
    <Button
      {...props}
      variant={selectedState ? "filled" : "outline"}
      color={selectedState ? "blue" : "gray"}
      onClick={handleClick}
      size="xs"
    >
      {label}
    </Button>
  );
}