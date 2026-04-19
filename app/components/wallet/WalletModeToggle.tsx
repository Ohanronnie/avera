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
      <View className="flex-row rounded-2xl bg-[#111214] p-1">
        <Pressable
          onPress={() => setWalletMode("crypto")}
          className={`min-w-24 items-center rounded-xl px-4 py-2.5 ${
            walletMode === "crypto" ? "bg-[#1B1D21]" : ""
          }`}
        >
          <Text
            className={`text-sm ${
              walletMode === "crypto"
                ? "font-semibold text-white"
                : "text-gray-500"
            }`}
          >
            Crypto
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setWalletMode("naira")}
          className={`min-w-24 items-center rounded-xl px-4 py-2.5 ${
            walletMode === "naira" ? "bg-[#1B1D21]" : ""
          }`}
        >
          <Text
            className={`text-sm ${
              walletMode === "naira"
                ? "font-semibold text-white"
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
