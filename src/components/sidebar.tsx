import { Burger, Drawer, Paper } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Outlet } from "@tanstack/react-router";
import { Suspense } from "react";
import { Navbar } from "./navbar";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "./resizable";

export function Sidebar() {
  const [opened, { close, toggle }] = useDisclosure(false);
  return (
    <ResizablePanelGroup direction="horizontal">
      <ResizablePanel
        defaultSize={15}
        minSize={10}
        maxSize={50}
        className="hidden bg-gray-100 dark:bg-dark-7 md:block"
      >
        <Suspense>
          <Navbar />
        </Suspense>
      </ResizablePanel>
      <ResizableHandle className="hidden bg-gray-4 dark:bg-dark-9 md:block" />
      <ResizablePanel defaultSize={85} className="flex flex-col">
        <div className="block px-4 pt-4 md:hidden">
          <Burger opened={opened} onClick={toggle} />
          <Drawer opened={opened} onClose={close}>
            <Navbar close={close} />
          </Drawer>
        </div>
        <Paper h="100vh" style={{ overflow: 'auto' }}>
          <Suspense>
            <Outlet />
          </Suspense>
        </Paper>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
