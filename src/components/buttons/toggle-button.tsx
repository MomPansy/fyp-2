import { Button, ButtonProps } from "@mantine/core";
import { useState, useEffect } from "react";

interface ToggleButtonProps extends ButtonProps {
  label: string;
  onToggle: (label: string, index: number, isSelected: boolean) => void;
  isSelected?: boolean;
  index: number;
}

export function ToggleButton({ label, onToggle, isSelected: externalIsSelected, index, ...props }: ToggleButtonProps) {
  const [internalIsSelected, setInternalIsSelected] = useState(false);

  // Use external state if provided, otherwise use internal state
  const isSelected = externalIsSelected !== undefined ? externalIsSelected : internalIsSelected;

  const handleClick = () => {
    const newSelectedState = !isSelected;

    if (externalIsSelected === undefined) {
      setInternalIsSelected(newSelectedState);
    }

    onToggle(label, index, newSelectedState);
  };

  return (
    <Button
      {...props}
      variant={isSelected ? "filled" : "outline"}
      color={isSelected ? "blue" : "gray"}
      onClick={handleClick}
      size="xs"
    >
      {label}
    </Button>
  );
}
