import { AppShell, Paper } from "@mantine/core";
import { Outlet } from "@tanstack/react-router";
import { Suspense } from "react";
import { Navbar } from "./navbar.tsx";

export function Sidebar() {
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
          <Navbar />
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
