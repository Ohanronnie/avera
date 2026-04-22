import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useColorScheme } from "nativewind";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getP2PListingById } from "@/components/p2p/data";
import { Text } from "@/components/themed/theme";
import { useToast } from "@/contexts/ToastContext";

const formatNaira = (value: number) => `₦${Math.round(value).toLocaleString()}`;

const parseAmount = (value: string) => Number(value.replace(/,/g, "")) || 0;

export default function P2POrderScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const toast = useToast();
  const params = useLocalSearchParams<{ id?: string; side?: "buy" | "sell" }>();
  const listing = getP2PListingById(params.id);
  const side = params.side === "sell" ? "sell" : "buy";
  const [amount, setAmount] = useState(
    listing ? listing.minLimit.toLocaleString() : "",
  );

  const amountValue = parseAmount(amount);
  const cryptoAmount = useMemo(() => {
    if (!listing || amountValue <= 0) return 0;
    return amountValue / listing.rate;
  }, [amountValue, listing]);
  const isBelowLimit = listing ? amountValue < listing.minLimit : false;
  const isAboveLimit = listing ? amountValue > listing.maxLimit : false;
  const canContinue =
    !!listing && amountValue > 0 && !isBelowLimit && !isAboveLimit;

  if (!listing) {
    return (
      <SafeAreaView
        className="flex-1 bg-white dark:bg-[#050505]"
        edges={["top"]}
      >
        <View className="flex-row items-center justify-between px-5 py-4">
          <Pressable
            onPress={() => router.back()}
            className="h-11 w-11 items-center justify-center rounded-full bg-gray-50 dark:bg-white/5"
          >
            <Ionicons
              name="chevron-back"
              size={22}
              color={isDark ? "white" : "#111827"}
            />
          </Pressable>
          <Text className="text-lg font-bold text-gray-950 dark:text-white">
            P2P order
          </Text>
          <View className="h-11 w-11" />
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-gray-50 dark:bg-white/5">
            <Ionicons name="alert-circle-outline" size={30} color="#6B7280" />
          </View>
          <Text className="mt-5 text-xl font-black text-gray-950 dark:text-white">
            Offer not found
          </Text>
          <Text className="mt-2 text-center text-sm leading-6 text-gray-400">
            This P2P offer may no longer be available. Go back and choose
            another seller.
          </Text>
          <Pressable
            onPress={() => router.replace("/p2p")}
            className="mt-8 h-14 w-full items-center justify-center rounded-2xl bg-brand"
          >
            <Text variant="none" className="font-bold text-white">
              Back to offers
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#050505]" edges={["top"]}>
      <View className="flex-row items-center justify-between px-5 py-4">
        <Pressable
          onPress={() => router.back()}
          className="h-11 w-11 items-center justify-center rounded-full bg-gray-50 dark:bg-white/5"
        >
          <Ionicons
            name="chevron-back"
            size={22}
            color={isDark ? "white" : "#111827"}
          />
        </Pressable>
        <Text className="text-lg font-bold text-gray-950 dark:text-white">
          {side === "buy" ? "Buy" : "Sell"} {listing.asset}
        </Text>
        <Pressable
          onPress={() => router.push(`/messages/${listing.id}`)}
          className="h-11 w-11 items-center justify-center rounded-full bg-gray-50 dark:bg-white/5"
        >
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={20}
            color={isDark ? "#F9FAFB" : "#111827"}
          />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-10 pt-2"
        showsVerticalScrollIndicator={false}
      >
        <View className="rounded-[32px] border border-gray-100 bg-gray-50 p-5 dark:border-white/5 dark:bg-[#111214]">
          <Text className="text-sm font-bold uppercase tracking-widest text-gray-500">
            Amount you want to {side === "buy" ? "buy" : "sell"}
          </Text>
          <View className="mt-4 flex-row items-center rounded-3xl border border-gray-200 bg-white px-4 dark:border-white/10 dark:bg-white/5">
            <Text variant="none" className="text-2xl font-black text-brand">
              ₦
            </Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#6B7280"
              className="h-16 flex-1 px-3 py-0 text-3xl font-black leading-9 text-gray-950 dark:text-white"
              textAlignVertical="center"
            />
          </View>

          <View className="mt-4 rounded-2xl bg-brand/10 p-4">
            <Text className="text-xs font-bold uppercase tracking-widest text-gray-500">
              You will {side === "buy" ? "receive" : "send"}
            </Text>
            <Text className="mt-2 text-3xl font-black text-gray-950 dark:text-white">
              {cryptoAmount.toFixed(listing.asset === "USDT" ? 2 : 6)}{" "}
              {listing.asset}
            </Text>
            <Text className="mt-1 text-sm font-semibold text-brand">
              at {formatNaira(listing.rate)} per {listing.asset}
            </Text>
          </View>

          {(isBelowLimit || isAboveLimit) && (
            <View className="mt-4 flex-row items-start rounded-2xl border border-red-500/20 bg-red-500/10 p-3">
              <Ionicons name="warning-outline" size={18} color="#F87171" />
              <Text className="ml-2 flex-1 text-sm leading-5 text-red-600 dark:text-red-300">
                Enter an amount between {formatNaira(listing.minLimit)} and{" "}
                {formatNaira(listing.maxLimit)}.
              </Text>
            </View>
          )}
        </View>

        <Pressable
          onPress={() => router.push(`/seller/${listing.id}`)}
          className="mt-5 rounded-3xl border border-gray-100 bg-gray-50 p-5 dark:border-white/5 dark:bg-[#111214]"
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-1 flex-row items-center pr-4">
              <View className="h-14 w-14 items-center justify-center rounded-2xl bg-brand/10">
                <Text variant="none" className="text-xl font-black text-brand">
                  {listing.seller.slice(0, 1)}
                </Text>
              </View>
              <View className="ml-4 flex-1">
                <View className="flex-row items-center">
                  <Text className="text-base font-black text-gray-950 dark:text-white">
                    {listing.seller}
                  </Text>
                  {listing.verified && (
                    <Ionicons
                      name="shield-checkmark"
                      size={15}
                      color="#2563EB"
                      style={{ marginLeft: 6 }}
                    />
                  )}
                </View>
                <Text className="mt-1 text-xs text-gray-400">
                  {listing.trades} trades • {listing.completion}% completion
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#6B7280" />
          </View>
        </Pressable>

        <View className="mt-5 rounded-3xl border border-gray-100 bg-gray-50 dark:border-white/5 dark:bg-[#111214]">
          {[
            { label: "Available", value: listing.available },
            { label: "Seller limit", value: listing.limit },
            { label: "Payment method", value: listing.method },
            {
              label: "Estimated release",
              value: `${listing.speed} min after payment`,
            },
          ].map((item, index, rows) => (
            <View
              key={item.label}
              className={`px-5 py-4 ${index !== rows.length - 1 ? "border-b border-gray-100 dark:border-white/5" : ""}`}
            >
              <Text className="text-xs font-bold uppercase tracking-widest text-gray-500">
                {item.label}
              </Text>
              <Text className="mt-2 text-base font-bold text-gray-950 dark:text-white">
                {item.value}
              </Text>
            </View>
          ))}
        </View>

        <View className="mt-5 rounded-3xl border border-brand/20 bg-brand/10 p-4">
          <View className="flex-row items-start">
            <Ionicons
              name="shield-checkmark-outline"
              size={20}
              color="#2563EB"
            />
            <Text className="ml-2 flex-1 text-sm leading-5 text-gray-600 dark:text-gray-300">
              Avera will hold the crypto in escrow while payment is completed.
              Only continue after checking the seller rate and limits.
            </Text>
          </View>
        </View>

        <View className="mt-8 flex-row gap-3">
          <Pressable
            onPress={() => router.push(`/messages/${listing.id}`)}
            className="h-14 flex-1 items-center justify-center rounded-2xl bg-gray-100 dark:bg-white/10"
          >
            <Text className="font-bold text-gray-950 dark:text-white">
              Message
            </Text>
          </Pressable>
          <Pressable
            disabled={!canContinue}
            onPress={() =>
              toast.show({
                title: "Order preview ready",
                description:
                  "Next step is backend order creation and payment instructions.",
                variant: "info",
              })
            }
            className={`h-14 flex-1 items-center justify-center rounded-2xl ${canContinue ? "bg-brand" : "bg-gray-100 dark:bg-white/10"}`}
          >
            <Text
              variant="none"
              className={`font-bold ${canContinue ? "text-white" : "text-gray-500"}`}
            >
              Continue
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
