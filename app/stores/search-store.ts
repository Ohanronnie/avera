import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { ProductFilters } from "@/features/products/hooks";
import { mmkvStorage } from "@/stores/mmkv-storage";

const PRICE_RANGE_MIN = 0;
const PRICE_RANGE_MAX = 2000000;

export const defaultSearchFilters: ProductFilters = {
  condition: "all",
  sort: "newest",
  featured: false,
  minPrice: PRICE_RANGE_MIN,
  maxPrice: PRICE_RANGE_MAX,
};

type SearchStore = {
  searchQuery: string;
  activeQuery: string;
  filters: ProductFilters;
  draftFilters: ProductFilters;
  filterSheetOpen: boolean;
  showSuggestions: boolean;
  typing: boolean;
  setSearchQuery: (value: string) => void;
  setActiveQuery: (value: string) => void;
  setFilters: (value: ProductFilters) => void;
  setDraftFilters: (value: ProductFilters) => void;
  setFilterSheetOpen: (value: boolean) => void;
  setShowSuggestions: (value: boolean) => void;
  setTyping: (value: boolean) => void;
  syncFromRoute: (input: {
    query: string;
    hasContext: boolean;
    filters: ProductFilters;
  }) => void;
  resetFilters: () => void;
};

export const useSearchStore = create<SearchStore>()(
  persist(
    (set) => ({
      searchQuery: "",
      activeQuery: "",
      filters: defaultSearchFilters,
      draftFilters: defaultSearchFilters,
      filterSheetOpen: false,
      showSuggestions: true,
      typing: false,
      setSearchQuery: (searchQuery) => set({ searchQuery }),
      setActiveQuery: (activeQuery) => set({ activeQuery }),
      setFilters: (filters) => set({ filters }),
      setDraftFilters: (draftFilters) => set({ draftFilters }),
      setFilterSheetOpen: (filterSheetOpen) => set({ filterSheetOpen }),
      setShowSuggestions: (showSuggestions) => set({ showSuggestions }),
      setTyping: (typing) => set({ typing }),
      syncFromRoute: ({ query, hasContext, filters }) =>
        set({
          searchQuery: query,
          activeQuery: query,
          filters,
          draftFilters: filters,
          showSuggestions: !hasContext,
        }),
      resetFilters: () =>
        set({
          filters: defaultSearchFilters,
          draftFilters: defaultSearchFilters,
          filterSheetOpen: false,
        }),
    }),
    {
      name: "avera-search-store",
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({
        searchQuery: state.searchQuery,
        activeQuery: state.activeQuery,
        filters: state.filters,
        draftFilters: state.draftFilters,
      }),
    },
  ),
);
