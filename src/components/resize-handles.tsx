import { PanelResizeHandle } from "react-resizable-panels";

export function VerticalResizeHandle() {
  return (
    <PanelResizeHandle className="w-2 bg-gray-300 hover:bg-gray-400 transition-colors">
      <div className="h-full flex items-center justify-center">
        <div className="w-1 h-8 bg-gray-500 rounded"></div>
      </div>
    </PanelResizeHandle>
  );
}

export function HorizontalResizeHandle() {
  return (
    <PanelResizeHandle className="h-2 bg-gray-300 hover:bg-gray-400 transition-colors">
      <div className="w-full flex items-center justify-center">
        <div className="h-1 w-8 bg-gray-500 rounded"></div>
      </div>
    </PanelResizeHandle>
  );
}
