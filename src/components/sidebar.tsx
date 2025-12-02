import { AppShell, Paper } from "@mantine/core";
import { Outlet } from "@tanstack/react-router";
import { Suspense } from "react";
import { Navbar } from "./navbar.tsx";

interface SidebarProps {
  variant?: "admin" | "student";
}

export function Sidebar({ variant = "admin" }: SidebarProps) {
  return (
    <AppShell
      padding="md"
      navbar={{
        width: 100,
        breakpoint: "sm",
      }}
    >
      <AppShell.Navbar>
        <Suspense>
          <Navbar variant={variant} />
        </Suspense>
      </AppShell.Navbar>

      <AppShell.Main>
        <Paper h="100vh" style={{ overflow: "auto" }}>
          <Suspense>
            <Outlet />
          </Suspense>
        </Paper>
      </AppShell.Main>
    </AppShell>
  );
}
