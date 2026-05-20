import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { mmkvStorage } from "@/stores/mmkv-storage";

export type RouteCapability =
  | "offline-first"
  | "offline-readonly"
  | "online-required";

type AppStore = {
  isOnline: boolean;
  socketConnected: boolean;
  lastOrdersSyncAt: string | null;
  lastMessagesSyncAt: string | null;
  routeCapabilities: Record<string, RouteCapability>;
  setIsOnline: (isOnline: boolean) => void;
  setSocketConnected: (connected: boolean) => void;
  markOrdersSynced: () => void;
  markMessagesSynced: () => void;
  getRouteCapability: (route: string) => RouteCapability;
};

const routeCapabilities: Record<string, RouteCapability> = {
  "/(tabs)/home": "offline-first",
  "/product/search": "offline-first",
  "/product/categories": "offline-first",
  "/product-details/[id]": "offline-first",
  "/(tabs)/wishlist": "offline-first",
  "/(tabs)/profile": "offline-first",
  "/seller/[id]": "offline-first",
  "/seller-listings/[id]": "offline-first",
  "/messages": "offline-first",
  "/messages/[id]": "offline-first",
  "/(tabs)/orders": "offline-readonly",
  "/order/[id]": "offline-readonly",
  "/wallet": "offline-readonly",
  "/wallet-asset/[symbol]": "offline-readonly",
  "/checkout/review": "online-required",
  "/checkout/pay": "online-required",
  "/(auth)/login": "online-required",
  "/(auth)/register": "online-required",
  "/(auth)/otp-verification": "online-required",
  "/(auth)/password-reset": "online-required",
  "/profile/edit": "online-required",
};

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      isOnline: true,
      socketConnected: false,
      lastOrdersSyncAt: null,
      lastMessagesSyncAt: null,
      routeCapabilities,
      setIsOnline: (isOnline) => set({ isOnline }),
      setSocketConnected: (socketConnected) => set({ socketConnected }),
      markOrdersSynced: () =>
        set({ lastOrdersSyncAt: new Date().toISOString() }),
      markMessagesSynced: () =>
        set({ lastMessagesSyncAt: new Date().toISOString() }),
      getRouteCapability: (route) =>
        get().routeCapabilities[route] ?? "online-required",
    }),
    {
      name: "avera-app-store",
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({
        isOnline: state.isOnline,
        lastMessagesSyncAt: state.lastMessagesSyncAt,
        lastOrdersSyncAt: state.lastOrdersSyncAt,
      }),
    },
  ),
);
