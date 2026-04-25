import { Pressable, View } from "react-native";

import { Text } from "@/components/themed/theme";

export function WalletModeToggle({
  walletMode,
  setWalletMode,
}: {
  walletMode: "crypto" | "naira";
  setWalletMode: (mode: "crypto" | "naira") => void;
}) {
  return (
    <View className="flex-row items-center justify-start">
      <View className="flex-row rounded-2xl bg-gray-100 p-1 dark:bg-[#111214]">
        <Pressable
          onPress={() => setWalletMode("crypto")}
          className={`min-w-24 items-center rounded-2xl px-4 py-2.5 ${
            walletMode === "crypto" ? "bg-white dark:bg-[#1B1D21]" : ""
          }`}
        >
          <Text
            className={`text-sm ${
              walletMode === "crypto"
                ? "font-semibold text-gray-950 dark:text-white"
                : "text-gray-500"
            }`}
          >
            Crypto
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setWalletMode("naira")}
          className={`min-w-24 items-center rounded-2xl px-4 py-2.5 ${
            walletMode === "naira" ? "bg-white dark:bg-[#1B1D21]" : ""
          }`}
        >
          <Text
            className={`text-sm ${
              walletMode === "naira"
                ? "font-semibold text-gray-950 dark:text-white"
                : "text-gray-500"
            }`}
          >
            Naira
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
