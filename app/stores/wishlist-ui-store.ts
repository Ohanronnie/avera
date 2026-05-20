import { create } from "zustand";

type WishlistUiStore = {
  pendingProductIds: number[];
  setPending: (productId: number, pending: boolean) => void;
};

export const useWishlistUiStore = create<WishlistUiStore>((set) => ({
  pendingProductIds: [],
  setPending: (productId, pending) =>
    set((state) => ({
      pendingProductIds: pending
        ? state.pendingProductIds.includes(productId)
          ? state.pendingProductIds
          : [...state.pendingProductIds, productId]
        : state.pendingProductIds.filter((id) => id !== productId),
    })),
}));
