import { createMMKV } from "react-native-mmkv";
import { StateStorage } from "zustand/middleware";

export const appMMKV = createMMKV({ id: "avera-app-store" });

export const mmkvStorage: StateStorage = {
  getItem: (name) => appMMKV.getString(name) ?? null,
  setItem: (name, value) => {
    appMMKV.set(name, value);
  },
  removeItem: (name) => {
    appMMKV.remove(name);
  },
};
