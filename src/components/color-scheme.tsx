import {
  ActionIcon,
  useComputedColorScheme,
  useMantineColorScheme,
} from "@mantine/core";
import { IconMoonStars, IconSun } from "@tabler/icons-react";

export function ColorScheme() {
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme("light", {
    getInitialValueInEffect: true,
  });

  return (
    <ActionIcon
      variant="default"
      size="lg"
      aria-label="Toggle color scheme"
      onClick={() => {
        setColorScheme(computedColorScheme === "light" ? "dark" : "light");
      }}
    >
      <IconMoonStars className="block size-5 dark:hidden" />
      <IconSun className="hidden size-5 dark:block" />
    </ActionIcon>
  );
}
