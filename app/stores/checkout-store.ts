import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { mmkvStorage } from "@/stores/mmkv-storage";

export type CheckoutDraft = {
  conversationId?: number;
  quantity?: number;
  productId?: number;
  offerMessageId?: number | null;
  source?: "OFFER" | "BUY_NOW";
  deliveryName: string;
  deliveryPhone: string;
  deliveryAddress: string;
  deliveryCity: string;
  deliveryState: string;
  deliveryCountry: string;
};

const defaultDraft: CheckoutDraft = {
  deliveryName: "",
  deliveryPhone: "",
  deliveryAddress: "",
  deliveryCity: "",
  deliveryState: "",
  deliveryCountry: "Nigeria",
};

type CheckoutStore = {
  draft: CheckoutDraft;
  updateDraft: (value: Partial<CheckoutDraft>) => void;
  hydrateDraft: (value: Partial<CheckoutDraft>) => void;
  clearDraft: () => void;
};

export const useCheckoutStore = create<CheckoutStore>()(
  persist(
    (set) => ({
      draft: defaultDraft,
      updateDraft: (value) =>
        set((state) => ({
          draft: {
            ...state.draft,
            ...value,
          },
        })),
      hydrateDraft: (value) =>
        set((state) => ({
          draft: {
            ...state.draft,
            ...value,
          },
        })),
      clearDraft: () => set({ draft: defaultDraft }),
    }),
    {
      name: "avera-checkout-store",
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({ draft: state.draft }),
    },
  ),
);
