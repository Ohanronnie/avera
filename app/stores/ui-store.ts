import { create } from "zustand";

type UiStore = {
  activeSheetId: string | null;
  openSheet: (sheetId: string) => void;
  closeSheet: () => void;
};

export const useUiStore = create<UiStore>((set) => ({
  activeSheetId: null,
  openSheet: (activeSheetId) => set({ activeSheetId }),
  closeSheet: () => set({ activeSheetId: null }),
}));
