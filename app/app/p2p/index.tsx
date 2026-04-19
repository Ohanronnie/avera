import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColorScheme } from "nativewind";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Text } from "@/components/themed/theme";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import {
  p2pAssets,
  p2pListings,
  p2pPaymentMethods,
} from "@/components/p2p/data";

export default function P2PScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const [selectedAsset, setSelectedAsset] = useState("USDT");
  const [selectedMethod, setSelectedMethod] = useState("All");
  const [minTradeAmount, setMinTradeAmount] = useState("");
  const [maxTradeAmount, setMaxTradeAmount] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [fastOnly, setFastOnly] = useState(false);
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [filterOpen, setFilterOpen] = useState(false);

  const activeFilterCount =
    (selectedAsset !== "USDT" ? 1 : 0) +
    (selectedMethod !== "All" ? 1 : 0) +
    (minTradeAmount ? 1 : 0) +
    (maxTradeAmount ? 1 : 0) +
    (verifiedOnly ? 1 : 0) +
    (fastOnly ? 1 : 0);

  const listings = useMemo(() => {
    const minimumSellerLimit = Number(minTradeAmount.replace(/,/g, "")) || 0;
    const maximumSellerLimit =
      Number(maxTradeAmount.replace(/,/g, "")) || Infinity;

    return p2pListings.filter(
      (listing) =>
        listing.asset === selectedAsset &&
        (selectedMethod === "All" || listing.method === selectedMethod) &&
        listing.minLimit >= minimumSellerLimit &&
        listing.maxLimit <= maximumSellerLimit &&
        (!verifiedOnly || listing.verified) &&
        (!fastOnly || listing.speed <= 3),
    );
  }, [
    fastOnly,
    maxTradeAmount,
    minTradeAmount,
    selectedAsset,
    selectedMethod,
    verifiedOnly,
  ]);

  const resetFilters = () => {
    setSelectedAsset("USDT");
    setSelectedMethod("All");
    setMinTradeAmount("");
    setMaxTradeAmount("");
    setVerifiedOnly(false);
    setFastOnly(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-[#050505]" edges={["top"]}>
      <View className="flex-row items-center justify-between px-5 py-4">
        <Pressable
          onPress={() => router.back()}
          className="h-11 w-11 items-center justify-center rounded-full bg-white/5"
        >
          <Ionicons name="chevron-back" size={22} color={isDark ? "white" : "#111827"} />
        </Pressable>
        <Text className="text-lg font-bold text-white">P2P Market</Text>
        <Pressable
          onPress={() => setFilterOpen(true)}
          className="relative h-11 w-11 items-center justify-center rounded-full bg-white/5"
        >
          <Ionicons name="filter-outline" size={20} color="#F9FAFB" />
          {activeFilterCount > 0 && (
            <View className="absolute -right-1 -top-1 h-5 w-5 items-center justify-center rounded-full bg-brand">
              <Text variant="none" className="text-[10px] font-black text-white">
                {activeFilterCount}
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-10 pt-2"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center px-1">
          <Ionicons name="information-circle-outline" size={16} color="#9CA3AF" />
          <Text className="ml-2 flex-1 text-xs leading-5 text-gray-500">
            Compare rates, limits, speed, and seller completion before opening a trade.
          </Text>
        </View>

        <View className="mt-5 flex-row rounded-2xl bg-[#111214] p-1">
          {(["buy", "sell"] as const).map((item) => (
            <Pressable
              key={item}
              onPress={() => setSide(item)}
              className={`flex-1 items-center rounded-xl py-3 ${side === item ? "bg-[#1B1D21]" : ""}`}
            >
              <Text className={`text-base font-bold ${side === item ? "text-white" : "text-gray-500"}`}>
                {item === "buy" ? "Buy" : "Sell"}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={() => setFilterOpen(true)}
          className="mt-5 flex-row items-center justify-between rounded-2xl border border-white/5 bg-white/5 px-4 py-3"
        >
          <View className="flex-row items-center">
            <Ionicons name="options-outline" size={16} color="#9CA3AF" />
            <Text className="ml-2 text-sm font-bold text-white">
              {selectedAsset} • {selectedMethod}
            </Text>
          </View>
          <Text className="text-xs font-bold text-brand">
            Filters
          </Text>
        </Pressable>

        <View className="mt-5 flex-row items-center justify-between">
          <Text className="text-sm font-bold uppercase tracking-widest text-gray-500">
            Offers
          </Text>
          <Text className="text-xs font-bold text-gray-500">
            {listings.length} found
          </Text>
        </View>

        <View className="mt-3 gap-3">
          {listings.length ? (
            listings.map((listing) => (
              <View key={listing.id} className="rounded-3xl border border-white/5 bg-[#111214] p-4">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 flex-row items-center pr-3">
                    <View className="h-10 w-10 items-center justify-center rounded-2xl bg-brand/10">
                      <Text variant="none" className="text-sm font-black text-brand">
                        {listing.seller.slice(0, 1)}
                      </Text>
                    </View>
                    <View className="ml-3 flex-1">
                      <View className="flex-row items-center">
                        <Text className="text-sm font-bold text-white">{listing.seller}</Text>
                        {listing.verified && (
                          <Ionicons name="shield-checkmark" size={13} color="#2563EB" style={{ marginLeft: 5 }} />
                        )}
                      </View>
                      <Text className="mt-1 text-xs text-gray-400">
                        {listing.trades} trades • {listing.completion}%
                      </Text>
                    </View>
                  </View>
                  <View className="items-end">
                    <Text className="text-xl font-black text-white">
                      ₦{listing.rate.toLocaleString()}
                    </Text>
                    <Text className="mt-1 text-xs font-bold text-brand">
                      {listing.asset}
                    </Text>
                  </View>
                </View>

                <View className="mt-4 flex-row items-center justify-between">
                  <View className="flex-1 pr-3">
                    <Text className="text-xs text-gray-400">
                      {listing.available} available
                    </Text>
                    <Text className="mt-1 text-xs text-gray-500">
                      {listing.limit} • {listing.method} • {listing.speed} min
                    </Text>
                  </View>
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: "/p2p/order",
                        params: {
                          id: listing.id,
                          side,
                        },
                      })
                    }
                    className="h-10 items-center justify-center rounded-xl bg-brand px-5"
                  >
                    <Text variant="none" className="text-sm font-bold text-white">
                      {side === "buy" ? "Buy" : "Sell"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))
          ) : (
            <View className="items-center rounded-3xl border border-white/5 bg-white/5 p-8">
              <Ionicons name="search-outline" size={30} color="#6B7280" />
              <Text className="mt-4 text-lg font-bold text-white">No offers found</Text>
              <Text className="mt-2 text-center text-sm text-gray-400">
                Try another asset, trade limits, or payment method.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <BottomSheet
        visible={filterOpen}
        coverTabs
        title="Filter offers"
        subtitle="Choose the asset, payment method, trade limits, and seller quality."
        onClose={() => setFilterOpen(false)}
      >
        <ScrollView showsVerticalScrollIndicator={false} className="max-h-[560px]">
          <View>
            <Text className="text-base font-bold text-white">Asset</Text>
            <View className="mt-3 flex-row flex-wrap">
              {p2pAssets.map((asset) => (
                <Pressable
                  key={asset}
                  onPress={() => setSelectedAsset(asset)}
                  className={`mb-2 mr-2 rounded-full border px-4 py-2.5 ${
                    selectedAsset === asset
                      ? "border-brand bg-brand"
                      : "border-white/10 bg-white/5"
                  }`}
                >
                  <Text
                    variant="none"
                    className={`text-sm font-bold ${selectedAsset === asset ? "text-white" : "text-gray-300"}`}
                  >
                    {asset}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View className="mt-5">
              <Text className="text-base font-bold text-white">Payment method</Text>
              <View className="mt-3 flex-row flex-wrap">
                {p2pPaymentMethods.map((method) => (
                  <Pressable
                    key={method}
                    onPress={() => setSelectedMethod(method)}
                    className={`mb-2 mr-2 rounded-full border px-4 py-2.5 ${
                      selectedMethod === method
                        ? "border-brand bg-brand"
                        : "border-white/10 bg-white/5"
                    }`}
                  >
                    <Text
                      variant="none"
                      className={`text-sm font-bold ${
                        selectedMethod === method ? "text-white" : "text-gray-300"
                      }`}
                    >
                      {method}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View className="mt-5">
              <Text className="text-base font-bold text-white">
                Trade limits
              </Text>
              <Text className="mt-1 text-xs text-gray-400">
                Filter by the lowest and highest amount a seller accepts per
                trade.
              </Text>
              <View className="mt-3 flex-row gap-3">
                <TextInput
                  value={minTradeAmount}
                  onChangeText={setMinTradeAmount}
                  keyboardType="numeric"
                  placeholder="Seller min"
                  placeholderTextColor="#6B7280"
                  className="h-14 flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 text-base text-white"
                />
                <TextInput
                  value={maxTradeAmount}
                  onChangeText={setMaxTradeAmount}
                  keyboardType="numeric"
                  placeholder="Seller max"
                  placeholderTextColor="#6B7280"
                  className="h-14 flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 text-base text-white"
                />
              </View>
            </View>

            <View className="mt-5 gap-3">
              {[
                {
                  title: "Verified sellers only",
                  description: "Show sellers with stronger trust checks.",
                  value: verifiedOnly,
                  onPress: () => setVerifiedOnly((current) => !current),
                },
                {
                  title: "Fast traders",
                  description: "Show sellers with estimated release under 3 minutes.",
                  value: fastOnly,
                  onPress: () => setFastOnly((current) => !current),
                },
              ].map((item) => (
                <Pressable
                  key={item.title}
                  onPress={item.onPress}
                  className="flex-row items-center justify-between rounded-2xl border border-white/5 bg-white/5 p-4"
                >
                  <View className="flex-1 pr-3">
                    <Text className="font-bold text-white">{item.title}</Text>
                    <Text className="mt-1 text-xs text-gray-400">{item.description}</Text>
                  </View>
                  <View className={`h-7 w-12 rounded-full p-1 ${item.value ? "bg-brand" : "bg-white/10"}`}>
                    <View className={`h-5 w-5 rounded-full bg-white ${item.value ? "ml-5" : "ml-0"}`} />
                  </View>
                </Pressable>
              ))}
            </View>

            <View className="mt-6 flex-row gap-3">
              <Pressable
                onPress={resetFilters}
                className="h-14 flex-1 items-center justify-center rounded-2xl bg-white/10"
              >
                <Text className="font-bold text-white">Reset</Text>
              </Pressable>
              <Pressable
                onPress={() => setFilterOpen(false)}
                className="h-14 flex-1 items-center justify-center rounded-2xl bg-brand"
              >
                <Text variant="none" className="font-bold text-white">Apply</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </BottomSheet>
    </SafeAreaView>
  );
}
