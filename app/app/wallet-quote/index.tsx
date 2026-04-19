import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useColorScheme } from "nativewind";
import { Image, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Text } from "@/components/themed/theme";
import { getTokenHoldingBySymbol } from "@/components/wallet/data";
import { useToast } from "@/contexts/ToastContext";

const quoteRows = [
  { label: "Payment method", value: "Naira wallet" },
  { label: "Provider", value: "Avera P2P desk" },
  { label: "Quote expires", value: "05:00" },
];

export default function WalletQuoteScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const toast = useToast();
  const params = useLocalSearchParams<{ symbol?: string; amount?: string }>();
  const asset = getTokenHoldingBySymbol(params.symbol);
  const amount = Number(params.amount || 0);
  const rate = 1520;
  const fee = Math.round(amount * 0.012);
  const total = amount + fee;
  const cryptoEstimate = amount > 0 && asset?.value ? amount / asset.value : 0;

  return (
    <SafeAreaView className="flex-1 bg-[#050505]" edges={["top"]}>
      <View className="flex-row items-center justify-between px-5 py-4">
        <Pressable
          onPress={() => router.back()}
          className="h-11 w-11 items-center justify-center rounded-full bg-white/5"
        >
          <Ionicons name="chevron-back" size={22} color={isDark ? "white" : "#111827"} />
        </Pressable>
        <Text className="text-lg font-bold text-white">Buy quote</Text>
        <Pressable
          onPress={() => router.push("/p2p")}
          className="h-11 w-11 items-center justify-center rounded-full bg-white/5"
        >
          <Ionicons name="people-outline" size={20} color="#F9FAFB" />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-10 pt-2"
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center rounded-[32px] border border-white/5 bg-[#111214] p-6">
          {asset ? (
            <Image source={asset.icon} className="h-20 w-20 rounded-full" />
          ) : (
            <View className="h-20 w-20 items-center justify-center rounded-full bg-brand/10">
              <Ionicons name="wallet-outline" size={28} color="#2563EB" />
            </View>
          )}
          <Text className="mt-4 text-sm font-bold uppercase tracking-widest text-gray-500">
            You are buying
          </Text>
          <Text className="mt-2 text-4xl font-black text-white">
            ${amount.toLocaleString()}
          </Text>
          <Text className="mt-2 text-base font-semibold text-brand">
            ≈ {cryptoEstimate.toFixed(6)} {asset?.symbol || params.symbol}
          </Text>
        </View>

        <View className="mt-5 rounded-3xl border border-white/5 bg-[#111214] p-5">
          <Text className="text-sm font-bold uppercase tracking-widest text-gray-500">
            Quote breakdown
          </Text>

          <View className="mt-5 gap-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-gray-400">Buy amount</Text>
              <Text className="text-base font-bold text-white">${amount.toLocaleString()}</Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-gray-400">Service fee</Text>
              <Text className="text-base font-bold text-white">${fee.toLocaleString()}</Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-gray-400">NGN rate</Text>
              <Text className="text-base font-bold text-white">₦{rate.toLocaleString()} / $</Text>
            </View>
          </View>

          <View className="mt-5 border-t border-white/5 pt-5">
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-bold text-white">Total to pay</Text>
              <Text className="text-2xl font-black text-brand">
                ₦{Math.round(total * rate).toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        <View className="mt-5 rounded-3xl border border-white/5 bg-[#111214]">
          {quoteRows.map((row, index) => (
            <View
              key={row.label}
              className={`px-5 py-4 ${index !== quoteRows.length - 1 ? "border-b border-white/5" : ""}`}
            >
              <Text className="text-xs font-bold uppercase tracking-widest text-gray-500">
                {row.label}
              </Text>
              <Text className="mt-2 text-base font-bold text-white">{row.value}</Text>
            </View>
          ))}
        </View>

        <View className="mt-5 rounded-3xl border border-brand/20 bg-brand/10 p-4">
          <View className="flex-row items-start">
            <Ionicons name="shield-checkmark-outline" size={20} color="#2563EB" />
            <Text className="ml-2 flex-1 text-sm leading-5 text-gray-300">
              Your crypto will be released after payment confirmation. This quote is UI-only until backend orders are connected.
            </Text>
          </View>
        </View>

        <View className="mt-8 flex-row gap-3">
          <Pressable
            onPress={() => router.push("/p2p")}
            className="h-14 flex-1 items-center justify-center rounded-2xl bg-white/10"
          >
            <Text className="font-bold text-white">P2P offers</Text>
          </Pressable>
          <Pressable
            onPress={() =>
              toast.show({
                title: "Order coming soon",
                description: "Next step is creating a crypto order and payment instruction.",
                variant: "info",
              })
            }
            className="h-14 flex-1 items-center justify-center rounded-2xl bg-brand"
          >
            <Text variant="none" className="font-bold text-white">Confirm quote</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
