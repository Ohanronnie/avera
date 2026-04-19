import { Image, Pressable, View } from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { WalletChart } from "@/components/wallet/WalletChart";
import type {
  TokenHolding,
  WalletActivityItem,
} from "@/components/wallet/types";
import { Text } from "@/components/themed/theme";

export function CryptoWalletContent({
  maskedWalletId,
  portfolioChange,
  formattedBalance,
  cryptoTab,
  setCryptoTab,
  tokenHoldings,
  activityFeed,
}: {
  maskedWalletId: string;
  portfolioChange: number;
  formattedBalance: string;
  cryptoTab: "crypto" | "activity";
  setCryptoTab: (tab: "crypto" | "activity") => void;
  tokenHoldings: TokenHolding[];
  activityFeed: WalletActivityItem[];
}) {
  return (
    <>
      <View className="items-center">
        <View className="mt-10 flex-row items-center">
          <Text variant="none" className="text-xl font-semibold text-[#4ADE80]">
            +12.04%
          </Text>
          <Text className="ml-2 text-lg text-gray-400">
            (${portfolioChange.toFixed(2)})
          </Text>
        </View>

        <Text className="mt-3 text-6xl font-extrabold tracking-tight text-white">
          ${formattedBalance}
        </Text>
      </View>

      <WalletChart />

      <View className="mt-8 flex-row rounded-2xl bg-[#111214] p-1">
        <Pressable
          onPress={() => setCryptoTab("crypto")}
          className={`flex-1 items-center rounded-xl py-3 ${
            cryptoTab === "crypto" ? "bg-[#1B1D21]" : ""
          }`}
        >
          <Text
            className={`text-base ${
              cryptoTab === "crypto"
                ? "font-semibold text-white"
                : "text-gray-500"
            }`}
          >
            Crypto
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setCryptoTab("activity")}
          className={`flex-1 items-center rounded-xl py-3 ${
            cryptoTab === "activity" ? "bg-[#1B1D21]" : ""
          }`}
        >
          <Text
            className={`text-base ${
              cryptoTab === "activity"
                ? "font-semibold text-white"
                : "text-gray-500"
            }`}
          >
            Activity
          </Text>
        </Pressable>
      </View>

      <View className="mt-2">
        {cryptoTab === "crypto" ? (
          tokenHoldings.map((token) => (
            <Pressable
              key={token.symbol}
              onPress={() => router.push(`/wallet-asset/${token.symbol}`)}
              className="flex-row items-center py-4"
            >
              <View className="h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-white/5">
                <Image
                  source={token.icon}
                  className="h-14 w-14"
                  resizeMode="cover"
                />
              </View>

              <View className="ml-4 flex-1">
                <Text className="text-lg font-semibold text-white">
                  {token.name}
                </Text>
                <Text className="mt-1 text-sm text-gray-400">
                  {token.amount}
                </Text>
              </View>

              <View className="items-end">
                <Text className="text-lg font-semibold text-white">
                  $
                  {token.value.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
                <Text
                  variant="none"
                  className={`mt-1 text-sm font-medium ${
                    token.change > 0
                      ? "text-[#4ADE80]"
                      : token.change < 0
                        ? "text-[#F87171]"
                        : "text-gray-400"
                  }`}
                >
                  {token.change >= 0 ? "+" : ""}
                  {token.change.toFixed(2)}%
                </Text>
              </View>
            </Pressable>
          ))
        ) : activityFeed.length ? (
          activityFeed.map((item) => (
            <View key={item.id} className="flex-row items-center py-4">
              <View
                className={`h-12 w-12 items-center justify-center rounded-full ${
                  item.type === "CREDIT" ? "bg-emerald-500/15" : "bg-red-500/15"
                }`}
              >
                <Feather
                  name={
                    item.type === "CREDIT"
                      ? "arrow-down-left"
                      : "arrow-up-right"
                  }
                  size={18}
                  color={item.type === "CREDIT" ? "#4ADE80" : "#F87171"}
                />
              </View>

              <View className="ml-4 flex-1">
                <Text className="text-base font-semibold text-white">
                  {item.description}
                </Text>
                <Text className="mt-1 text-sm text-gray-400">
                  {new Date(item.createdAt).toLocaleDateString()}
                </Text>
              </View>

              <Text
                variant="none"
                className={`text-base font-semibold ${
                  item.type === "CREDIT" ? "text-[#4ADE80]" : "text-white"
                }`}
              >
                {item.type === "CREDIT" ? "+" : "-"}NGN{" "}
                {Number(item.amount).toLocaleString()}
              </Text>
            </View>
          ))
        ) : (
          <View className="items-center py-16">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-white/5">
              <Ionicons name="time-outline" size={28} color="#6B7280" />
            </View>
            <Text className="mt-4 text-lg font-semibold text-white">
              No activity yet
            </Text>
            <Text className="mt-2 text-center text-sm text-gray-400">
              Your recent wallet transactions will appear here.
            </Text>
          </View>
        )}
      </View>
    </>
  );
}
