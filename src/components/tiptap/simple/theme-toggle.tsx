"use client";

import * as React from "react";
import { useMantineColorScheme } from "@mantine/core";

// --- UI Primitives ---
import { Button } from "../tiptap-ui-primitive/button";

// --- Icons ---
import { MoonStarIcon } from "../tiptap-icons/moon-star-icon";
import { SunIcon } from "../tiptap-icons/sun-icon";

export function ThemeToggle() {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const [isDarkMode, setIsDarkMode] = React.useState<boolean>(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      const prefersDark = mediaQuery.matches;
      setIsDarkMode(prefersDark);
      setColorScheme(prefersDark ? "dark" : "light");
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [setColorScheme]);

  React.useEffect(() => {
    const initialDarkMode =
      colorScheme === "dark" ||
      (colorScheme === "auto" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    setIsDarkMode(initialDarkMode);
  }, [colorScheme]);

  React.useEffect(() => {
    // Sync both theme systems
    document.documentElement.classList.toggle("tt-dark", isDarkMode);
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    setColorScheme(newDarkMode ? "dark" : "light");
  };

  return (
    <Button
      onClick={toggleDarkMode}
      aria-label={`Switch to ${isDarkMode ? "light" : "dark"} mode`}
      data-style="ghost"
    >
      {isDarkMode ? (
        <MoonStarIcon className="tiptap-button-icon" />
      ) : (
        <SunIcon className="tiptap-button-icon" />
      )}
    </Button>
  );
}
