import { useCallback, useEffect, useRef, useState } from "react";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { MapView } from "@/components/map/MapView";
import { AttributeTable } from "@/components/attributes/AttributeTable";
import { LayerPanel } from "@/components/layers/LayerPanel";
import { CrsPanel } from "@/components/crs/CrsPanel";
import { ExportPanel } from "@/components/export/ExportPanel";
import { useUiStore } from "@/stores/ui-store";
import { Layers, MapPin, PanelBottomOpen, PanelLeft } from "lucide-react";

const MIN_BOTTOM_HEIGHT = 100;
const MAX_BOTTOM_HEIGHT = 500;

export function Workspace() {
  const {
    sidebarOpen,
    setSidebarOpen,
    activePanel,
    setActivePanel,
    bottomPanel,
    setBottomPanel,
    bottomPanelHeight,
    setBottomPanelHeight,
  } = useUiStore();

  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef({ startY: 0, startHeight: 0 });

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
      resizeRef.current = { startY: e.clientY, startHeight: bottomPanelHeight };
    },
    [bottomPanelHeight],
  );

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = resizeRef.current.startY - e.clientY;
      const newHeight = Math.min(
        MAX_BOTTOM_HEIGHT,
        Math.max(MIN_BOTTOM_HEIGHT, resizeRef.current.startHeight + delta),
      );
      setBottomPanelHeight(newHeight);
    };

    const handleMouseUp = () => setIsResizing(false);

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, setBottomPanelHeight]);

  return (
    <div className="flex min-h-0 flex-1">
      {/* Left sidebar */}
      {sidebarOpen && (
        <div className="flex w-64 shrink-0 flex-col border-r border-border bg-surface-1">
          {/* Sidebar tabs */}
          <div className="flex shrink-0 border-b border-border">
            <button
              onClick={() => setActivePanel("layers")}
              className={`flex flex-1 items-center justify-center gap-1.5 py-2 text-xs transition-colors ${
                activePanel === "layers"
                  ? "border-b-2 border-accent text-accent"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              Layers
            </button>
            <button
              onClick={() => setActivePanel("crs")}
              className={`flex flex-1 items-center justify-center gap-1.5 py-2 text-xs transition-colors ${
                activePanel === "crs"
                  ? "border-b-2 border-accent text-accent"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              <MapPin className="h-3.5 w-3.5" />
              CRS
            </button>
          </div>

          {/* Panel content */}
          <div className="flex-1 overflow-auto">
            {activePanel === "layers" && <LayerPanel />}
            {activePanel === "crs" && <CrsPanel />}
          </div>
        </div>
      )}

      {/* Center: Map + Bottom panel */}
      <div className="relative flex min-h-0 flex-1 flex-col">
        {/* Toolbar */}
        <div className="flex shrink-0 items-center gap-1 border-b border-border bg-surface-1 px-2 py-1">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`rounded p-1 text-xs transition-colors ${
              sidebarOpen
                ? "text-accent hover:bg-surface-2"
                : "text-text-muted hover:bg-surface-2 hover:text-text-primary"
            }`}
            title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
          >
            <PanelLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setBottomPanel(bottomPanel ? null : "attributes")}
            className={`rounded p-1 text-xs transition-colors ${
              bottomPanel
                ? "text-accent hover:bg-surface-2"
                : "text-text-muted hover:bg-surface-2 hover:text-text-primary"
            }`}
            title={bottomPanel ? "Hide attributes" : "Show attributes"}
          >
            <PanelBottomOpen className="h-4 w-4" />
          </button>
        </div>

        {/* Map */}
        <div className="flex-1">
          <ErrorBoundary fallbackLabel="Map error">
            <MapView />
          </ErrorBoundary>
        </div>

        {/* Bottom panel (attributes) */}
        {bottomPanel === "attributes" && (
          <>
            {/* Resize handle */}
            <div
              onMouseDown={handleMouseDown}
              className={`h-1 shrink-0 cursor-row-resize border-t border-border transition-colors hover:bg-accent/30 ${
                isResizing ? "bg-accent/30" : "bg-surface-2"
              }`}
            />
            <div className="shrink-0 overflow-hidden" style={{ height: bottomPanelHeight }}>
              <AttributeTable />
            </div>
          </>
        )}
      </div>

      {/* Export modal */}
      <ExportPanel />
    </div>
  );
}
