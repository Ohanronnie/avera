import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { mmkvStorage } from "@/stores/mmkv-storage";

export type ThemeMode = "light" | "dark" | "system";

type PreferencesStore = {
  themeMode: ThemeMode;
  profileEditDraft: Record<string, string>;
  onboardingStep: string | null;
  setThemeMode: (mode: ThemeMode) => void;
  setProfileEditDraft: (value: Record<string, string>) => void;
  setOnboardingStep: (value: string | null) => void;
  clearProfileEditDraft: () => void;
};

export const usePreferencesStore = create<PreferencesStore>()(
  persist(
    (set) => ({
      themeMode: "system",
      profileEditDraft: {},
      onboardingStep: null,
      setThemeMode: (themeMode) => set({ themeMode }),
      setProfileEditDraft: (profileEditDraft) => set({ profileEditDraft }),
      setOnboardingStep: (onboardingStep) => set({ onboardingStep }),
      clearProfileEditDraft: () => set({ profileEditDraft: {} }),
    }),
    {
      name: "avera-preferences-store",
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({
        themeMode: state.themeMode,
        profileEditDraft: state.profileEditDraft,
        onboardingStep: state.onboardingStep,
      }),
    },
  ),
);
