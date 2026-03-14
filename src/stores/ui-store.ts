import { create } from "zustand";

export type SidePanel = "layers" | "crs" | null;
export type BottomPanel = "attributes" | null;

interface UiStore {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;

  activePanel: SidePanel;
  setActivePanel: (panel: SidePanel) => void;

  bottomPanel: BottomPanel;
  setBottomPanel: (panel: BottomPanel) => void;
  bottomPanelHeight: number;
  setBottomPanelHeight: (height: number) => void;

  selectedFeatureId: string | number | null;
  setSelectedFeatureId: (id: string | number | null) => void;

  exportModalOpen: boolean;
  setExportModalOpen: (open: boolean) => void;
}

export const useUiStore = create<UiStore>()((set) => ({
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  activePanel: "layers",
  setActivePanel: (panel) => set({ activePanel: panel }),

  bottomPanel: null,
  setBottomPanel: (panel) => set({ bottomPanel: panel }),
  bottomPanelHeight: 250,
  setBottomPanelHeight: (height) => set({ bottomPanelHeight: height }),

  selectedFeatureId: null,
  setSelectedFeatureId: (id) => set({ selectedFeatureId: id }),

  exportModalOpen: false,
  setExportModalOpen: (open) => set({ exportModalOpen: open }),
}));
